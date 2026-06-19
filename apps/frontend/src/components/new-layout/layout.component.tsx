'use client';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import ModeComponent from '@gitroom/frontend/components/layout/mode.component';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { usePathname, useSearchParams } from 'next/navigation';
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

const MenuIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4 7H20M4 12H20M4 17H20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M6 6L18 18M18 6L6 18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const MoreIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M5 12H5.01M12 12H12.01M19 12H19.01"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HeaderActions = ({
  billingEnabled,
  hasStreak,
  variant = 'desktop',
}: {
  billingEnabled: boolean;
  hasStreak?: boolean;
  variant?: 'desktop' | 'menu';
}) => {
  if (variant === 'menu') {
    const rowClass =
      'flex min-h-[48px] items-center justify-between gap-[12px] rounded-[12px] px-[12px] py-[10px] text-[#637282] hover:bg-boxFocused hover:text-textItemFocused';

    return (
      <div className="flex flex-col gap-[6px]">
        {hasStreak ? (
          <div className={rowClass}>
            <span className="min-w-0 truncate text-[14px] font-[600]">
              Streak
            </span>
            <StreakComponent />
          </div>
        ) : null}
        <div className={clsx(rowClass, '[&>div:last-child]:hidden')}>
          <span className="min-w-0 truncate text-[14px] font-[600]">
            Organization
          </span>
          <OrganizationSelector />
        </div>
        <div className={rowClass}>
          <span className="min-w-0 truncate text-[14px] font-[600]">Theme</span>
          <ModeComponent />
        </div>
        <div className={rowClass}>
          <span className="min-w-0 truncate text-[14px] font-[600]">
            Language
          </span>
          <LanguageComponent />
        </div>
        {billingEnabled ? (
          <div className={rowClass}>
            <span className="min-w-0 truncate text-[14px] font-[600]">
              Chrome extension
            </span>
            <ChromeExtensionComponent />
          </div>
        ) : null}
        <div className={rowClass}>
          <span className="min-w-0 truncate text-[14px] font-[600]">
            Feedback
          </span>
          <AttachToFeedbackIcon />
        </div>
        <div className={rowClass}>
          <span className="min-w-0 truncate text-[14px] font-[600]">
            Notifications
          </span>
          <NotificationComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="hidden flex-wrap items-center gap-[14px] text-[#637282] desktop:flex">
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
  );
};

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const { billingEnabled, isGeneral } = useVariables();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const {
    data: user,
    error,
    mutate,
  } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const closeActions = useCallback(() => setIsActionsOpen(false), []);

  useEffect(() => {
    closeDrawer();
    closeActions();
  }, [pathname, closeDrawer, closeActions]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1200px)');
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeDrawer();
        closeActions();
      }
    };

    desktopQuery.addEventListener('change', handleDesktopChange);

    return () => {
      desktopQuery.removeEventListener('change', handleDesktopChange);
    };
  }, [closeActions, closeDrawer]);

  useEffect(() => {
    if (!isActionsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const menu = document.querySelector('#mobile-header-actions');
      if (!menu?.contains(event.target as Node)) {
        closeActions();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeActions();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeActions, isActionsOpen]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDrawer, isDrawerOpen]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">
            Authentication error
          </h2>
          <p className="mt-2 text-gray-600">
            Unable to load user data. Please try logging in again.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
                jakartaSans.className,
              )}
            >
              {user?.admin ? <Impersonate /> : null}
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex flex-1 flex-col gap-[12px] desktop:flex-row">
                    <Support />

                    <aside className="hidden desktop:block desktop:w-[92px] desktop:flex-none">
                      <div
                        id="left-menu"
                        className={clsx(
                          'fixed left-[12px] top-[12px] flex h-[calc(100vh-24px)] w-[72px] flex-col gap-[8px] overflow-visible rounded-[20px] border border-gray-200 bg-white px-[8px] py-[10px]',
                          user?.admin && 'desktop:pt-[60px]',
                        )}
                      >
                        <div className="flex shrink-0 items-center pr-[8px] desktop:justify-center desktop:pr-0">
                          <Logo />
                        </div>
                        <div className="flex min-w-0 flex-1 desktop:flex-none">
                          <TopMenu />
                        </div>
                      </div>
                    </aside>

                    <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_24px_72px_rgba(15,39,66,0.08)]">
                      <div className="flex min-w-0 items-center justify-between gap-[12px] border-b border-gray-200 px-[14px] py-[14px] sm:px-[20px] desktop:py-[16px]">
                        <div className="min-w-0 truncate text-[22px] font-[700] tracking-[-0.03em] sm:text-[24px]">
                          <Title />
                        </div>
                        <HeaderActions
                          billingEnabled={billingEnabled}
                          hasStreak={!!user?.streakSince}
                        />
                        <div className="hidden shrink-0 items-center gap-[8px] belowDesktop:flex desktop:hidden">
                          <div id="mobile-header-actions" className="relative">
                            <button
                              type="button"
                              aria-label="Open header actions"
                              aria-expanded={isActionsOpen}
                              aria-controls="mobile-header-actions-menu"
                              onClick={() => setIsActionsOpen((open) => !open)}
                              className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border border-gray-200 text-[#637282] transition-colors hover:bg-boxFocused hover:text-textItemFocused"
                            >
                              <MoreIcon />
                            </button>
                            {isActionsOpen ? (
                              <div
                                id="mobile-header-actions-menu"
                                className="absolute right-0 top-[calc(100%+8px)] z-[40] w-[min(calc(100vw-28px),320px)] rounded-[16px] border border-gray-200 bg-white p-[8px] text-[#37322F] shadow-[0_18px_48px_rgba(15,39,66,0.16)]"
                              >
                                <HeaderActions
                                  billingEnabled={billingEnabled}
                                  hasStreak={!!user?.streakSince}
                                  variant="menu"
                                />
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            aria-label="Open navigation menu"
                            aria-expanded={isDrawerOpen}
                            aria-controls="mobile-navigation-drawer"
                            onClick={() => {
                              closeActions();
                              setIsDrawerOpen(true);
                            }}
                            className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border border-gray-200 text-[#637282] transition-colors hover:bg-boxFocused hover:text-textItemFocused"
                          >
                            <MenuIcon />
                          </button>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                        {children}
                      </div>
                    </main>
                  </div>
                  {isDrawerOpen ? (
                    <div className="fixed inset-0 z-[1000] belowDesktop:block desktop:hidden">
                      <button
                        type="button"
                        aria-label="Close navigation menu"
                        className="absolute inset-0 h-full w-full bg-black/40"
                        onClick={closeDrawer}
                      />
                      <div
                        id="mobile-navigation-drawer"
                        role="dialog"
                        aria-modal="true"
                        className="absolute inset-y-0 left-0 flex w-[calc(100vw-24px)] max-w-[360px] flex-col overflow-hidden rounded-r-[20px] border-r border-gray-200 bg-white text-[#37322F] shadow-[0_24px_72px_rgba(15,39,66,0.18)] mobileDrawer:max-w-[336px]"
                      >
                        <div className="flex shrink-0 items-center justify-between gap-[12px] border-b border-gray-200 px-[16px] py-[14px]">
                          <Logo />
                          <button
                            type="button"
                            aria-label="Close navigation menu"
                            onClick={closeDrawer}
                            className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border border-gray-200 text-[#637282] transition-colors hover:bg-boxFocused hover:text-textItemFocused"
                          >
                            <CloseIcon />
                          </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[12px] py-[12px]">
                          <div className="flex flex-col gap-[14px]">
                            <TopMenu
                              variant="drawer"
                              onNavigate={closeDrawer}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
