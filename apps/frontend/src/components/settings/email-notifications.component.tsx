'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Slider } from '@gitroom/react/form/slider';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface EmailNotifications {
  sendSuccessEmails: boolean;
  sendFailureEmails: boolean;
  sendStreakEmails: boolean;
}

export const useEmailNotifications = () => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    return (await fetch('/user/email-notifications')).json();
  }, []);

  return useSWR<EmailNotifications>('email-notifications', load, {
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

  const [localSettings, setLocalSettings] = useState<EmailNotifications>({
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

  const updateSetting = useCallback(
    async (key: keyof EmailNotifications, value: boolean) => {
      // Use ref to get the latest state
      const currentSettings = settingsRef.current;
      const newData = {
        ...currentSettings,
        [key]: value,
      };

      // Update local state immediately
      setLocalSettings(newData);

      await fetch('/user/email-notifications', {
        method: 'POST',
        body: JSON.stringify(newData),
      });

      toaster.show(t('settings_updated', 'Settings updated'), 'success');
    },
    []
  );

  const handleSuccessEmailsChange = useCallback(
    (value: 'on' | 'off') => {
      updateSetting('sendSuccessEmails', value === 'on');
    },
    [updateSetting]
  );

  const handleFailureEmailsChange = useCallback(
    (value: 'on' | 'off') => {
      updateSetting('sendFailureEmails', value === 'on');
    },
    [updateSetting]
  );

  const handleStreakEmailsChange = useCallback(
    (value: 'on' | 'off') => {
      updateSetting('sendStreakEmails', value === 'on');
    },
    [updateSetting]
  );

  if (isLoading) {
    return (
      <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] p-[15px_16px]">
        <div className="animate-pulse">
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] p-[15px_16px] flex flex-col">
      <div className="text-[13.5px] font-[600] pb-[6px]">
        {t('email_notifications', 'Email Notifications')}
      </div>
      <div className="flex items-center gap-[14px] py-[11px] border-t border-pqLine">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-[500]">
            {t('success_emails', 'Success Emails')}
          </div>
          <div className="text-[12px] text-pqMuted mt-[2px]">
            {t(
              'success_emails_description',
              'Receive email notifications when posts are published successfully'
            )}
          </div>
        </div>
        <Slider
          value={localSettings.sendSuccessEmails ? 'on' : 'off'}
          onChange={handleSuccessEmailsChange}
          fill={true}
        />
      </div>
      <div className="flex items-center gap-[14px] py-[11px] border-t border-pqLine">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-[500]">
            {t('failure_emails', 'Failure Emails')}
          </div>
          <div className="text-[12px] text-pqMuted mt-[2px]">
            {t(
              'failure_emails_description',
              'Receive email notifications when posts fail to publish'
            )}
          </div>
        </div>
        <Slider
          value={localSettings.sendFailureEmails ? 'on' : 'off'}
          onChange={handleFailureEmailsChange}
          fill={true}
        />
      </div>
      <div className="flex items-center gap-[14px] py-[11px] border-t border-pqLine">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-[500]">
            {t('streak_emails', 'Streak Reminder Emails')}
          </div>
          <div className="text-[12px] text-pqMuted mt-[2px]">
            {t(
              'streak_emails_description',
              'Receive email reminders when your posting streak is about to end'
            )}
          </div>
        </div>
        <Slider
          value={localSettings.sendStreakEmails ? 'on' : 'off'}
          onChange={handleStreakEmailsChange}
          fill={true}
        />
      </div>
    </div>
  );
};

export default EmailNotificationsComponent;

