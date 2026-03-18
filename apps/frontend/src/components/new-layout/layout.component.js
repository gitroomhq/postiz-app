'use client';
import { __awaiter } from "tslib";
import React, { useCallback } from 'react';
import { Logo } from "./logo";
import { Plus_Jakarta_Sans } from 'next/font/google';
const ModeComponent = dynamic(() => import('@gitroom/frontend/components/layout/mode.component'), {
    ssr: false,
});
import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { useVariables } from "../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from "../layout/check.payment";
import { ToolTip } from "../layout/top.tip";
import { ShowMediaBoxModal } from "../media/media.component";
import { ShowLinkedinCompany } from "../launches/helpers/linkedin.component";
import { MediaSettingsLayout } from "../launches/helpers/media.settings.component";
import { Toaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { ShowPostSelector } from "../post-url-selector/post.url.selector";
import { NewSubscription } from "../layout/new.subscription";
import { Support } from "../layout/support";
import { ContinueProvider } from "../layout/continue.provider";
import { ContextWrapper } from "../layout/user.context";
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from "../../../../../libraries/react-shared-libraries/src/helpers/mantine.wrapper";
import { Impersonate } from "../layout/impersonate";
import { Title } from "../layout/title";
import { TopMenu } from "../layout/top.menu";
import { LanguageComponent } from "../layout/language.component";
import { ChromeExtensionComponent } from "../layout/chrome.extension.component";
import NotificationComponent from "../notifications/notification.component";
import { OrganizationSelector } from "../layout/organization.selector";
import { StreakComponent } from "../layout/streak.component";
import { PreConditionComponent } from "../layout/pre-condition.component";
import { AttachToFeedbackIcon } from "./sentry.feedback.component";
import { FirstBillingComponent } from "../billing/first.billing.component";
const jakartaSans = Plus_Jakarta_Sans({
    weight: ['600', '500', '700'],
    style: ['normal', 'italic'],
    subsets: ['latin'],
});
export const LayoutComponent = ({ children }) => {
    const fetch = useFetch();
    const { backendUrl, billingEnabled, isGeneral } = useVariables();
    // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
    const searchParams = useSearchParams();
    const load = useCallback((path) => __awaiter(void 0, void 0, void 0, function* () {
        return yield (yield fetch(path)).json();
    }), []);
    const { data: user, mutate } = useSWR('/user/self', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        refreshWhenOffline: false,
        refreshWhenHidden: false,
    });
    if (!user)
        return null;
    return (<ContextWrapper user={user}>
      <CopilotKit credentials="include" runtimeUrl={backendUrl + '/copilot/chat'} showDevConsole={false}>
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
            <div className={clsx('flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]', jakartaSans.className)}>
              <div>{(user === null || user === void 0 ? void 0 : user.admin) ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (<FirstBillingComponent />) : (<div className="flex-1 flex gap-[8px]">
                  <Support />
                  <div className="flex flex-col bg-newBgColorInner w-[80px] rounded-[12px]">
                    <div className={clsx('fixed h-full w-[64px] start-[17px] flex flex-1 top-0', (user === null || user === void 0 ? void 0 : user.admin) && 'pt-[60px] max-h-[1000px]:w-[500px]')}>
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
                        <StreakComponent />
                        <div className="w-[1px] h-[20px] bg-blockSeparator"/>
                        <OrganizationSelector />
                        <div className="hover:text-newTextColor">
                          <ModeComponent />
                        </div>
                        <div className="w-[1px] h-[20px] bg-blockSeparator"/>
                        <LanguageComponent />
                        <ChromeExtensionComponent />
                        <div className="w-[1px] h-[20px] bg-blockSeparator"/>
                        <AttachToFeedbackIcon />
                        <NotificationComponent />
                      </div>
                    </div>
                    <div className="flex flex-1 gap-[1px]">{children}</div>
                  </div>
                </div>)}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>);
};
//# sourceMappingURL=layout.component.js.map