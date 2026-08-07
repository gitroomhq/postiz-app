'use client';

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import useCookie from 'react-use-cookie';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { HeaderActionSlot } from '@gitroom/frontend/components/new-layout/header-slot';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@gitroom/frontend/components/layout/check.payment';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { NotificationsLiveBridge } from '@gitroom/frontend/components/notifications/live.bridge';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/frontend/components/layout/new.subscription';
import { Support } from '@gitroom/frontend/components/layout/support';
import { ContinueProvider } from '@gitroom/frontend/components/layout/continue.provider';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Impersonate } from '@gitroom/frontend/components/layout/impersonate';
import { AnnouncementBanner } from '@gitroom/frontend/components/layout/announcement.banner';
import { Title } from '@gitroom/frontend/components/layout/title';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';
import { BillingAdminRequiredComponent } from '@gitroom/frontend/components/billing/billing.admin.required.component';
import { TrialTracker } from '@gitroom/frontend/components/layout/gtm.component';
import { CrownGlyph } from '@gitroom/frontend/components/ui/logo.component';
import { UserMenu } from '@gitroom/frontend/components/new-layout/user.menu';
import { HelpMenu } from '@gitroom/frontend/components/new-layout/help.menu';
import { Rail } from '@gitroom/frontend/components/new-layout/rail';
import {
  useViewport,
  ViewportProvider,
} from '@gitroom/frontend/components/layout/use.viewport';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Tour, useTourStepKey } from '@gitroom/frontend/components/onboarding/tour';
import {
  DevBillingStageProvider,
  useDevBillingStage,
} from '@gitroom/frontend/components/billing/dev-billing-stage.provider';
import { DevBillingStageSwitcher } from '@gitroom/frontend/components/billing/dev-billing-stage.switcher';
import { FinishTrial } from '@gitroom/frontend/components/billing/finish.trial';
import { isDevBillingStageEnabled } from '@gitroom/frontend/components/billing/dev-billing-stage';

/** Quiet hairline between header action strip and identity. Spacing comes from the parent gap. */
const HeaderDivider = () => (
  <div className="h-[20px] w-[1px] shrink-0 bg-pqLine" aria-hidden="true" />
);

/**
 * A uniform hit area for the header's icon controls, which arrive at three
 * different SVG sizes and with no padding of their own. The square is fixed, so
 * anything wider than an icon (the streak counter, the Help pill) stays outside
 * this wrapper. No `overflow-hidden`: notifications hang an absolutely
 * positioned panel off itself.
 */
const HeaderIcon = ({ children }: { children: ReactNode }) => (
  <div className="grid size-[30px] shrink-0 place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText empty:hidden">
    {children}
  </div>
);

/** Chrome placeholder shown while the user request is in flight. */
const LayoutSkeleton = () => (
  <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden text-newTextColor">
    <div className="flex h-[56px] shrink-0 items-center gap-[12px] border-b border-pqRailLine bg-pqRail pe-[16px]">
      <div className="flex h-[56px] w-[236px] shrink-0 items-center gap-[9px] border-e border-pqRailLine px-[12px]">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-pqBrand">
          <CrownGlyph className="size-[18px] text-white" />
        </span>
        <div className="h-[16px] w-[92px] animate-pulse rounded-[6px] bg-pqHover" />
      </div>
      <div className="h-[16px] w-[120px] animate-pulse rounded-[6px] bg-pqHover" />
      <div className="flex-1" />
      <div className="size-[30px] animate-pulse rounded-full bg-pqHover" />
    </div>
    <div className="flex min-h-0 flex-1">
      <div className="flex w-[236px] shrink-0 flex-col gap-[2px] border-e border-pqRailLine bg-pqRail p-[8px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[34px] animate-pulse rounded-pqSm bg-pqHover"
          />
        ))}
      </div>
      <div className="flex-1 bg-pqInner" />
    </div>
  </div>
);

/**
 * Header, rail and page body.
 *
 * Split out of `LayoutComponent` because it reads `useViewport()`, and the
 * provider that supplies it is mounted by `LayoutComponent` itself. It also
 * owns the two pieces of chrome state that the header and the rail both need:
 * whether the rail is collapsed, and whether the phone drawer is open.
 */
