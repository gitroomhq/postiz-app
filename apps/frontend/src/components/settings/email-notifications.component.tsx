'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Slider } from '@gitroom/react/form/slider';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

interface EmailNotifications {
  sendSuccessEmails: boolean;
  sendFailureEmails: boolean;
  sendStreakEmails: boolean;
}

export const useEmailNotifications = () => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    return (await fetch('/user/email-notifications')).json();
  }, [fetch]);

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
  const user = useUser();
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
      const currentSettings = settingsRef.current;
      const previous = currentSettings;
      const newData = {
        ...currentSettings,
        [key]: value,
      };

      setLocalSettings(newData);

      try {
        const response = await fetch('/user/email-notifications', {
          method: 'POST',
          body: JSON.stringify(newData),
        });
        if (!response.ok) {
          throw new Error('Failed to update email notifications');
        }
        toaster.show(t('settings_updated', 'Settings updated'), 'success');
      } catch {
        setLocalSettings(previous);
        toaster.show(
          t('something_went_wrong', 'Something went wrong'),
          'warning'
        );
      }
    },
    [fetch, toaster, t]
  );

  const rows: {
    key: keyof EmailNotifications;
    name: string;
    description: string;
  }[] = [
    {
      key: 'sendSuccessEmails',
      name: t('success_emails', 'Success Emails'),
      description: t(
        'success_emails_description',
        'Receive email notifications when posts are published successfully'
      ),
    },
    {
      key: 'sendFailureEmails',
      name: t('failure_emails', 'Failure Emails'),
      description: t(
        'failure_emails_description',
        'Receive email notifications when posts fail to publish'
      ),
    },
    {
      key: 'sendStreakEmails',
      name: t('streak_emails', 'Streak Reminder Emails'),
      description: t(
        'streak_emails_description',
        'Receive email reminders when your posting streak is about to end'
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="mt-[18px] rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="animate-pulse text-[13px] text-pqMuted">
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <div className="rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex items-center justify-between gap-[14px] pb-[6px]">
          <div className="min-w-0">
            <div className="text-[13.5px] font-[600] text-pqText">
              {t('email', 'Email')}
            </div>
            {!!user?.email && (
              <div className="mt-[2px] truncate text-[12px] text-pqMuted">
                {user.email}
              </div>
            )}
          </div>
        </div>
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center gap-[14px] border-t border-pqLine py-[11px]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-[500] text-pqText">{row.name}</div>
              <div className="mt-[2px] text-[12px] text-pqMuted">
                {row.description}
              </div>
            </div>
            <Slider
              value={localSettings[row.key] ? 'on' : 'off'}
              onChange={(value) =>
                updateSetting(row.key, value === 'on')
              }
              fill={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailNotificationsComponent;
