'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import clsx from 'clsx';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Slider } from '@gitroom/react/form/slider';

interface SystemConfig {
  appUrl: string;
  appUrlSource: 'database' | 'environment';
  disableRegistration: boolean;
  disableRegistrationSource: 'database' | 'environment';
}

export const SystemDomainSettingsComponent: FC<{
  onSaved?: () => void;
  defaultExpanded?: boolean;
}> = ({ onSaved, defaultExpanded = false }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();

  const loadSystemConfig = useCallback(async () => {
    const res = await fetch('/settings/platforms/system');
    return res.json();
  }, [fetch]);

  const { data, mutate, isLoading } = useSWR<SystemConfig>(
    '/settings/platforms/system',
    loadSystemConfig
  );

  const [appUrl, setAppUrl] = useState('');
  const [disableRegistration, setDisableRegistration] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setAppUrl(data.appUrl || '');
      setDisableRegistration(!!data.disableRegistration);
    }
  }, [data]);

  const handleSave = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const trimmed = appUrl.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toaster.show(
        t(
          'invalid_url_format',
          'Please enter a valid URL starting with http:// or https://'
        ),
        'warning'
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/settings/platforms/system', {
        method: 'POST',
        body: JSON.stringify({
          appUrl: trimmed,
          disableRegistration,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.message || 'Failed to save system settings');
      }

      toaster.show(
        t(
          'system_settings_saved',
          'System and domain settings saved successfully! Callback URLs updated.'
        ),
        'success'
      );
      await mutate();
      onSaved?.();
    } catch (err: any) {
      toaster.show(
        err?.message || t('save_failed', 'Failed to save settings'),
        'warning'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !(await deleteDialog(
        t(
          'confirm_reset_system',
          'Are you sure you want to reset system domain and registration settings to docker-compose / .env values?'
        )
      ))
    ) {
      return;
    }

    try {
      await fetch('/settings/platforms/system', {
        method: 'DELETE',
      });
      toaster.show(
        t(
          'system_settings_reset',
          'System settings reset to environment defaults.'
        ),
        'success'
      );
      await mutate();
      onSaved?.();
    } catch (err) {
      toaster.show(t('reset_failed', 'Failed to clear settings'), 'warning');
    }
  };

  if (isLoading && !data) {
    return null;
  }

  return (
    <div
      className={clsx(
        'rounded-[10px] border transition-all duration-200 overflow-hidden',
        isExpanded
          ? 'border-forth/50 bg-newBgColorInner shadow-md'
          : 'border-newTableBorder bg-sixth/40 hover:border-forth/40'
      )}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between p-[16px] cursor-pointer select-none"
      >
        <div className="flex items-center gap-[12px]">
          <div className="w-[38px] h-[38px] rounded-[8px] bg-forth/10 text-forth border border-forth/20 flex items-center justify-center font-bold text-[18px] select-none">
            🌐
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-[8px]">
              <span className="font-semibold text-[15px] text-textColor">
                {t('system_domain_config', 'Public Domain & System Settings')}
              </span>
              {data?.appUrlSource && (
                <span
                  className={clsx(
                    'px-[7px] py-[1.5px] rounded text-[10px] font-semibold border',
                    data.appUrlSource === 'database'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  )}
                >
                  {t('field_source', 'Source')}:{' '}
                  {data.appUrlSource === 'database'
                    ? t('source_database', 'Database')
                    : t('source_environment', 'Environment (.env)')}
                </span>
              )}
            </div>
            <span className="text-[12px] text-customColor18 font-mono">
              {data?.appUrl || 'http://localhost:4007'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-[10px]">
          <span className="text-[12px] text-customColor18 mobile:hidden">
            {isExpanded ? t('collapse', 'Collapse') : t('edit', 'Edit')}
          </span>
          <div
            className={clsx(
              'w-[24px] h-[24px] flex items-center justify-center text-customColor18 transition-transform duration-200',
              isExpanded && 'rotate-180 text-forth dark:text-customColor11'
            )}
          >
            ▼
          </div>
        </div>
      </div>

      {/* Expanded Form */}
      {isExpanded && (
        <div className="border-t border-newTableBorder p-[18px] flex flex-col gap-[18px] bg-newBgColor/40">
          <p className="text-[12px] text-customColor18">
            {t(
              'system_domain_desc',
              'Configure your public domain (e.g. Cloudflare / Reverse Proxy URL). All OAuth Callback URLs and webhook endpoints will automatically update without editing docker-compose.'
            )}
          </p>

          <div className="flex flex-col gap-[16px]">
            {/* Public App URL Field */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-textColor">
                {t('public_app_url', 'Public App URL (Domain & Protocol)')}
              </label>
              <input
                type="text"
                placeholder={t(
                  'public_app_url_placeholder',
                  'e.g. https://postiz.yourdomain.com'
                )}
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSave();
                  }
                }}
                className="w-full bg-newBgColorInner border border-newTableBorder text-[13px] rounded-[8px] px-[12px] py-[8px] text-textColor placeholder:text-customColor18/60 focus:outline-none focus:border-forth font-mono transition-colors"
              />
              <span className="text-[11px] text-customColor18">
                {t(
                  'public_app_url_hint',
                  'Must include https:// (required by Facebook, Google, X, etc.) or http:// for local testing.'
                )}
              </span>
            </div>

            {/* Registration toggle */}
            <div className="flex items-center justify-between p-[12px] bg-newBgColorInner rounded-[8px] border border-newTableBorder">
              <div className="flex flex-col gap-[2px]">
                <span className="text-[13px] font-medium text-textColor">
                  {t('disable_registration', 'Disable Public Registration')}
                </span>
                <span className="text-[11px] text-customColor18">
                  {t(
                    'disable_registration_desc',
                    'Prevent unknown visitors from creating new accounts on your instance.'
                  )}
                </span>
              </div>
              <Slider
                value={disableRegistration ? 'on' : 'off'}
                onChange={(v) => setDisableRegistration(v === 'on')}
                fill={true}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-[12px] border-t border-newTableBorder">
            {data?.appUrlSource === 'database' ||
            data?.disableRegistrationSource === 'database' ? (
              <button
                type="button"
                onClick={handleReset}
                className="px-[10px] py-[6px] text-[12px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10 rounded-[6px] transition-colors font-medium cursor-pointer"
              >
                {t('reset_system_settings', 'Reset to .env Defaults')}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-[10px]">
              <Button type="button" onClick={handleSave} loading={isSaving}>
                {t('save_system_settings', 'Save Domain & Settings')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
