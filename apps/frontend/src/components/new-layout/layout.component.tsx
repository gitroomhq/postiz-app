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
import { NewPost } from '@gitroom/frontend/components/launches/new.post';

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
import { NetworkErrorBridge } from '@gitroom/frontend/components/layout/network-error.bridge';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/frontend/components/layout/new.subscription';
import { Support } from '@gitroom/frontend/components/layout/support';
import { ContinueProvider } from '@gitroom/frontend/components/layout/continue.provider';
import {
  aiAvailable,
  ContextWrapper,
} from '@gitroom/frontend/components/layout/user.context';
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
import { setSentryUser } from '@gitroom/react/sentry/initialize.sentry.client';
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
import { Skeleton } from '@gitroom/react/ui/skeleton';

/** Quiet hairline between header action strip and identity. Spacing comes from the parent gap. */
const HeaderDivider = () => (
  <div className="h-[20px] w-[1px] shrink-0 bg-pqLine" aria-hidden="true" />
);

/**
 * Chrome placeholder while `/user/self` resolves — rail + header + a
 * deliberately shape-agnostic content ghost, so cold load neither flashes an
 * empty pane nor promises a layout.
 *
 * It used to draw a posts panel and a 7×28 month grid. That is wrong on every
 * route that is not the calendar, and wrong on the calendar too now that home
 * opens on the week view — the pane it ghosted was never the pane that
 * arrived. The chrome does not know the route's shape at this point, so it
 * does not claim one.
 */
