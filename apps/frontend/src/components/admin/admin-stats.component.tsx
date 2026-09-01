'use client';

import React, { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface PerSocial {
  provider: string;
  count: number;
}

interface StatsBlock {
  total: number;
  perSocial: PerSocial[];
}

interface StatsResponse {
  from: string;
  to: string;
  errors: StatsBlock;
  posts: StatsBlock;
  connected: StatsBlock;
  publishingAccounts?: StatsBlock;
  scheduledAccounts?: StatsBlock;
  publishingChannels?: StatsBlock;
  scheduledChannels?: StatsBlock;
}

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

const startOfWeek = () => {
  const d = new Date();
  // ISO week: Monday = 0
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const useStats = (params: {
  from: string;
  to: string;
  unknownOnly: boolean;
}) => {
  const fetch = useFetch();
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    ...(params.unknownOnly ? { unknownOnly: 'true' } : {}),
  });
  const key = `/admin/stats?${query.toString()}`;
  return useSWR<StatsResponse>(
    key,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to load stats');
      }
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
};

const SummaryCard: FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <div className="border border-newTableBorder rounded-[8px] p-[16px] bg-newBgColorInner">
    <div className="text-[12px] opacity-70">{label}</div>
    <div className="text-[28px] font-[600]">{value.toLocaleString()}</div>
  </div>
);

const PerSocialTable: FC<{ title: string; block: StatsBlock }> = ({
  title,
  block,
}) => {
  const t = useT();
  return (
  <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
    <div className="grid grid-cols-[1fr_120px] gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] uppercase opacity-70 border-b border-newTableBorder">
      <div>{title}</div>
      <div className="text-right">{t('count', 'Count')}</div>
    </div>
    {block.perSocial.length === 0 ? (
      <div className="px-[12px] py-[10px] text-[13px] opacity-70">
        {t('no_data_for_this_timeframe', 'No data for this timeframe.')}
      </div>
    ) : (
      block.perSocial.map((row) => (
        <div
          key={row.provider}
          className="grid grid-cols-[1fr_120px] gap-[12px] px-[12px] py-[10px] text-[13px] border-b border-newTableBorder last:border-b-0"
        >
          <div className="capitalize">{row.provider}</div>
          <div className="text-right">{row.count.toLocaleString()}</div>
        </div>
      ))
    )}
  </div>
  );
};

