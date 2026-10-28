'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import clsx from 'clsx';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import copy from 'copy-to-clipboard';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { SystemDomainSettingsComponent } from '@gitroom/frontend/components/settings/system-domain.component';

interface PlatformField {
  key: string;
  label: string;
  type: 'text' | 'password';
  isSecret: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: string;
}

interface PlatformItem {
  id: string;
  name: string;
  category: 'social' | 'community' | 'ai' | 'other';
  icon: string;
  callbackUrl?: string;
  docsUrl?: string;
  isConfigured: boolean;
  fields: PlatformField[];
  fieldValues: Record<
    string,
    {
      value: string;
      hasValue: boolean;
      isSecret: boolean;
      source: 'database' | 'environment' | 'none';
    }
  >;
}

export const PlatformsSettingsComponent: FC = () => {
  const fetch = useFetch();
  const t = useT();

  const loadPlatforms = useCallback(async () => {
    const res = await fetch('/settings/platforms');
    return res.json();
  }, [fetch]);

  const { data: platforms, mutate, isLoading } = useSWR<PlatformItem[]>(
    '/settings/platforms',
    loadPlatforms
  );

  const [activeTab, setActiveTab] = useState<'all' | 'social' | 'community' | 'ai'>('all');
  const [search, setSearch] = useState('');
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const filteredPlatforms = useMemo(() => {
    if (!platforms || !Array.isArray(platforms)) return [];
    return platforms.filter((p) => {
      const matchCat = activeTab === 'all' || p.category === activeTab;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [platforms, activeTab, search]);

  const toggleExpand = (id: string) => {
    setExpandedPlatform((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-[20px] w-full text-textColor">
      {/* Title & Description */}
      <div className="flex flex-col gap-[6px]">
        <h2 className="text-[20px] font-semibold text-textColor">
          {t('social_platforms_config', 'Social Media Platform Credentials')}
        </h2>
        <p className="text-[13px] text-customColor18">
          {t(
            'social_platforms_desc',
            'Configure your OAuth Client IDs and API Secrets directly here. Changes take effect immediately without restarting Docker.'
          )}
        </p>
      </div>

      {/* System Domain & Public URL Settings */}
      <SystemDomainSettingsComponent onSaved={() => mutate()} />

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-[12px] bg-sixth/60 p-[12px] rounded-[10px] border border-newTableBorder">
        <div className="flex flex-wrap gap-[6px]">
          {(['all', 'social', 'community', 'ai'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={clsx(
                'px-[14px] py-[6px] rounded-[6px] text-[13px] transition-all cursor-pointer select-none',
                activeTab === cat
                  ? 'bg-forth text-white font-semibold shadow-sm'
                  : 'bg-btnSimple text-customColor18 hover:bg-boxHover hover:text-textColor border border-newTableBorder/50'
              )}
            >
              {cat === 'all'
                ? t('all_platforms', 'All Platforms')
                : cat === 'social'
                ? t('social_networks', 'Social Media')
                : cat === 'community'
                ? t('community', 'Community')
                : t('ai_tools', 'AI & Tools')}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder={t('search_platform', 'Search platform...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-newBgColorInner border border-newTableBorder text-[13px] rounded-[6px] px-[12px] py-[6px] text-textColor placeholder:text-customColor18 focus:outline-none focus:border-forth transition-colors"
          />
        </div>
      </div>

      {/* Platform Cards List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-[40px] text-customColor18 text-[14px]">
          {t('loading_platforms', 'Loading platforms...')}
        </div>
      ) : filteredPlatforms.length === 0 ? (
        <div className="flex items-center justify-center p-[40px] bg-sixth/30 rounded-[10px] border border-dashed border-newTableBorder text-customColor18 text-[14px]">
          {t('no_platforms_found', 'No platforms found matching your filter.')}
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {filteredPlatforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              isExpanded={expandedPlatform === platform.id}
              onToggle={() => toggleExpand(platform.id)}
              onSaved={() => mutate()}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PlatformCard: FC<{
  platform: PlatformItem;
  isExpanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}> = ({ platform, isExpanded, onToggle, onSaved }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();

  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of platform.fields) {
      initial[field.key] = platform.fieldValues[field.key]?.value || '';
    }
    return initial;
  });

  useEffect(() => {
    const updated: Record<string, string> = {};
    for (const field of platform.fields) {
      updated[field.key] = platform.fieldValues[field.key]?.value || '';
    }
    setFormValues(updated);
  }, [platform]);

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyCallback = (url: string) => {
    copy(url);
    toaster.show(t('callback_copied', 'Callback URL copied to clipboard!'), 'success');
  };

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIsSaving(true);
    try {
      const res = await fetch(`/settings/platforms/${platform.id}`, {
        method: 'POST',
        body: JSON.stringify(formValues),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.message || 'Failed to save settings');
      }

      toaster.show(
        t('platform_saved', '{{name}} settings saved successfully!', {
          name: platform.name,
        }),
        'success'
      );
      onSaved();
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
          'confirm_reset_platform',
          'Are you sure you want to clear credentials for {{name}}?',
          { name: platform.name }
        )
      ))
    ) {
      return;
    }

    try {
      await fetch(`/settings/platforms/${platform.id}`, {
        method: 'DELETE',
      });
      toaster.show(
        t('platform_reset', '{{name}} credentials cleared', {
          name: platform.name,
        }),
        'success'
      );
      onSaved();
    } catch (err) {
      toaster.show(t('reset_failed', 'Failed to clear settings'), 'warning');
    }
  };

  return (
    <div
      className={clsx(
        'rounded-[10px] border transition-all duration-200 overflow-hidden',
        isExpanded
          ? 'border-forth/60 bg-newBgColorInner shadow-lg'
          : 'border-newTableBorder bg-sixth/40 hover:border-forth/40'
      )}
    >
      {/* Header Bar */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-[16px] cursor-pointer select-none"
      >
        <div className="flex items-center gap-[12px]">
          <div className="w-[38px] h-[38px] rounded-[8px] bg-forth/10 text-forth border border-forth/20 flex items-center justify-center font-bold text-[16px] uppercase select-none">
            {platform.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-[8px]">
              <span className="font-semibold text-[15px] text-textColor">
                {platform.name}
              </span>
              {platform.isConfigured ? (
                <span className="inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-[6px] h-[6px] rounded-full bg-emerald-500 inline-block" />
                  {t('configured', 'Configured')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-full text-[11px] font-medium bg-btnSimple text-customColor18 border border-newTableBorder">
                  <span className="w-[6px] h-[6px] rounded-full bg-customColor18 inline-block" />
                  {t('not_configured', 'Not configured')}
                </span>
              )}
            </div>
            <span className="text-[12px] text-customColor18">
              {t(
                'credential_fields_count',
                `${platform.fields.length} credential fields`,
                { count: platform.fields.length }
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-[12px]">
          {platform.docsUrl && (
            <a
              href={platform.docsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[12px] text-forth dark:text-customColor11 hover:underline flex items-center gap-[4px] mobile:hidden font-medium"
            >
              <span>{t('dev_portal', 'Developer Portal')}</span>
              <span>↗</span>
            </a>
          )}
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

      {/* Expanded Settings Form */}
      {isExpanded && (
        <div className="border-t border-newTableBorder p-[18px] flex flex-col gap-[18px] bg-newBgColor/40">
          {/* Callback / Redirect URI Box */}
          {platform.callbackUrl && (
            <div className="flex flex-col gap-[8px] bg-newBgColorInner p-[12px] rounded-[8px] border border-newTableBorder">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-textColor">
                  {t('oauth_callback_url', 'OAuth 2.0 Redirect / Callback URL:')}
                </span>
                <span className="text-[11px] text-customColor18">
                  {t('paste_in_portal', 'Paste this into your Developer Console')}
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <code className="flex-1 bg-newBgColor border border-newTableBorder text-forth dark:text-customColor11 text-[12px] font-mono px-[12px] py-[7px] rounded select-all overflow-x-auto">
                  {platform.callbackUrl}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyCallback(platform.callbackUrl!)}
                  className="px-[12px] py-[7px] bg-btnSimple hover:bg-boxHover text-textColor border border-newTableBorder text-[12px] font-medium rounded transition-colors cursor-pointer flex items-center gap-[4px] whitespace-nowrap"
                >
                  {t('copy', 'Copy')}
                </button>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="flex flex-col gap-[14px]">
            {platform.fields.map((field) => {
              const info = platform.fieldValues[field.key];
              const isMasked = showSecrets[field.key] ? false : field.isSecret;

              return (
                <div key={field.key} className="flex flex-col gap-[6px]">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium text-textColor">
                      {field.label}
                    </label>
                    {info?.source && info.source !== 'none' && (
                      <span
                        className={clsx(
                          'px-[6px] py-[1.5px] rounded text-[10px] font-medium border',
                          info.source === 'database'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        )}
                      >
                        {t('field_source', 'Source')}:{' '}
                        {info.source === 'database'
                          ? t('source_database', 'Database')
                          : t('source_environment', 'Environment (.env)')}
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type={isMasked ? 'password' : 'text'}
                      placeholder={field.placeholder || field.label}
                      value={formValues[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSave();
                        }
                      }}
                      className="w-full bg-newBgColorInner border border-newTableBorder text-[13px] rounded-[8px] px-[12px] py-[8px] text-textColor placeholder:text-customColor18/60 focus:outline-none focus:border-forth pr-[40px] transition-colors"
                    />
                    {field.isSecret && (
                      <button
                        type="button"
                        title={
                          showSecrets[field.key]
                            ? t('hide_secret', 'Hide secret')
                            : t('show_secret', 'Show secret')
                        }
                        onClick={() =>
                          setShowSecrets((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key],
                          }))
                        }
                        className="absolute right-[10px] text-customColor18 hover:text-textColor text-[13px] cursor-pointer select-none"
                      >
                        {showSecrets[field.key] ? '🙈' : '👁️'}
                      </button>
                    )}
                  </div>
                  {field.description && (
                    <span className="text-[11px] text-customColor18">
                      {field.description}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-[12px] border-t border-newTableBorder">
            {platform.isConfigured ? (
              <button
                type="button"
                onClick={handleReset}
                className="px-[10px] py-[6px] text-[12px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10 rounded-[6px] transition-colors font-medium cursor-pointer"
              >
                {t('clear_credentials', 'Clear Credentials')}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-[10px]">
              <button
                type="button"
                onClick={onToggle}
                className="px-[14px] py-[7px] text-[13px] rounded-[6px] text-customColor18 hover:text-textColor hover:bg-boxHover cursor-pointer font-medium transition-colors"
              >
                {t('cancel', 'Cancel')}
              </button>
              <Button type="button" onClick={handleSave} loading={isSaving}>
                {t('save_credentials', 'Save Configuration')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
