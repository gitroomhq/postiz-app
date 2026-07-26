'use client';

import React, { ReactNode, useCallback } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
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

/** Chrome placeholder shown while the user request is in flight. */
const LayoutSkeleton = () => (
  <div className="flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]">
    <div className="flex-1 flex gap-[8px]">
      <div className="brand-rail w-[80px] shrink-0 rounded-[12px] flex flex-col items-center gap-[24px] py-[16px]">
        <CrownGlyph className="size-[30px] text-white" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="size-[44px] rounded-[12px] bg-white/15 animate-pulse"
          />
        ))}
      </div>
      <div className="flex-1 bg-newBgLineColor rounded-[12px] overflow-hidden flex flex-col gap-[1px]">
        <div className="flex bg-newBgColorInner h-[80px] px-[20px] items-center gap-[16px]">
          <div className="h-[28px] w-[140px] rounded-[8px] bg-newBgLineColor animate-pulse" />
          <div className="flex-1" />
          <div className="size-[30px] rounded-full bg-newBgLineColor animate-pulse" />
        </div>
        <div className="flex-1 bg-newBgColorInner" />
      </div>
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
            <div className="flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]">
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
                  <div className="flex-1 flex gap-[8px]">
                    <Support />
                    <div className="brand-rail flex flex-col w-[80px] shrink-0 rounded-[12px]">
                      <div className="flex flex-col gap-[24px] flex-1 py-[16px] px-[8px] overflow-y-auto">
                        <div className="flex flex-col gap-[14px]">
                          <Logo variant="rail" />
                          <div className="h-[1px] bg-white/25" />
                        </div>
                        <TopMenu />
                      </div>
                    </div>
                    <div className="flex-1 bg-newBgLineColor rounded-[12px] overflow-hidden flex flex-col gap-[1px] blurMe">
                      <div className="flex bg-newBgColorInner h-[80px] px-[20px] items-center gap-[16px]">
                        <div className="text-[24px] font-[600] flex flex-1 min-w-0">
                          <Title />
                        </div>
                        <div className="flex items-center gap-[16px] text-textItemBlur">
                          <StreakComponent />
                          <OrganizationSelector />
                          <ChromeExtensionComponent />
                          <div className="hover:text-newTextColor transition-colors">
                            <AttachToFeedbackIcon />
                          </div>
                          <NotificationComponent />
                          <div className="hover:text-newTextColor transition-colors">
                            <ModeComponent />
                          </div>
                          <HeaderDivider />
                          <UserMenu />
                        </div>
                      </div>
                      <div className="flex flex-1 gap-[1px]">{children}</div>
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
