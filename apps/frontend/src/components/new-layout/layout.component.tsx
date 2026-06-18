'use client';
import { AdaptiveNav, MobileBottomNav } from '@gitroom/frontend/components/layout/adaptive-nav';

import React, { ReactNode, useCallback } from 'react';
import clsx from 'clsx';
import ModeComponent from '@gitroom/frontend/components/layout/mode.component';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';

import { CopilotKit } from '@copilotkit/react-core';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { CheckPayment } from '@gitroom/frontend/components/layout/check.payment';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/frontend/components/layout/new.subscription';
import { Support } from '@gitroom/frontend/components/layout/support';
import { ContinueProvider } from '@gitroom/frontend/components/layout/continue.provider';
import { Impersonate } from '@gitroom/frontend/components/layout/impersonate';
import { AnnouncementBanner } from '@gitroom/frontend/components/layout/announcement.banner';
import { Title } from '@gitroom/frontend/components/layout/title';
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { ChromeExtensionComponent } from '@gitroom/frontend/components/layout/chrome.extension.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';
import { TrialTracker } from '@gitroom/frontend/components/layout/gtm.component';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['600', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const { billingEnabled, isGeneral } = useVariables();
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

  if (!user) return null;

  return (
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={process.env.NEXT_PUBLIC_BACKEND_URL + '/copilot/chat'}
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

            <div
              className={clsx(
                'flex min-h-screen w-full flex-col gap-[12px] overflow-x-hidden px-[12px] py-[12px] text-[#37322F]',
                jakartaSans.className
              )}
            >
              {user?.admin ? <Impersonate /> : null}
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex flex-1 flex-col gap-[12px] xl:flex-row">
                    <Support />

                    <aside className="w-full xl:w-[92px] xl:flex-none">
                      <div
                        id="left-menu"
                        className={clsx(
                          'flex w-full gap-[8px] overflow-x-auto rounded-[20px] border border-gray-200 bg-white px-[10px] py-[10px] xl:fixed xl:left-[12px] xl:top-[12px] xl:h-[calc(100vh-24px)] xl:w-[72px] xl:flex-col xl:overflow-visible xl:px-[8px]',
                          user?.admin && 'xl:pt-[60px]'
                        )}
                      >
                        <div className="flex shrink-0 items-center pr-[8px] xl:justify-center xl:pr-0">
                          <Logo />
                        </div>
                        <div className="flex min-w-0 flex-1 xl:flex-none">
                          <TopMenu />
                        </div>
                      </div>
                    </aside>

                    <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_24px_72px_rgba(15,39,66,0.08)]">
                      <div className="flex flex-col gap-[12px] border-b border-gray-200 px-[16px] py-[16px] sm:flex-row sm:items-center sm:justify-between sm:px-[20px]">
                        <div className="text-[22px] font-[700] tracking-[-0.03em] sm:text-[24px]">
                          <Title />
                        </div>
                        <div className="flex flex-wrap items-center gap-[14px] text-[#637282]">
                          <StreakComponent />
                          <div className="hidden h-[20px] w-[1px] bg-blockSeparator sm:block" />
                          <OrganizationSelector />
                          <div className="hover:text-[#37322F]">
                            <ModeComponent />
                          </div>
                          <div className="hidden h-[20px] w-[1px] bg-blockSeparator sm:block" />
                          <LanguageComponent />
                          <ChromeExtensionComponent />
                          <div className="hidden h-[20px] w-[1px] bg-blockSeparator md:block" />
                          <AttachToFeedbackIcon />
                          <NotificationComponent />
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                        {children}
                      </div>
                    </main>
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
