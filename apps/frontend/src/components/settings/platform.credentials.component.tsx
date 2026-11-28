'use client';

import React, { useCallback, useState } from 'react';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface PlatformFieldStatus {
  key: string;
  label: string;
  secret: boolean;
  hasValue: boolean;
  maskedPreview: string;
  source: 'ui' | 'env' | 'none';
}

interface PlatformStatus {
  id: string;
  name: string;
  providers: string[];
  redirectUris: string[];
  developerPortalUrl?: string;
  developerPortalLabel?: string;
  notes: string;
  configured: boolean;
  source: 'ui' | 'env' | 'none';
  fields: PlatformFieldStatus[];
}

export const PlatformCredentialsComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'configured' | 'missing'
  >('all');

  const loadPlatforms = useCallback(async () => {
    const res = await fetch('/settings/platform-credentials');
    if (!res.ok) {
      throw new Error('Failed to load platform credentials');
    }
    return (await res.json()) as { platforms: PlatformStatus[] };
  }, []);

  const { data, isLoading, mutate } = useSWR(
    'platform-credentials',
    loadPlatforms
  );

  const setFieldValue = (platformId: string, key: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = async (platform: PlatformStatus) => {
    const values = drafts[platform.id] || {};
    const nonEmpty = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v.trim().length > 0)
    );
    if (!Object.keys(nonEmpty).length) {
      toaster.show(
        t('enter_at_least_one_credential', 'Enter at least one credential value to save'),
        'warning'
      );
      return;
    }
    setSavingId(platform.id);
    try {
      const res = await fetch('/settings/platform-credentials', {
        method: 'PUT',
        body: JSON.stringify({
          platformId: platform.id,
          values: nonEmpty,
        }),
      });
      if (!res.ok) {
        toaster.show(
          t('could_not_save_platform_credentials', 'Could not save platform credentials'),
          'warning'
        );
        return;
      }
      const updated = await res.json();
      await mutate(updated, false);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[platform.id];
        return next;
      });
      toaster.show(
        t('platform_credentials_saved', '{{name}} credentials saved', {
          name: platform.name,
        }),
        'success'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleClear = async (platform: PlatformStatus) => {
    setSavingId(platform.id);
    try {
      const res = await fetch(`/settings/platform-credentials/${platform.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toaster.show(
          t('could_not_clear_credentials', 'Could not clear saved credentials'),
          'warning'
        );
        return;
      }
      const updated = await res.json();
      await mutate(updated, false);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[platform.id];
        return next;
      });
      toaster.show(
        t('cleared_ui_overrides', 'Cleared UI overrides for {{name}}', {
          name: platform.name,
        }),
        'success'
      );
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-[14px] text-textItemBlur py-[20px]">
        {t('loading_platform_api_settings', 'Loading platform API settings...')}
      </div>
    );
  }

  const allPlatforms = data?.platforms || [];
  const filteredPlatforms = allPlatforms.filter((platform) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'configured' && platform.configured) ||
      (statusFilter === 'missing' && !platform.configured);
    if (!matchesStatus) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return (
      platform.name.toLowerCase().includes(q) ||
      platform.providers.some((p) => p.toLowerCase().includes(q)) ||
      platform.fields.some((f) => f.key.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex flex-col gap-[6px]">
        <h3 className="text-[20px] font-[600]">
          {t('platform_api_keys_admin', 'Platform API Keys (Admin)')}
        </h3>
        <p className="text-[14px] text-textItemBlur">
          {t(
            'platform_api_keys_description',
            "Configure Postiz's OAuth app credentials once per social network. Once saved, team members can connect brand accounts with 1-click direct login via Add Channel. Credentials are encrypted at rest and never shown back in plaintext."
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-[10px]">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(
            'search_platform_placeholder',
            'Search platform (e.g. Reddit, LinkedIn, TikTok)...'
          )}
          className="flex-1 min-w-[220px] h-[40px] px-[12px] rounded-[8px] border border-newTableBorder bg-newBgColorInner text-[13px] text-textColor outline-none focus:border-btnPrimary"
        />
        <div className="flex items-center gap-[6px]">
          {(['all', 'configured', 'missing'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setStatusFilter(filterKey)}
              className={
                statusFilter === filterKey
                  ? 'px-[12px] h-[40px] rounded-[8px] bg-btnPrimary text-white text-[12px] font-[600]'
                  : 'px-[12px] h-[40px] rounded-[8px] border border-newTableBorder bg-newBgColor text-textItemBlur text-[12px] hover:text-textColor'
              }
            >
              {filterKey === 'all'
                ? `${t('filter_all', 'All')} (${allPlatforms.length})`
                : filterKey === 'configured'
                ? `${t('filter_configured', 'Configured')} (${
                    allPlatforms.filter((p) => p.configured).length
                  })`
                : `${t('filter_not_configured', 'Not Configured')} (${
                    allPlatforms.filter((p) => !p.configured).length
                  })`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[16px]">
        {filteredPlatforms.map((platform) => {
          const platformDraft = drafts[platform.id] || {};
          const isBusy = savingId === platform.id;
          return (
            <div
              key={platform.id}
              className="rounded-[12px] border border-newTableBorder bg-newBgColor p-[20px] flex flex-col gap-[14px]"
            >
              <div className="flex items-start justify-between gap-[12px] flex-wrap">
                <div className="flex flex-col gap-[4px]">
                  <div className="text-[16px] font-[600]">{platform.name}</div>
                  <div className="text-[12px] text-textItemBlur">
                    {platform.notes}
                  </div>
                </div>
                <span
                  className={
                    platform.configured
                      ? 'px-[10px] py-[4px] rounded-full text-[12px] font-[600] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'px-[10px] py-[4px] rounded-full text-[12px] font-[600] bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }
                >
                  {platform.configured
                    ? platform.source === 'ui'
                      ? t('configured_admin_ui', 'Configured (Admin UI)')
                      : t('configured_env', 'Configured (.env)')
                    : t('not_configured', 'Not Configured')}
                </span>
              </div>

              {platform.developerPortalUrl && (
                <div className="flex flex-col gap-[6px]">
                  <div className="text-[12px] font-[500] text-textItemBlur">
                    {t(
                      'where_to_get_api_keys',
                      'Where to create / get API keys ({{portal}}):',
                      {
                        portal:
                          platform.developerPortalLabel ||
                          t('developer_portal', 'Developer Portal'),
                      }
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-[8px] rounded-[8px] border border-newTableBorder bg-newBgColorInner px-[12px] py-[8px] text-[12px]">
                    <a
                      href={platform.developerPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-btnPrimary hover:underline"
                    >
                      {platform.developerPortalUrl}
                    </a>
                    <div className="flex items-center gap-[6px] shrink-0">
                      <a
                        href={platform.developerPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-[10px] py-[4px] rounded-[6px] bg-btnPrimary text-white hover:opacity-90 text-[12px]"
                      >
                        {t('open_portal', 'Open Portal')}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          copy(platform.developerPortalUrl!);
                          toaster.show(
                            t('developer_url_copied', 'Developer URL copied'),
                            'success'
                          );
                        }}
                        className="px-[10px] py-[4px] rounded-[6px] bg-btnSimple text-btnText hover:opacity-90 text-[12px]"
                      >
                        {t('copy', 'Copy')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {platform.redirectUris.length > 0 && (
                <div className="flex flex-col gap-[6px]">
                  <div className="text-[12px] font-[500] text-textItemBlur">
                    {t(
                      'authorized_oauth_redirect_uris',
                      'Authorized OAuth Redirect URI(s) to add in developer portal:'
                    )}
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    {platform.redirectUris.map((uri) => (
                      <div
                        key={uri}
                        className="flex items-center justify-between gap-[8px] rounded-[8px] border border-newTableBorder bg-newBgColorInner px-[12px] py-[8px] text-[12px]"
                      >
                        <code className="truncate select-all">{uri}</code>
                        <button
                          type="button"
                          onClick={() => {
                            copy(uri);
                            toaster.show(
                              t('redirect_uri_copied', 'Redirect URI copied'),
                              'success'
                            );
                          }}
                          className="shrink-0 px-[10px] py-[4px] rounded-[6px] bg-btnSimple text-btnText hover:opacity-90 text-[12px]"
                        >
                          {t('copy', 'Copy')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                {platform.fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-[6px]">
                    <label className="text-[13px] font-[500] flex items-center justify-between gap-[8px]">
                      <span>{field.label}</span>
                      {field.hasValue && (
                        <span className="text-[11px] text-textItemBlur">
                          {t('saved_preview', 'Saved: {{preview}}', {
                            preview: field.maskedPreview,
                          })}
                        </span>
                      )}
                    </label>
                    <input
                      type={field.secret ? 'password' : 'text'}
                      autoComplete="off"
                      value={platformDraft[field.key] ?? ''}
                      onChange={(e) =>
                        setFieldValue(platform.id, field.key, e.target.value)
                      }
                      placeholder={
                        field.hasValue
                          ? t('leave_blank_to_keep', 'Leave blank to keep {{preview}}', {
                              preview: field.maskedPreview,
                            })
                          : t('enter_field_key', 'Enter {{key}}', {
                              key: field.key,
                            })
                      }
                      className="h-[42px] px-[12px] rounded-[8px] border border-newTableBorder bg-newBgColorInner text-[13px] text-textColor outline-none focus:border-btnPrimary"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-[10px] pt-[4px]">
                <Button
                  type="button"
                  loading={isBusy}
                  onClick={() => handleSave(platform)}
                >
                  {t('save_platform_keys', 'Save {{platform}} Keys', {
                    platform: platform.name.split(' ')[0],
                  })}
                </Button>
                {platform.source === 'ui' && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleClear(platform)}
                    className="px-[14px] h-[40px] rounded-[8px] border border-newTableBorder bg-btnSimple text-btnText text-[13px] hover:opacity-90 disabled:opacity-50"
                  >
                    {t('clear_ui_override', 'Clear UI Override')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
