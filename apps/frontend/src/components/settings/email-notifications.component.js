'use client';
import { __awaiter } from "tslib";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import useSWR from 'swr';
import { Slider } from "../../../../../libraries/react-shared-libraries/src/form/slider";
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const useEmailNotifications = () => {
    const fetch = useFetch();
    const load = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/user/email-notifications')).json();
    }), []);
    return useSWR('email-notifications', load, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
    });
};
const EmailNotificationsComponent = () => {
    const t = useT();
    const fetch = useFetch();
    const toaster = useToaster();
    const { data, isLoading } = useEmailNotifications();
    const [localSettings, setLocalSettings] = useState({
        sendSuccessEmails: true,
        sendFailureEmails: true,
        sendStreakEmails: true,
    });
    // Keep a ref to always have the latest state
    const settingsRef = useRef(localSettings);
    settingsRef.current = localSettings;
    // Sync local state with fetched data
    useEffect(() => {
        if (data) {
            setLocalSettings(data);
        }
    }, [data]);
    const updateSetting = useCallback((key, value) => __awaiter(void 0, void 0, void 0, function* () {
        // Use ref to get the latest state
        const currentSettings = settingsRef.current;
        const newData = Object.assign(Object.assign({}, currentSettings), { [key]: value });
        // Update local state immediately
        setLocalSettings(newData);
        yield fetch('/user/email-notifications', {
            method: 'POST',
            body: JSON.stringify(newData),
        });
        toaster.show(t('settings_updated', 'Settings updated'), 'success');
    }), []);
    const handleSuccessEmailsChange = useCallback((value) => {
        updateSetting('sendSuccessEmails', value === 'on');
    }, [updateSetting]);
    const handleFailureEmailsChange = useCallback((value) => {
        updateSetting('sendFailureEmails', value === 'on');
    }, [updateSetting]);
    const handleStreakEmailsChange = useCallback((value) => {
        updateSetting('sendStreakEmails', value === 'on');
    }, [updateSetting]);
    if (isLoading) {
        return (<div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        <div className="animate-pulse">
          {t('loading', 'Loading...')}
        </div>
      </div>);
    }
    return (<div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
      <div className="mt-[4px]">
        {t('email_notifications', 'Email Notifications')}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('success_emails', 'Success Emails')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t('success_emails_description', 'Receive email notifications when posts are published successfully')}
          </div>
        </div>
        <Slider value={localSettings.sendSuccessEmails ? 'on' : 'off'} onChange={handleSuccessEmailsChange} fill={true}/>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('failure_emails', 'Failure Emails')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t('failure_emails_description', 'Receive email notifications when posts fail to publish')}
          </div>
        </div>
        <Slider value={localSettings.sendFailureEmails ? 'on' : 'off'} onChange={handleFailureEmailsChange} fill={true}/>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('streak_emails', 'Streak Reminder Emails')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t('streak_emails_description', 'Receive email reminders when your posting streak is about to end')}
          </div>
        </div>
        <Slider value={localSettings.sendStreakEmails ? 'on' : 'off'} onChange={handleStreakEmailsChange} fill={true}/>
      </div>
    </div>);
};
export default EmailNotificationsComponent;
//# sourceMappingURL=email-notifications.component.js.map