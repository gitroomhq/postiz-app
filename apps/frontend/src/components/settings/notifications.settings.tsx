'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';

interface NotificationPreferences {
  emailNotificationsFailedPosts: boolean;
  emailNotificationsSuccessfulPosts: boolean;
  inAppNotifications: boolean;
}

export const NotificationsSettings = () => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotificationsFailedPosts: true,
    emailNotificationsSuccessfulPosts: true,
    inAppNotifications: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/settings/notifications');
      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load notification preferences', error);
      toast.show('Failed to load notification preferences', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetch, toast]);

  const updatePreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);

      try {
        await fetch('/settings/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [key]: value }),
        });
        toast.show('Notification preferences updated');
      } catch (error) {
        console.error('Failed to update notification preferences', error);
        toast.show('Failed to update notification preferences', 'error');
        // Revert on error
        setPreferences(preferences);
      }
    },
    [preferences, fetch, toast]
  );

  if (loading) {
    return <div className="flex flex-col">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <h3 className="text-[20px]">{t('notifications', 'Notifications')}</h3>
      <div className="bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
        <div className="text-[14px] text-textColor/70">
          {t(
            'notifications_description',
            'Customize your notification preferences to control when you receive alerts.'
          )}
        </div>

        <div className="flex flex-col gap-[20px]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <div className="text-[16px] font-medium">
                {t('email_failed_posts', 'Email notifications for failed posts')}
              </div>
              <div className="text-[14px] text-textColor/60">
                {t(
                  'email_failed_posts_desc',
                  'Receive email alerts when a scheduled post fails to publish'
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailNotificationsFailedPosts}
                onChange={(e) =>
                  updatePreference(
                    'emailNotificationsFailedPosts',
                    e.target.checked
                  )
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-customColor6 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="border-t border-fifth"></div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <div className="text-[16px] font-medium">
                {t(
                  'email_successful_posts',
                  'Email notifications for successful posts'
                )}
              </div>
              <div className="text-[14px] text-textColor/60">
                {t(
                  'email_successful_posts_desc',
                  'Receive email confirmations when posts are successfully published'
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailNotificationsSuccessfulPosts}
                onChange={(e) =>
                  updatePreference(
                    'emailNotificationsSuccessfulPosts',
                    e.target.checked
                  )
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-customColor6 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="border-t border-fifth"></div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <div className="text-[16px] font-medium">
                {t('in_app_notifications', 'In-app notifications')}
              </div>
              <div className="text-[14px] text-textColor/60">
                {t(
                  'in_app_notifications_desc',
                  'Show notification alerts in the application interface'
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.inAppNotifications}
                onChange={(e) =>
                  updatePreference('inAppNotifications', e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-customColor6 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