const LayoutSkeleton = () => (
  <div
    className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden text-pqText"
    role="status"
    aria-busy="true"
    aria-label="Loading"
  >
    <div className="flex h-[56px] shrink-0 items-center gap-[12px] border-b border-pqRailLine bg-pqRail pe-[16px]">
      <div className="flex h-[56px] w-[236px] shrink-0 items-center gap-[9px] border-e border-pqRailLine px-[12px]">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-pqBrand">
          <CrownGlyph className="size-[18px] text-white" />
        </span>
        <Skeleton className="h-[14px] w-[88px]" />
      </div>
      <Skeleton className="h-[14px] w-[96px]" />
      <div className="flex-1" />
      <Skeleton className="h-[26px] w-[72px] rounded-[8px]" />
      <Skeleton className="size-[30px] rounded-[8px]" />
      <Skeleton className="size-[30px] rounded-[8px]" />
      <Skeleton className="size-[30px] rounded-full" />
    </div>

    <div className="flex min-h-0 flex-1">
      <div className="flex w-[236px] shrink-0 flex-col border-e border-pqRailLine bg-pqRail">
        <div className="flex flex-col gap-[8px] border-b border-pqRailLine p-[10px_8px]">
          <Skeleton className="h-[36px] w-full rounded-[10px]" />
        </div>
        <div className="flex flex-col gap-[2px] p-[8px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex h-[34px] items-center gap-[10px] rounded-pqSm px-[8px]"
            >
              <Skeleton className="size-[18px] shrink-0 rounded-[5px]" />
              <Skeleton
                className={clsx(
                  'h-[12px]',
                  i === 0 ? 'w-[72%]' : i % 2 === 0 ? 'w-[58%]' : 'w-[64%]'
                )}
              />
            </div>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-[8px] border-t border-pqRailLine p-[10px_8px]">
          <Skeleton className="h-[40px] w-full rounded-[10px]" />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-[14px] bg-pqInner p-[16px_18px]">
        <div className="flex items-center gap-[8px]">
          <Skeleton className="h-[32px] w-[120px] rounded-[9px]" />
          <Skeleton className="h-[32px] w-[88px] rounded-[9px]" />
          <div className="flex-1" />
          <Skeleton className="h-[32px] w-[110px] rounded-[9px]" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-[10px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[64px] w-full rounded-[12px]" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Shown instead of the skeleton when the app has no backend URL, which only
 * happens on a dev server started outside the project's own scripts. The
 * symptom without this is a shell that stays in bones for ever: every request
 * goes to `undefined/...`, so `/user/self` never resolves, nothing throws, and
 * the console stays clean.
 *
 * Deliberately not translated. It is a developer diagnostic, never reached in
 * production, and adding a key here would move the i18n set the migration
 * guard watches.
 */
const MissingBackendUrlNotice = () => (
  <div className="flex h-dvh flex-col items-center justify-center gap-[10px] p-[24px] text-center">
    <div className="text-[16px] font-[600] text-pqText">
      No backend URL configured
    </div>
    <div className="max-w-[520px] text-[13.5px] leading-[1.5] text-pqMuted">
      NEXT_PUBLIC_BACKEND_URL is empty, so every request would go to
      “undefined/…”. The env file lives at the repository root and is loaded by
      the start scripts. Run <code>pnpm run dev</code> or{' '}
      <code>pnpm run start:prod:frontend</code> rather than calling{' '}
      <code>next</code> directly.
    </div>
  </div>
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
  const { billingEnabled } = useVariables();
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

  // Names the person behind a frontend error, and clears them on logout so the
  // next session is not attributed to the last one. Inert until a DSN is set.
  useEffect(() => {
    setSentryUser(
      user ? { id: user.id, email: user.email, orgId: user.orgId } : null
    );
  }, [user]);

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
  // Hub steps (`connect-creds`, `connect-featured`) need it closed so the
  // Connect overlay is the surface the ring can see.
  //
  // It follows the step rather than only opening: the drawer used to be opened
  // and never closed, so it stayed over `/channels` for the last step and was
  // still there after Finish. `useTourStepKey()` is null when the tour is not
  // running, which is what closes it on the way out.
  const tourStep = useTourStepKey();
  useEffect(() => {
    if (!mobile) return;
    setDrawer(tourStep === 'connect-pq' || tourStep === 'nav-channels');
  }, [mobile, tourStep]);

  // Lifetime / founding only — not ordinary trials (matches rail isFoundingRail).
  // A hosted-service state: with billing off there is no founding to show.
  const showFoundingChip = !mobile && billingEnabled && !!user?.isLifetime;

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

        {/* End cluster: Create Post → tools → identity. One hairline only.
            Create Post is chrome, not a page action: it is the app's primary
            verb and has to be reachable from every route, including before any
            channel exists. The slot after it stays for page-level actions. */}
        <div className="flex shrink-0 items-center gap-[10px]">
          <NewPost />
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
  user,
}: {
  children: ReactNode;
  overlay?: ReactNode;
  mutate: () => void;
  // Same shape /user/self returns — ContextWrapper narrows it for the tree.
  user: any;
}) => {
  const { backendUrl, billingEnabled, isGeneral, aiEnabled } = useVariables();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Two ways /copilot/chat refuses: no OPENAI_API_KEY is a plain 503, and a
  // tier without AI is now a 402. CopilotKit reads either as a Network
  // CombinedError and Next overlays it on every page, so skip the provider
  // unless this account can actually use the route. Every consumer of the
  // provider reads the same answer through useAiAvailable, which is what keeps
  // a Copilot hook from mounting with nothing above it.
  const aiOk = aiAvailable(user, aiEnabled, billingEnabled);

  const chrome = (
    <MantineWrapper>
      <ToolTip />
      <Toaster />
      <NetworkErrorBridge />
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
            {user?.admin ? <Impersonate /> : <div />}
          </div>
          {user?.tier === 'FREE' &&
          isGeneral &&
          billingEnabled &&
          !pathname.startsWith('/billing/lifetime') ? (
            ['ADMIN', 'SUPERADMIN'].includes(user?.role!) ? (
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
      </CheckPayment>
    </MantineWrapper>
  );

  return (
    <ContextWrapper user={user}>
      <ViewportProvider>
        {aiOk ? (
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
  const { backendUrl } = useVariables();
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

  // A dev server started without the env file has no backend URL, so every
  // request goes to `undefined/...`, `/user/self` never answers, and the line
  // below shows the skeleton for ever with nothing in the console. That cost
  // hours once. Development only — production behaviour is untouched.
  if (!backendUrl && process.env.NODE_ENV !== 'production') {
    return <MissingBackendUrlNotice />;
  }

  // While /user/self resolves, show the chrome skeleton instead of a blank
  // screen (this used to `return null`, flashing empty on every cold load).
  if (!user) return <LayoutSkeleton />;

  return (
    <LayoutBody overlay={overlay} mutate={mutate} user={user}>
      {children}
    </LayoutBody>
  );
};
