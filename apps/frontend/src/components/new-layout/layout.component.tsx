'use client';

import React, { ReactNode, useCallback, useState } from 'react';
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
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['600', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                'flex flex-col min-h-screen w-full text-newTextColor p-[16px] md:p-[12px] overflow-x-hidden',
                jakartaSans.className
              )}
            >
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <div className="flex-1 flex gap-[8px] flex-col md:flex-row">
                  <Support />
                  <div className="hidden md:flex flex-col bg-newBgColorInner w-[80px] rounded-[12px]">
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
                    <div className="flex bg-newBgColorInner h-[60px] md:h-[80px] px-[12px] md:px-[20px] items-center gap-[12px] md:gap-[0]">
                      <div className="md:hidden flex items-center gap-[12px] flex-1">
                        <div
                          onClick={() => setIsMenuOpen(!isMenuOpen)}
                          className="cursor-pointer text-textItemBlur hover:text-newTextColor"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {isMenuOpen ? (
                              <>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </>
                            ) : (
                              <>
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                              </>
                            )}
                          </svg>
                        </div>
                        <Logo />
                      </div>
                      <div className="text-[18px] md:text-[24px] font-[600] flex flex-1 md:flex-1">
                        <Title />
                      </div>
                      <div className="flex gap-[12px] md:gap-[20px] text-textItemBlur text-[12px] md:text-base">
                        <div className="hidden lg:block">
                          <OrganizationSelector />
                        </div>
                        <div className="hover:text-newTextColor">
                          <ModeComponent />
                        </div>
                        <div className="w-[1px] h-[20px] bg-blockSeparator hidden md:block" />
                        <div className="hidden md:block">
                          <LanguageComponent />
                        </div>
                        <div className="w-[1px] h-[20px] bg-blockSeparator hidden lg:block" />
                        <div className="hidden lg:block">
                          <ChromeExtensionComponent />
                        </div>
                        <div className="w-[1px] h-[20px] bg-blockSeparator hidden lg:block" />
                        <AttachToFeedbackIcon />
                        <NotificationComponent />
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative p-[4px] lg:p-0">
                      {isMenuOpen && (
                        <div
                          className="md:hidden fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div
                            className="absolute start-0 top-0 bottom-0 w-[280px] bg-newBgColorInner p-[20px] flex flex-col gap-[32px] overflow-y-auto z-[201]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Logo />
                            <div
                              onClick={() => setIsMenuOpen(false)}
                              className="flex flex-col gap-[16px]"
                            >
                              <TopMenu />
                            </div>
                          </div>
                        </div>
                      )}
                      {children}
                    </div>
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

