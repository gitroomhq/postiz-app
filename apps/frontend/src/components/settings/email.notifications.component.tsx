import React, { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const EmailNotificationsComponent: FC = () => {
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();

  const load = useCallback(async () => {
    return (await fetch('/settings/email-notifications')).json();
  }, []);

  const { data, mutate } = useSWR('email-notifications', load);

  const toggle = useCallback(async () => {
    try {
      const res = await fetch('/settings/email-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !data?.enabled, 
        }),
      });

      if (!res.ok) throw new Error('Failed to update');

      toast.show(
        t(
          'email_notifications_updated',
          'Email notifications updated successfully'
        ),
        'success'
      );
      mutate(); 
    } catch (err) {
      toast.show(
        t('email_notifications_failed', 'Failed to update email notifications'),
        'warning'
      );
    }
  }, [data, mutate]);

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">
        {t('email_notifications', 'Email Notifications')}
      </h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'control_email_settings',
          'Enable or disable whether you want to receive email notifications.'
        )}
      </div>
      <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[16px] font-medium">
            {t('receive_emails', 'Receive emails?')}
          </div>
          <div className="text-customColor18 text-sm">
            {t(
              'receive_emails_description',
              'You’ll be notified by email when necessary updates occur.'
            )}
          </div>
        </div>
        <Button onClick={toggle}>
          {data?.enabled ? t('disable', 'Disable') : t('enable', 'Enable')}
        </Button>
      </div>
    </div>
  );
};
