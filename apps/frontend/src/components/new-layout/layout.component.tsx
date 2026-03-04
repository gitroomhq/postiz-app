'use client';

import React, { ReactNode, useCallback } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { Plus_Jakarta_Sans } from 'next/font/google';
const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import clsx from 'clsx';
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
import { usePlan } from '@gitroom/frontend/components/layout/use-plan.hook';

const planColorByName: Record<string, string> = {
  Free: '#6b7280',
  Basic: '#2196f3',
  Starter: '#2196f3',
  Premium: '#e91e63',
  Growth: '#10B981',
  Grow: '#4caf50',
  'Video Creator': '#8B5CF6',
  'Agency Pro': '#10B981',
};

const PlanBadge = () => {
  const { data: plan } = usePlan();
  const planName = plan?.planName || 'Free';
  const color = planColorByName[planName] || '#6b7280';

  return (
    <a
      href={`${process.env.NEXT_PUBLIC_STUDIO_TOOLS_URL || ''}/pricing`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-[5px] rounded-md px-[8px] py-[3px] text-[12px] font-medium text-white transition-opacity hover:opacity-80"
      style={{ backgroundColor: color }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
      </svg>
      {planName} Plan
    </a>
  );
};

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['600', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

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

  if (!user) return null;

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
                'flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]',
                jakartaSans.className
              )}
            >
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <div className="flex-1 flex gap-[8px]">
                  <Support />
                  <div className="flex flex-col bg-newBgColorInner w-[80px] rounded-[12px]">
                    <div
                      className={clsx(
                        'fixed h-full w-[64px] start-[17px] flex flex-1 top-0',
                        user?.admin && 'pt-[60px] max-h-[1000px]:w-[500px]'
                      )}
                    >
                      <div className="flex flex-col h-full gap-[32px] flex-1 py-[12px]">
                        <Logo />
                        <TopMenu />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-newBgLineColor rounded-[12px] overflow-hidden flex flex-col gap-[1px] blurMe">
                    <div className="flex bg-newBgColorInner h-[80px] px-[20px] items-center">
                      <div className="text-[24px] font-[600] flex flex-1">
                        <Title />
                      </div>
                      <div className="flex gap-[20px] text-textItemBlur">
                        {process.env.NEXT_PUBLIC_STUDIO_TOOLS_URL && isGeneral && (
                          <>
                            <a
                              href={process.env.NEXT_PUBLIC_STUDIO_TOOLS_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 hover:text-newTextColor transition-colors"
                            >
                              <img
                                src="/icons/letstok-favicon.svg"
                                alt="Letstok AI"
                                width={18}
                                height={18}
                                className="rounded-full"
                              />
                              <span className="text-sm font-medium">Letstok AI</span>
                            </a>
                            <a
                              href={`${process.env.NEXT_PUBLIC_STUDIO_TOOLS_URL}/pricing`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 hover:text-newTextColor transition-colors"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                                <path d="M7 7h.01" />
                              </svg>
                              <span className="text-sm font-medium">Pricing</span>
                            </a>
                            <div className="w-[1px] h-[20px] bg-blockSeparator" />
                          </>
                        )}
                        <PlanBadge />
                        <div className="w-[1px] h-[20px] bg-blockSeparator" />
                        <StreakComponent />
                        <div className="w-[1px] h-[20px] bg-blockSeparator" />
                        <OrganizationSelector />
                        <div className="hover:text-newTextColor">
                          <ModeComponent />
                        </div>
                        <div className="w-[1px] h-[20px] bg-blockSeparator" />
                        <LanguageComponent />
                        <ChromeExtensionComponent />
                        <div className="w-[1px] h-[20px] bg-blockSeparator" />
                        <AttachToFeedbackIcon />
                        <NotificationComponent />
                      </div>
                    </div>
                    <div className="flex flex-1 gap-[1px]">{children}</div>
                  </div>
                </div>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
