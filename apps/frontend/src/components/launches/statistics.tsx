import React, { FC, Fragment, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { MissingReleaseModal } from '@gitroom/frontend/components/launches/missing-release.modal';
import clsx from 'clsx';

interface AnalyticsData {
  label: string;
  data: Array<{ total: number | string; date: string }>;
  percentageChange: number;
  average?: boolean;
}

const RANGE_KEYS = [7, 30, 90] as const;

function latestTotal(series: AnalyticsData) {
  const points = series.data || [];
  if (!points.length) {
    return 0;
  }
  if (series.average) {
    const sum = points.reduce(
      (acc, point) => acc + Number(point.total),
      0,
    );
    return `${(sum / points.length).toFixed(2)}%`;
  }
  return Math.round(Number(points[points.length - 1].total));
}

export const StatisticsModal: FC<{
  postId: string;
}> = (props) => {
  const { postId } = props;
  const t = useT();
  const fetch = useFetch();
  const [dateRange, setDateRange] = useState(7);

  const loadStatistics = useCallback(async () => {
    return (await fetch(`/posts/${postId}/statistics`)).json();
  }, [postId, fetch]);

  const loadPostAnalytics = useCallback(async () => {
    return (await fetch(`/analytics/post/${postId}?date=${dateRange}`)).json();
  }, [postId, dateRange, fetch]);

  const { data: statisticsData, isLoading: isLoadingStatistics } = useSWR(
    `/posts/${postId}/statistics`,
    loadStatistics,
  );

  const {
    data: analyticsData,
    isLoading: isLoadingAnalytics,
    mutate: mutateAnalytics,
  } = useSWR(`/analytics/post/${postId}?date=${dateRange}`, loadPostAnalytics, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    keepPreviousData: true,
  });

  const isMissing =
    analyticsData && !Array.isArray(analyticsData) && analyticsData.missing;

  const totals = useMemo(() => {
    if (!analyticsData || !Array.isArray(analyticsData)) return [];
    return analyticsData.map((series: AnalyticsData) => latestTotal(series));
  }, [analyticsData]);

  const isLoading =
    (isLoadingStatistics && !statisticsData) ||
    (isLoadingAnalytics && !analyticsData);

  const clicks = statisticsData?.clicks || [];

  return (
    <div className="relative min-h-[200px]">
      {isLoading ? (
        <div className="flex items-center justify-center py-[40px]">
          <LoadingComponent />
        </div>
      ) : isMissing ? (
        <MissingReleaseModal
          postId={postId}
          onSuccess={() => mutateAnalytics()}
        />
      ) : (
        <div className="flex flex-col gap-[22px]">
          {analyticsData &&
            Array.isArray(analyticsData) &&
            analyticsData.length > 0 && (
              <div className="flex flex-col gap-[14px]">
                <div className="flex flex-wrap items-center justify-between gap-[12px]">
                  <h3 className="font-display text-[16px] font-[600] text-pqText">
                    {t('post_analytics', 'Post Analytics')}
                  </h3>
                  <div className="flex shrink-0 items-center gap-[3px] rounded-pqSm bg-pqSettings p-[3px]">
                    {RANGE_KEYS.map((key) => {
                      const active = dateRange === key;
                      const short =
                        key === 7
                          ? t('range_7d', '7d')
                          : key === 30
                            ? t('range_30d', '30d')
                            : t('range_90d', '90d');
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDateRange(key)}
                          className={clsx(
                            'h-[32px] rounded-[8px] px-[15px] text-[13.5px] transition-colors',
                            active
                              ? 'bg-pqInner font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--border)]'
                              : 'font-[500] text-pqMuted hover:text-pqText',
                          )}
                        >
                          {short}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
                  {analyticsData.map((series: AnalyticsData, index: number) => {
                    const colorVariants = ['purple', 'green', 'blue'] as const;
                    const color = colorVariants[index % colorVariants.length];
                    const hasLine = (series.data || []).length >= 1;
                    return (
                      <div
                        key={`analytics-${series.label}-${index}`}
                        className="flex flex-col overflow-visible rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]"
                      >
                        <div className="flex items-center gap-[10px] px-[16px] pt-[14px]">
                          <span
                            className={clsx(
                              'size-[8px] shrink-0 rounded-full',
                              color === 'purple' && 'bg-pqBrand',
                              color === 'green' && 'bg-pqOk',
                              color === 'blue' && 'bg-[var(--chartBlue)]',
                            )}
                          />
                          <span className="min-w-0 truncate text-[13px] font-[600] text-pqSoft">
                            {series.label}
                          </span>
                        </div>
                        <div className="px-[16px] pt-[8px]">
                          <div className="text-[28px] font-[600] leading-[1.1] tracking-tight text-pqText">
                            {totals[index]}
                          </div>
                        </div>
                        {hasLine ? (
                          <div className="px-[12px] pb-[12px] pt-[8px]">
                            <div className="relative h-[88px] overflow-visible">
                              <ChartSocial
                                data={series.data.map((point) => ({
                                  date: point.date,
                                  total: Number(point.total),
                                }))}
                                color={color}
                                variant="spark"
                                label={series.label}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="px-[16px] pb-[16px] pt-[8px] text-[13px] text-pqMuted">
                            {t('no_data_in_this_period', 'No data in this period')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          <div className="flex flex-col gap-[14px]">
            <h3 className="font-display text-[16px] font-[600] text-pqText">
              {t('short_links_statistics', 'Short Links Statistics')}
            </h3>
            {clicks.length === 0 ? (
              <div className="rounded-pqMd bg-pqSettings px-[20px] py-[28px] text-center shadow-[inset_0_0_0_1px_var(--border)]">
                <div className="text-[14px] font-[600] text-pqText">
                  {t('no_short_link_results', 'No short link results')}
                </div>
                <div className="mt-[6px] text-[13px] text-pqMuted">
                  {t(
                    'no_short_link_results_hint',
                    'This post has no tracked short links.',
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-pqMd shadow-[inset_0_0_0_1px_var(--border)]">
                <div className="grid grid-cols-3 bg-pqSettings text-[12px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
                  <div className="px-[12px] py-[10px]">
                    {t('short_link', 'Short Link')}
                  </div>
                  <div className="px-[12px] py-[10px]">
                    {t('original_link', 'Original Link')}
                  </div>
                  <div className="px-[12px] py-[10px]">
                    {t('clicks', 'Clicks')}
                  </div>
                </div>
                {clicks.map((row: { short: string; original: string; clicks: number }) => (
                  <Fragment key={row.short}>
                    <div className="grid grid-cols-3 border-t border-pqLine text-[13px] text-pqText">
                      <div className="truncate px-[12px] py-[10px]">{row.short}</div>
                      <div className="truncate px-[12px] py-[10px]">
                        {row.original}
                      </div>
                      <div className="px-[12px] py-[10px]">{row.clicks}</div>
                    </div>
                  </Fragment>
                ))}
              </div>
            )}
          </div>

          {(!analyticsData ||
            !Array.isArray(analyticsData) ||
            analyticsData.length === 0) &&
            clicks.length === 0 && (
              <div className="rounded-pqMd bg-pqSettings px-[20px] py-[28px] text-center text-[14px] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)]">
                {t(
                  'no_statistics_available',
                  'No statistics available for this post',
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
};