const AppChrome = ({ children }: { children: ReactNode }) => {
  const t = useT();
  const user = useUser();
  const { mobile, tablet } = useViewport();
  // Same cookie idiom as the calendar's own collapsible column.
  const [railCookie, setRailCookie] = useCookie('railCollapsed', '0');
  const collapsed = railCookie === '1';
  const [drawer, setDrawer] = useState(false);
  /**
   * True while the rail is collapsed because the window is narrow rather than
   * because anybody asked. Without it, dragging a window below 1180 and back
   * would silently discard the user's own choice — the design tracks the same
   * thing (`_autoRail`).
   */
  const autoCollapsed = useRef(false);
  // The drawer measures this row to find its own top edge.
  const rowRef = useRef<HTMLDivElement>(null);

  // Growing past the phone breakpoint with the drawer open would otherwise
  // leave it stranded over the desktop layout.
  useEffect(() => {
    if (!mobile) setDrawer(false);
  }, [mobile]);

  // Below 1180 there is not room for a 236px rail beside a page; collapse it,
  // and put it back only if this is the one that collapsed it.
  useEffect(() => {
    if (mobile) return;
    if (tablet && !collapsed) {
      autoCollapsed.current = true;
      setRailCookie('1', { days: 365 });
      return;
    }
    if (!tablet && autoCollapsed.current) {
      autoCollapsed.current = false;
      setRailCookie('0', { days: 365 });
    }
  }, [mobile, tablet, collapsed, setRailCookie]);

  const closeDrawer = useCallback(() => setDrawer(false), []);

  // Tour steps that spotlight rail targets need the mobile drawer open —
  // otherwise `connect-pq` / `nav-channels` measure nothing off-screen.
  const tourStep = useTourStepKey();
  useEffect(() => {
    if (!mobile) return;
    if (tourStep === 'connect-pq' || tourStep === 'nav-channels') {
      setDrawer(true);
    }
  }, [mobile, tourStep]);

  // Lifetime / founding only — not ordinary trials (matches rail isFoundingRail).
  const showFoundingChip = !mobile && !!user?.isLifetime;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="blurMe relative z-[40] flex h-[56px] shrink-0 items-center gap-[12px] border-b border-pqRailLine bg-pqRail pe-[16px]">
        {mobile ? (
          <button
            type="button"
            onClick={() => setDrawer((d) => !d)}
            aria-label={t('menu', 'Menu')}
            aria-expanded={drawer}
            className="ms-[8px] grid size-[40px] shrink-0 place-items-center rounded-[10px] text-pqText transition-colors hover:bg-pqHover"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          // Sized to the rail so the cell's own edge continues the rail's
          // hairline rather than cutting across it.
          <div
            className={clsx(
              'flex h-[56px] shrink-0 items-center border-e border-pqRailLine px-[12px] transition-[width] duration-200 ease-out',
              collapsed ? 'w-[60px]' : 'w-[236px]'
            )}
          >
            <Logo variant="header" collapsed={collapsed} />
          </div>
        )}

        {/* Title owns the <h1> and the line under it; this only positions them. */}
        <div
          className={clsx(
            'flex min-w-0 flex-1 flex-col justify-center leading-[1.2]',
            mobile ? 'ps-[4px]' : 'ps-[20px]'
          )}
        >
          <Title />
        </div>

        {showFoundingChip && (
          <span
            data-hdr-thanks="1"
            className="me-[2px] inline-flex h-[28px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full bg-pqLtChipBg px-[11px] text-[12px] font-[600] text-pqLtAmber shadow-[inset_0_0_0_1px_var(--ltOutline)]"
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="currentColor"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13L12 20.5Z" />
            </svg>
            {t('founding_member', 'Founding member')}
          </span>
        )}

        {/* End cluster: Create Post → tools → identity. One hairline only. */}
        <div className="flex shrink-0 items-center gap-[10px]">
          <HeaderActionSlot />
          <div className="flex items-center gap-[4px] text-pqMuted">
            <StreakComponent />
            <HelpMenu />
            <HeaderIcon>
              <NotificationComponent />
            </HeaderIcon>
          </div>
          <HeaderDivider />
          <UserMenu />
        </div>
      </header>

      <div
        ref={rowRef}
        className="relative flex min-h-0 flex-1 items-stretch"
      >
        <Rail
          collapsed={collapsed}
          // `react-use-cookie` defaults to a 7-day expiry, so without this the
          // rail quietly springs back open a week later — the same trap
          // `mode.component.tsx` records against the theme cookie.
          onToggleCollapse={() =>
            setRailCookie(collapsed ? '0' : '1', { days: 365 })
          }
          mobile={mobile}
          drawerOpen={drawer}
          onCloseDrawer={closeDrawer}
          hostRef={rowRef}
        />
        {/* z-0 traps page stickies / toolbars in a stacking context below the
            rail slot (z-45), so collapsed hover-expand covers them instead of
            letting "Next 3 days" and calendar headers paint through. */}
        <div className="blurMe relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* The 1px gaps over this background are what draw the hairlines
              between a page's own columns. */}
          <div className="flex min-h-0 flex-1 gap-[1px] bg-pqLine">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const LayoutBody = ({
  children,
  overlay,
  mutate,
}: {
  children: ReactNode;
  overlay?: ReactNode;
  mutate: () => void;
}) => {
  const { backendUrl, billingEnabled, isGeneral, aiEnabled } = useVariables();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { overriddenUser, finishTrialPreviewOpen, closeFinishTrialPreview } =
    useDevBillingStage();

  // Without OPENAI_API_KEY the backend returns plain 503 JSON from /copilot/chat;
  // CopilotKit treats that as a Network CombinedError and Next overlays it on
  // every page. Skip the provider when AI is not configured.
  const chrome = (
    <MantineWrapper>
      <ToolTip />
      <Toaster />
      <NotificationsLiveBridge />
      <TrialTracker />
      <CheckPayment
        check={searchParams.get('check') || ''}
        mutate={mutate}
      >
        <ShowMediaBoxModal />
        <ShowLinkedinCompany />
        <MediaSettingsLayout />
        <ShowPostSelector />
        <PreConditionComponent />
        <NewSubscription />
        <ContinueProvider />
        {/* h-dvh + overflow-hidden: chrome (and the rail footer) stay
            viewport-tall. min-h-screen alone lets flex-1 grow with page
            content and parks Settings / Upgrade below the fold. */}
        <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden text-newTextColor">
          <div className="shrink-0">
            {overriddenUser?.admin ? <Impersonate /> : <div />}
          </div>
          {isDevBillingStageEnabled() && <DevBillingStageSwitcher />}
          {overriddenUser.tier === 'FREE' &&
          isGeneral &&
          billingEnabled &&
          !pathname.startsWith('/billing/lifetime') ? (
            ['ADMIN', 'SUPERADMIN'].includes(overriddenUser?.role!) ? (
              <FirstBillingComponent />
            ) : (
              <BillingAdminRequiredComponent />
            )
          ) : (
            <>
              <div className="shrink-0">
                <AnnouncementBanner />
              </div>
              <Support />
              <AppChrome>{children}</AppChrome>
              {overlay}
              <Tour />
            </>
          )}
        </div>
        {finishTrialPreviewOpen && (
          <FinishTrial close={closeFinishTrialPreview} dryRun />
        )}
      </CheckPayment>
    </MantineWrapper>
  );

  return (
    <ContextWrapper user={overriddenUser}>
      <ViewportProvider>
        {aiEnabled ? (
          <CopilotKit
            credentials="include"
            runtimeUrl={backendUrl + '/copilot/chat'}
            showDevConsole={false}
          >
            {chrome}
          </CopilotKit>
        ) : (
          chrome
        )}
      </ViewportProvider>
    </ContextWrapper>
  );
};

export const LayoutComponent = ({
  children,
  overlay,
}: {
  children: ReactNode;
  overlay?: ReactNode;
}) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  // While /user/self resolves, show the chrome skeleton instead of a blank
  // screen (this used to `return null`, flashing empty on every cold load).
  if (!user) return <LayoutSkeleton />;

  return (
    <DevBillingStageProvider baseUser={user}>
      <LayoutBody overlay={overlay} mutate={mutate}>
        {children}
      </LayoutBody>
    </DevBillingStageProvider>
  );
};
