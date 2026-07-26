'use client';

import React, { ReactNode, useCallback } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { HeaderActionSlot } from '@gitroom/frontend/components/new-layout/header-slot';
const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import dynamic from 'next/dynamic';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@gitroom/frontend/components/layout/check.payment';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { Toaster } from '@gitroom/react/toaster/toaster';
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
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import { ChromeExtensionComponent } from '@gitroom/frontend/components/layout/chrome.extension.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';
import { BillingAdminRequiredComponent } from '@gitroom/frontend/components/billing/billing.admin.required.component';
import { TrialTracker } from '@gitroom/frontend/components/layout/gtm.component';
import { CrownGlyph } from '@gitroom/frontend/components/ui/logo.component';
import { UserMenu } from '@gitroom/frontend/components/new-layout/user.menu';

/** A fixed vertical divider for the header. */
const HeaderDivider = () => (
  <div className="w-[1px] h-[20px] bg-blockSeparator shrink-0" />
);

/**
 * A uniform hit area for the header's icon controls, which arrive at three
 * different SVG sizes and with no padding of their own. The square is fixed, so
 * anything wider than an icon (the streak counter) stays outside this wrapper.
 * No `overflow-hidden`: notifications and the org selector hang absolutely
 * positioned panels off themselves.
 */
const HeaderIcon = ({ children }: { children: ReactNode }) => (
  <div className="grid size-[34px] shrink-0 place-items-center rounded-[8px] text-textItemBlur transition-colors hover:bg-boxHover hover:text-newTextColor empty:hidden">
    {children}
  </div>
);

/** Chrome placeholder shown while the user request is in flight. */
const LayoutSkeleton = () => (
  <div className="flex min-h-screen w-full text-newTextColor">
    <div className="brand-rail w-[80px] shrink-0 flex flex-col items-center gap-[24px] py-[16px]">
      <CrownGlyph className="size-[30px] text-white" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="size-[44px] rounded-[12px] bg-white/15 animate-pulse"
        />
      ))}
    </div>
    <div className="flex flex-1 min-w-0 flex-col">
      <div className="flex h-[64px] shrink-0 items-center gap-[16px] border-b border-newBorder bg-newBgColorInner px-[24px]">
        <div className="h-[24px] w-[140px] rounded-[8px] bg-newBgLineColor animate-pulse" />
        <div className="flex-1" />
        <div className="size-[30px] rounded-full bg-newBgLineColor animate-pulse" />
      </div>
      <div className="flex-1 bg-newBgColorInner" />
    </div>
  </div>
);

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  const searchParams = useSearchParams();
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
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/chat'}
        showDevConsole={false}
      >
        <MantineWrapper>
          <ToolTip />
          <Toaster />
          <TrialTracker />
          <CheckPayment check={searchParams.get('check') || ''} mutate={mutate}>
            <ShowMediaBoxModal />
            <ShowLinkedinCompany />
            <MediaSettingsLayout />
            <ShowPostSelector />
            <PreConditionComponent />
            <NewSubscription />
            <ContinueProvider />
            <div className="flex flex-col min-h-screen w-full text-newTextColor">
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                ['ADMIN', 'SUPERADMIN'].includes(user?.role!) ? (
                  <FirstBillingComponent />
                ) : (
                  <BillingAdminRequiredComponent />
                )
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex flex-1 min-h-0">
                    <Support />
                    <div className="brand-rail flex flex-col w-[80px] shrink-0">
                      <div className="flex flex-col gap-[24px] flex-1 py-[16px] px-[8px] overflow-y-auto">
                        <div className="flex flex-col gap-[14px]">
                          <Logo variant="rail" />
                          <div className="h-[1px] bg-white/25" />
                        </div>
                        <TopMenu />
                      </div>
                    </div>
                    <div className="flex flex-1 min-w-0 flex-col overflow-hidden blurMe">
                      <header className="flex h-[64px] shrink-0 items-center gap-[8px] border-b border-newBorder bg-newBgColorInner px-[24px]">
                        {/* Title owns the <h1>; this only sizes and truncates it. */}
                        <div className="flex-1 min-w-0 text-[20px] font-[600] -tracking-[0.2px] [&>h1]:truncate">
                          <Title />
                        </div>
                        {/* Filled by the page, if it has a primary action. */}
                        <HeaderActionSlot />
                        <HeaderDivider />
                        <div className="flex items-center gap-[4px] text-textItemBlur">
                          <StreakComponent />
                          <HeaderIcon>
                            <OrganizationSelector />
                          </HeaderIcon>
                          <HeaderIcon>
                            <ChromeExtensionComponent />
                          </HeaderIcon>
                          <HeaderIcon>
                            <AttachToFeedbackIcon />
                          </HeaderIcon>
                          <HeaderIcon>
                            <NotificationComponent />
                          </HeaderIcon>
                          <HeaderIcon>
                            <ModeComponent />
                          </HeaderIcon>
                        </div>
                        <HeaderDivider />
                        <UserMenu />
                      </header>
                      {/* The 1px gaps over this background are what draw the
                          hairlines between a page's own columns. */}
                      <div className="flex flex-1 min-h-0 gap-[1px] bg-newBgLineColor">
                        {children}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
