'use client';

import React, { useMemo } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { getTimezone } from '@gitroom/frontend/components/layout/set.timezone';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Personal account prefs that are not email notifications.
 * Timezone change and account deletion are Coming soon — no delete API, and
 * SetTimezone is commented out in the app layout (mid-session picker needs care).
 */
export const UserAccountComponent = () => {
  const t = useT();
  const currentTz = useMemo(() => getTimezone(), []);
  const detectedTz = useMemo(() => dayjs.tz.guess(), []);

  return (
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <div className="rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex items-start justify-between gap-[14px]">
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-[600] text-pqText">
              {t('timezone', 'Timezone')}
            </div>
            <div className="mt-[2px] text-[12px] text-pqMuted">
              {t(
                'timezone_display_description',
                'Used for notifications and how times are shown. Channel post slots keep their own offsets.'
              )}
            </div>
            <div className="mt-[10px] text-[13px] font-[500] text-pqText">
              {currentTz}
            </div>
            {currentTz !== detectedTz && (
              <div className="mt-[2px] text-[12px] text-pqSoft">
                {t('timezone_detected', 'Detected')}: {detectedTz}
              </div>
            )}
          </div>
          <span className="shrink-0 rounded-[999px] bg-pqSettings px-[9px] py-[3px] text-[11px] font-[600] text-pqMuted">
            {t('coming_soon', 'Coming soon')}
          </span>
        </div>
        <div className="mt-[12px] flex flex-wrap gap-[6px]">
          <button
            type="button"
            disabled
            className="h-[32px] cursor-not-allowed rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqSoft opacity-[0.55] shadow-[inset_0_0_0_1px_var(--border)]"
          >
            {t('change', 'Change')}
          </button>
          <button
            type="button"
            disabled
            className="h-[32px] cursor-not-allowed rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqSoft opacity-[0.55] shadow-[inset_0_0_0_1px_var(--border)]"
          >
            {t('detect_timezone', 'Detect')} ({detectedTz})
          </button>
        </div>
      </div>

      <div className="rounded-pqMd bg-pqPop p-[15px_16px] opacity-[0.55] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="text-[13.5px] font-[600] text-pqText">
          {t('delete_account', 'Delete Account')}
        </div>
        <div className="mt-[2px] text-[12px] text-pqMuted">
          {t(
            'delete_account_description',
            'Permanently delete your personal account and all associated data. This cannot be undone.'
          )}
        </div>
        <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
          <button
            type="button"
            disabled
            className="h-[32px] cursor-not-allowed rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqSoft shadow-[inset_0_0_0_1px_var(--border)]"
          >
            {t('request_account_deletion', 'Request Account Deletion')}
          </button>
          <span className="text-[11px] font-[600] text-pqSoft">
            {t('coming_soon', 'Coming soon')}
          </span>
        </div>
      </div>
    </div>
  );
};
