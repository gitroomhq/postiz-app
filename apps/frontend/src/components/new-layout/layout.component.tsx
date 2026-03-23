'use client';

import React, { ReactNode, useCallback } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { DM_Sans } from 'next/font/google';
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
import { ContextWrapper, useUser } from '@gitroom/frontend/components/layout/user.context';
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Impersonate } from '@gitroom/frontend/components/layout/impersonate';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
import { MenuItem } from '@gitroom/frontend/components/new-layout/menu-item';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { ChromeExtensionComponent } from '@gitroom/frontend/components/layout/chrome.extension.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';

const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const NavBar = () => {
  const user = useUser();
  const { firstMenu, secondMenu } = useMenuItem();
  const { isGeneral, billingEnabled } = useVariables();

  const filterItems = (items: typeof firstMenu) =>
    items.filter((f) => {
      if (f.hide) return false;
      if (f.requireBilling && !billingEnabled) return false;
      if (f.name === 'Billing' && user?.isLifetime) return false;
      if (f.role) return f.role.includes(user?.role!);
      return true;
    });

  const filteredFirst = filterItems(firstMenu);
  const filteredSecond = filterItems(secondMenu);

  const settingsItem = filteredSecond.find((item) => item.path === '/settings');
  const otherSecondItems = filteredSecond.filter((item) => item.path !== '/settings');

  const centerItems = [
    ...(
      // @ts-ignore
      user?.orgId &&
      // @ts-ignore
      (user.tier !== 'FREE' || !isGeneral || !billingEnabled)
        ? filteredFirst
        : []
    ),
    ...otherSecondItems,
  ];

  return (
    <nav className="liquid-glass glass-navbar h-[65px] relative z-[100]">
      <div className="liquid-glass__blur" />
      <div className="liquid-glass__tint" />
      <div className="liquid-glass__shine" />
      <div className="liquid-glass__content flex items-center h-full px-[16px]">
        {/* Left: Logo + Postra */}
        <div className="flex items-center min-w-[220px]">
          <Logo />
        </div>

        {/* Center: Nav items */}
        <div className="flex-1 flex items-center justify-center gap-[4px] blurMe">
          {centerItems.map((item) => (
            <MenuItem
              path={item.path}
              label={item.name}
              icon={item.icon}
              key={item.name}
              onClick={item.onClick}
            />
          ))}
        </div>

        {/* Right: Settings + Utility icons */}
        <div className="flex items-center gap-[12px] text-textItemBlur min-w-[140px] justify-end">
          {settingsItem && (
            <MenuItem
              path={settingsItem.path}
              label={settingsItem.name}
              icon={settingsItem.icon}
            />
          )}
          <div className="w-[1px] h-[20px] bg-blockSeparator" />
          <StreakComponent />
          <OrganizationSelector />
          <div className="hover:text-newTextColor">
            <ModeComponent />
          </div>
          <div className="w-[1px] h-[20px] bg-blockSeparator" />
          <LanguageComponent />
          <ChromeExtensionComponent />
          <AttachToFeedbackIcon />
          <NotificationComponent />
        </div>
      </div>
    </nav>
  );
};

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  const searchParams = useSearchParams();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const isDevBypass = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

  const { data: fetchedUser, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    onError: () => {},
  });

  const devMockUser = isDevBypass ? {
    id: 'dev-user',
    name: 'Dev User',
    email: 'dev@postra.local',
    orgId: 'dev-org',
    tier: 'PRO' as const,
    role: 'SUPERADMIN' as const,
    publicApi: 'dev-api-key',
    totalChannels: 10,
    isLifetime: false,
    impersonate: false,
    allowTrial: false,
    isTrailing: false,
    streakSince: null,
    admin: false,
  } : null;

  const user = fetchedUser || devMockUser;

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
                'flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px] gap-[10px]',
                dmSans.variable, dmSans.className
              )}
            >
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <>
                  <Support />
                  <NavBar />
                  {/* Main content area */}
                  <div className="liquid-glass flex-1 flex flex-col blurMe">
                    <div className="liquid-glass__blur" />
                    <div className="liquid-glass__tint" />
                    <div className="liquid-glass__shine" />
                    <div className="liquid-glass__content flex flex-1">
                      {children}
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
