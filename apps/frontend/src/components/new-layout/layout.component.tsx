'use client';

import React, { ReactNode, useCallback } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { Archivo } from 'next/font/google';
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
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Title } from '@gitroom/frontend/components/layout/title';
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import { Toaster } from '@gitroom/react/toaster/toaster';

// Heavy chrome / always-mounted-but-rarely-used modals — defer from initial bundle.
const CheckPayment = dynamic(
  () => import('@gitroom/frontend/components/layout/check.payment').then((m) => m.CheckPayment),
  { ssr: false }
);
const ToolTip = dynamic(
  () => import('@gitroom/frontend/components/layout/top.tip').then((m) => m.ToolTip),
  { ssr: false }
);
const ShowMediaBoxModal = dynamic(
  () => import('@gitroom/frontend/components/media/media.component').then((m) => m.ShowMediaBoxModal),
  { ssr: false }
);
const ShowLinkedinCompany = dynamic(
  () =>
    import('@gitroom/frontend/components/launches/helpers/linkedin.component').then(
      (m) => m.ShowLinkedinCompany
    ),
  { ssr: false }
);
const MediaSettingsLayout = dynamic(
  () =>
    import('@gitroom/frontend/components/launches/helpers/media.settings.component').then(
      (m) => m.MediaSettingsLayout
    ),
  { ssr: false }
);
const ShowPostSelector = dynamic(
  () =>
    import('@gitroom/frontend/components/post-url-selector/post.url.selector').then(
      (m) => m.ShowPostSelector
    ),
  { ssr: false }
);
const NewSubscription = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/new.subscription').then((m) => m.NewSubscription),
  { ssr: false }
);
const Support = dynamic(
  () => import('@gitroom/frontend/components/layout/support').then((m) => m.Support),
  { ssr: false }
);
const ContinueProvider = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/continue.provider').then((m) => m.ContinueProvider),
  { ssr: false }
);
const Impersonate = dynamic(
  () => import('@gitroom/frontend/components/layout/impersonate').then((m) => m.Impersonate),
  { ssr: false }
);
const AnnouncementBanner = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/announcement.banner').then(
      (m) => m.AnnouncementBanner
    ),
  { ssr: false }
);
const LanguageComponent = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/language.component').then(
      (m) => m.LanguageComponent
    ),
  { ssr: false }
);
const ChromeExtensionComponent = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/chrome.extension.component').then(
      (m) => m.ChromeExtensionComponent
    ),
  { ssr: false }
);
const NotificationComponent = dynamic(
  () => import('@gitroom/frontend/components/notifications/notification.component'),
  { ssr: false }
);
const OrganizationSelector = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/organization.selector').then(
      (m) => m.OrganizationSelector
    ),
  { ssr: false }
);
const StreakComponent = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/streak.component').then((m) => m.StreakComponent),
  { ssr: false }
);
const PreConditionComponent = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/pre-condition.component').then(
      (m) => m.PreConditionComponent
    ),
  { ssr: false }
);
const AttachToFeedbackIcon = dynamic(
  () =>
    import('@gitroom/frontend/components/new-layout/sentry.feedback.component').then(
      (m) => m.AttachToFeedbackIcon
    ),
  { ssr: false }
);
const FirstBillingComponent = dynamic(
  () =>
    import('@gitroom/frontend/components/billing/first.billing.component').then(
      (m) => m.FirstBillingComponent
    ),
  { ssr: false }
);
const TrialTracker = dynamic(
  () => import('@gitroom/frontend/components/layout/gtm.component').then((m) => m.TrialTracker),
  { ssr: false }
);

const jakartaSans = Archivo({
  weight: ['400', '500', '600', '700', '900'],
  style: ['normal'],
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
                'flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]',
                jakartaSans.className
              )}
            >
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex-1 flex gap-[8px]">
                    <Support />
                    <div className="flex flex-col bg-newBgColorInner w-[80px]">
                      <div
                        id="left-menu"
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
                    <div className="flex-1 bg-newBgLineColor overflow-hidden flex flex-col gap-[1px] blurMe">
                      <div className="flex bg-newBgColorInner h-[80px] px-[20px] items-center">
                        <div className="text-[24px] font-[600] flex flex-1 font-lambo uppercase tracking-tight">
                          <Title />
                        </div>
                        <div className="flex gap-[20px] text-textItemBlur">
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
                </>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