export const AdminStatsComponent: FC = () => {
  const t = useT();
  const user = useUser();

  const PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
    { label: t('today', 'Today'), range: () => ({ from: today(), to: today() }) },
    { label: t('this_week', 'This week'), range: () => ({ from: startOfWeek(), to: today() }) },
    { label: t('this_month', 'This month'), range: () => ({ from: startOfMonth(), to: today() }) },
    { label: t('last_7_days', 'Last 7 days'), range: () => ({ from: isoDaysAgo(7), to: today() }) },
    { label: t('last_30_days', 'Last 30 days'), range: () => ({ from: isoDaysAgo(30), to: today() }) },
  ];

  const [fromInput, setFromInput] = useState(today());
  const [toInput, setToInput] = useState(today());
  const [range, setRange] = useState({ from: today(), to: today() });
  const [unknownOnly, setUnknownOnly] = useState(false);

  const { data, isLoading, error } = useStats({ ...range, unknownOnly });

  const applyRange = useCallback((next: { from: string; to: string }) => {
    setFromInput(next.from);
    setToInput(next.to);
    setRange(next);
  }, []);

  if (!user?.isSuperAdmin) {
    return (
      <div className="text-textColor p-[20px]">
        {t('you_do_not_have_access_to_this_page', 'You do not have access to this page.')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px] text-textColor">
      <div className="flex items-center justify-between">
        <div className="text-[20px] font-[600]">{t('admin_stats', 'Admin Stats')}</div>
        {data && (
          <div className="text-[13px] opacity-70">
            {new Date(data.from).toLocaleDateString()} —{' '}
            {new Date(data.to).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-[8px]">
        {PRESETS.map((preset) => {
          const next = preset.range();
          const active = range.from === next.from && range.to === next.to;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyRange(next)}
              className={`h-[32px] px-[12px] rounded-[8px] text-[13px] border cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-forth text-white border-forth'
                  : 'bg-newBgColorInner text-textColor border-newTableBorder hover:bg-tableBorder'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-[12px] items-end bg-newBgColorInner border border-newTableBorder rounded-[8px] p-[12px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">{t('from', 'From')}</div>
          <input
            type="date"
            value={fromInput}
            max={toInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor"
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">{t('to', 'To')}</div>
          <input
            type="date"
            value={toInput}
            min={fromInput}
            max={today()}
            onChange={(e) => setToInput(e.target.value)}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor"
          />
        </div>
        <Button
          onClick={() => setRange({ from: fromInput, to: toInput })}
          disabled={!fromInput || !toInput || fromInput > toInput}
        >
          {t('apply', 'Apply')}
        </Button>

        <label
          className="flex items-center gap-[6px] text-[13px] cursor-pointer h-[38px]"
          title={t(
            'unknown_errors_only_tooltip',
            'Only count errors whose message matches "message":"Unknown Error" (affects the error stats only)'
          )}
        >
          <input
            type="checkbox"
            checked={unknownOnly}
            onChange={(e) => setUnknownOnly(e.target.checked)}
          />
          {t('unknown_errors_only', 'Unknown errors only')}
        </label>
      </div>

      {isLoading ? (
        <LoadingComponent />
      ) : error || !data ? (
        <div className="text-red-400">{t('failed_to_load_stats', 'Failed to load stats.')}</div>
      ) : (
        <div className="overflow-x-auto pb-[8px] scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor flex flex-col gap-[16px]">
          <div className="flex gap-[12px]">
            <div className="flex-1 min-w-[220px] shrink-0">
              <SummaryCard
                label={t('total_posts_published', 'Total posts published')}
                value={data.posts.total}
              />
            </div>
            <div className="flex-1 min-w-[220px] shrink-0">
              <SummaryCard
                label={t('total_connected_accounts', 'Total connected accounts')}
                value={data.connected.total}
              />
            </div>
            <div className="flex-1 min-w-[220px] shrink-0">
              <SummaryCard
                label={
                  unknownOnly
                    ? t('total_unknown_errors', 'Total unknown errors')
                    : t('total_errors', 'Total errors')
                }
                value={data.errors.total}
              />
            </div>
            {data.publishingChannels && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label={t(
                    'unique_channels_published_all_platforms',
                    'Unique channels - published (all platforms combined)'
                  )}
                  value={data.publishingChannels.total}
                />
              </div>
            )}
            {data.scheduledChannels && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label={t(
                    'unique_channels_scheduled_all_platforms',
                    'Unique channels - scheduled (all platforms combined)'
                  )}
                  value={data.scheduledChannels.total}
                />
              </div>
            )}
            {data.publishingAccounts && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label={t(
                    'unique_users_published_all_platforms',
                    'Unique users - published (all platforms combined)'
                  )}
                  value={data.publishingAccounts.total}
                />
              </div>
            )}
            {data.scheduledAccounts && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <SummaryCard
                  label={t(
                    'unique_users_scheduled_all_platforms',
                    'Unique users - scheduled (all platforms combined)'
                  )}
                  value={data.scheduledAccounts.total}
                />
              </div>
            )}
          </div>

          <div className="flex gap-[12px] items-start">
            <div className="flex-1 min-w-[220px] shrink-0">
              <PerSocialTable
                title={t('posts_published_per_social', 'Posts published per social')}
                block={data.posts}
              />
            </div>
            <div className="flex-1 min-w-[220px] shrink-0">
              <PerSocialTable
                title={t('connected_accounts_per_social', 'Connected accounts per social')}
                block={data.connected}
              />
            </div>
            <div className="flex-1 min-w-[220px] shrink-0">
              <PerSocialTable
                title={
                  unknownOnly
                    ? t('unknown_errors_per_social', 'Unknown errors per social')
                    : t('errors_per_social', 'Errors per social')
                }
                block={data.errors}
              />
            </div>
            {data.publishingChannels && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title={t('unique_channels_published', 'Unique channels - published')}
                  block={data.publishingChannels}
                />
              </div>
            )}
            {data.scheduledChannels && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title={t('unique_channels_scheduled', 'Unique channels - scheduled')}
                  block={data.scheduledChannels}
                />
              </div>
            )}
            {data.publishingAccounts && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title={t('unique_users_published', 'Unique users - published')}
                  block={data.publishingAccounts}
                />
              </div>
            )}
            {data.scheduledAccounts && (
              <div className="flex-1 min-w-[220px] shrink-0">
                <PerSocialTable
                  title={t('unique_users_scheduled', 'Unique users - scheduled')}
                  block={data.scheduledAccounts}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
