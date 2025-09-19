 'use client';

import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
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
import { Onboarding } from '@gitroom/frontend/components/onboarding/onboarding';
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
import { BillingAfter } from '@gitroom/frontend/components/new-layout/billing.after';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['600', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  function AttachToFeedbackIcon({ sentryDsn }: { sentryDsn?: string }) {
    const [feedback, setFeedback] = useState<any>();
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
      if (!sentryDsn) return;
      try {
        const fb = (Sentry as any).getFeedback?.();
        setFeedback(fb);
      } catch (e) {
        setFeedback(undefined);
      }
    }, [sentryDsn]);

    useEffect(() => {
      if (feedback && buttonRef.current) {
        const unsubscribe = feedback.attachTo(buttonRef.current);
        return unsubscribe;
      }
      return () => {};
    }, [feedback]);

    if (!sentryDsn) return null;

    return (
      <button
        ref={buttonRef}
        type="button"
        aria-label="Feedback"
        className="hover:text-newTextColor"
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M27 10H23V6C23 5.46957 22.7893 4.96086 22.4142 4.58579C22.0391 4.21071 21.5304 4 21 4H5C4.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V22C3.00059 22.1881 3.05423 22.3723 3.15478 22.5313C3.25532 22.6903 3.39868 22.8177 3.56839 22.8989C3.7381 22.9801 3.92728 23.0118 4.11418 22.9903C4.30108 22.9689 4.47814 22.8951 4.625 22.7775L9 19.25V23C9 23.5304 9.21071 24.0391 9.58579 24.4142C9.96086 24.7893 10.4696 25 11 25H22.6987L27.375 28.7775C27.5519 28.9206 27.7724 28.9991 28 29C28.2652 29 28.5196 28.8946 28.7071 28.7071C28.8946 28.5196 29 28.2652 29 28V12C29 11.4696 28.7893 10.9609 28.4142 10.5858C28.0391 10.2107 27.5304 10 27 10ZM8.31875 17.2225L5 19.9062V6H21V17H8.9475C8.71863 17 8.4967 17.0786 8.31875 17.2225ZM27 25.9062L23.6812 23.2225C23.5043 23.0794 23.2838 23.0009 23.0562 23H11V19H21C21.5304 19 22.0391 18.7893 22.4142 18.4142C22.7893 18.0391 23 17.5304 23 17V12H27V25.9062Z" fill="#343330"/>
        </svg>
      </button>
    );
  }
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
          {user.tier === 'FREE' && searchParams.get('check') && (
            <CheckPayment check={searchParams.get('check')!} mutate={mutate} />
          )}
          <ToolTip />
          <ShowMediaBoxModal />
          <ShowLinkedinCompany />
          <MediaSettingsLayout />
          <Toaster />
          <ShowPostSelector />
          <PreConditionComponent />
          <NewSubscription />
          <Support />
          <ContinueProvider />
          <div
            className={clsx(
              'flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]',
              jakartaSans.className
            )}
          >
            <div>{user?.admin ? <Impersonate /> : <div />}</div>
            {user.tier === 'FREE' && isGeneral && billingEnabled ? (
              <BillingAfter />
            ) : (
              <div className="flex-1 flex gap-[8px]">
                <div className="flex flex-col bg-newBgColorInner w-[80px] rounded-[12px]">
                  <div className={clsx("fixed h-full w-[64px] start-[17px] flex flex-1 top-0", user?.admin && 'pt-[60px]')}>
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
                      <OrganizationSelector />
                      <div className="hover:text-newTextColor">
                        <ModeComponent />
                      </div>
                      <div className="w-[1px] h-[20px] bg-blockSeparator" />
                      <LanguageComponent />
                      <ChromeExtensionComponent />
                      <div className="w-[1px] h-[20px] bg-blockSeparator" />
                      {/* Feedback icon (icon-only) - only show when Sentry DSN is present */}
                      <AttachToFeedbackIcon sentryDsn={(useVariables() as any).sentryDsn} />
                      <NotificationComponent />
                    </div>
                  </div>
                  <div className="flex flex-1 gap-[1px]">{children}</div>
                </div>
              </div>
            )}
          </div>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
