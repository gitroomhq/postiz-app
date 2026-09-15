import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { AnalyticsCardsGhost } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import {
  analyticsHasActivity,
  analyticsResponseIsFailure,
  analyticsResponseNeedsRefresh,
} from './analytics-activity';

interface AnalyticsDataItem {
  label: string;
  data: Array<{ total: number; date: string }>;
  average?: boolean;
  hint?: string;
}

const AnalyticsCard: FC<{
  item: AnalyticsDataItem;
  total: string | number;
  index: number;
  compact?: boolean;
  active?: boolean;
  onSelect?: () => void;
}> = ({ item, total, index, compact, active, onSelect }) => {
  const colorVariants = ['purple', 'green', 'amber'] as const;
  const color = colorVariants[index % colorVariants.length];
  const hasDataPoints = item.data.length >= 1;
  const inner = (
    <>
      <div className="flex items-center gap-[9px] px-[17px] pt-[15px]">
        <span className="min-w-0 flex-1 truncate text-[12px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
          {item.label}
        </span>
      </div>
      {hasDataPoints ? (
        <>
          <div className="px-[17px] pt-[10px]">
            <div className="text-[28px] font-[600] leading-[1.1] tracking-tight text-pqText">
              {total}
            </div>
          </div>
          <div className="px-[12px] pb-[12px] pt-[8px]">
            <div
              className={clsx('relative', compact ? 'h-[48px]' : 'h-[100px]')}
            >
              <ChartSocial
                data={item.data}
                color={color === 'amber' ? 'blue' : color}
                variant="spark"
                label={item.label}
                key={`chart-${index}-${compact ? 's' : 'm'}`}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-[16px] py-[32px]">
          <div className="text-[36px] font-[600] leading-[1.1] tracking-tight">
            {total}
          </div>
        </div>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={clsx(
          'flex flex-col overflow-hidden rounded-pqMd bg-pqPop text-start shadow-[inset_0_0_0_1px_var(--border)] transition-[box-shadow]',
          active
            ? 'shadow-[inset_0_0_0_1px_var(--brand),var(--e2)]'
            : 'hover:shadow-[inset_0_0_0_1px_var(--brand),var(--e2)]',
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] transition-[box-shadow] hover:shadow-[inset_0_0_0_1px_var(--brand),var(--e2)]">
      {inner}
    </div>
  );
};

const AnalyticsChartBoard: FC<{
  rows: AnalyticsDataItem[];
  totals: Array<string | number>;
  hint?: string;
}> = ({ rows, totals, hint }) => {
  const t = useT();
  const [active, setActive] = useState(0);
  const safe = rows.length ? Math.min(active, rows.length - 1) : 0;
  const item = rows[safe];
  const colorVariants = ['purple', 'green', 'amber'] as const;
  const color = colorVariants[safe % colorVariants.length];

  if (!item) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[13px]">
      <div
        className={clsx(
          'grid grid-cols-2 gap-[10px]',
          rows.length >= 4
            ? 'lg:grid-cols-4'
            : rows.length > 2
              ? 'lg:grid-cols-3'
              : 'lg:grid-cols-2',
        )}
      >
        {rows.map((row, index) => (
          <AnalyticsCard
            key={row.label}
            item={row}
            total={totals[index]}
            index={index}
            compact
            active={index === safe}
            onSelect={() => setActive(index)}
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex items-center gap-[9px] px-[17px] pt-[15px] pb-[2px]">
          <span className="min-w-0 flex-1 truncate text-[12px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
            {item.data.length > 2
              ? `${t('daily', 'Daily')} ${item.label.toLowerCase()}`
              : item.label}
          </span>
        </div>
        {item.hint || hint ? (
          <div className="px-[17px] pb-[2px] text-[12px] text-pqMuted">
            {item.hint || hint}
          </div>
        ) : null}
        <div className="px-[12px] pb-[16px] pt-[8px]">
          <div className="relative h-[260px]">
            <ChartSocial
              data={item.data}
              color={color === 'amber' ? 'blue' : color}
              variant="hero"
              label={item.label}
              key={`hero-${item.label}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsPaneMessage: FC<{
  icon: ReactNode;
  iconClassName: string;
  children: ReactNode;
}> = ({ icon, iconClassName, children }) => (
  <div className="col-span-full flex flex-col items-center justify-center rounded-pqMd bg-pqPop px-[24px] py-[48px] shadow-[inset_0_0_0_1px_var(--border)]">
    <div
      className={clsx(
        'mb-[16px] flex h-[48px] w-[48px] items-center justify-center rounded-full',
        iconClassName,
      )}
    >
      {icon}
    </div>
    {children}
  </div>
);

const RefreshChannelState: FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const t = useT();

  return (
    <AnalyticsPaneMessage
      iconClassName="bg-pqBrandSoft"
      icon={
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-pqBrand"
        >
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path d="M12 8v4l2 2" />
        </svg>
      }
    >
      <p className="mb-[12px] text-center text-[15px] text-pqText">
        {t(
          'this_channel_needs_to_be_refreshed',
          'This channel needs to be refreshed to display analytics',
        )}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-[6px] rounded-[8px] bg-pqBrand px-[16px] py-[8px] text-[14px] font-medium text-pqOnBrand transition-colors hover:bg-pqBrandHover"
      >
        {t('refresh_channel', 'Refresh Channel')}
      </button>
    </AnalyticsPaneMessage>
  );
};

const NoPeriodDataState: FC = () => {
  const t = useT();

  return (
    <AnalyticsPaneMessage
      iconClassName="bg-pqSettings"
      icon={
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-pqMuted"
        >
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
      }
    >
      <p className="text-center text-[15px] text-pqText">
        {t('no_data_in_this_period', 'No data in this period')}
      </p>
    </AnalyticsPaneMessage>
  );
};

const AnalyticsLoadFailedState: FC<{ onRetry: () => void }> = ({
  onRetry,
}) => {
  const t = useT();
  return (
    <AnalyticsPaneMessage
      iconClassName="bg-pqWarnSoft"
      icon={
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-pqWarn"
        >
          <path d="M12 8v5M12 17h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      }
    >
      <p className="mb-[12px] text-center text-[15px] text-pqText">
        {t('analytics_load_failed', 'Could not load analytics')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-[8px] bg-pqSettings px-[16px] py-[8px] text-[14px] font-medium text-pqText transition-colors hover:bg-pqHover"
      >
        {t('try_again', 'Try again')}
      </button>
    </AnalyticsPaneMessage>
  );
};

type AnalyticsIntegration = {
  id: string;
  identifier: string;
  internalId?: string;
  refreshNeeded?: boolean;
};

export const RenderAnalytics: FC<{
  integration: AnalyticsIntegration;
  date: number;
}> = (props) => {
  const { integration, date } = props;
  const t = useT();
  const fetch = useFetch();

  const load = useCallback(async () => {
    const response = await fetch(
      `/analytics/${integration.id}?date=${date}`,
    );
    const body = await response.json();
    if (analyticsResponseIsFailure(response.ok, body)) {
      throw new Error('Could not load analytics');
    }
    return body;
  }, [fetch, integration.id, date]);

  // `isLoading` and not a flag set inside the fetcher: that flag flipped false
  // before the unawaited `.json()` had parsed, and it flipped true again on
  // every revalidation, so the whole grid was replaced by a ghost each refetch.
  const { data, isLoading, error, mutate } = useSWR(
    `/analytics-${integration?.id}-${date}`,
    load,
    {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
      // Deliberately NOT `keepPreviousData`. It is the right trade when a key
      // varies by presentation — a page number, a range — but this key carries
      // `integration.id`, the entity itself. With laggy data on, clicking a
      // channel painted the previous channel's cards under the new channel's
      // name and @handle (the header two components up reads
      // `currentIntegration`, which switches immediately). Wrong numbers under
      // the right name is worse than a ghost.
    },
  );

  const toast = useToaster();

  const refreshChannel = useCallback(
    (integrationData: AnalyticsIntegration) => async () => {
      const { url } = await (
        await fetch(
          `/integrations/social/${integrationData.identifier}?refresh=${integrationData.internalId}`,
          {
            method: 'GET',
          },
        )
      ).json();

      if (!url) {
        toast.show(
          t(
            'could_not_connect_platform',
            'Could not connect to the platform, please try again later',
          ),
          'warning',
        );
        return;
      }

      window.location.href = url;
    },
    [fetch, t, toast],
  );

  // One narrowing for the whole component. `customFetch` resolves a 4xx too, so
  // `data` can be `{ message, statusCode }` — `.map` on that is a render crash,
  // and guarding only the memo left the JSX below to do it anyway.
  // `integration.refreshNeeded` is a posting flag (Error on a calendar row).
  // It must not steal the analytics pane: a channel can fail to publish and
  // still have a quiet, valid insights week — that is "No data in this period".
  const rows: AnalyticsDataItem[] = Array.isArray(data) ? data : [];
  const needsRefresh = !isLoading && analyticsResponseNeedsRefresh(data);
  const noPeriodData =
    !error && !needsRefresh && !analyticsHasActivity(rows);

  const totals = useMemo(() => {
    return rows.map((p: AnalyticsDataItem) => {
      const value =
        (p?.data.reduce(
          (acc: number, curr: { total: number }) => acc + Number(curr.total),
          0,
        ) || 0) / (p.average ? p.data.length : 1);
      if (p.average) {
        return value.toFixed(2) + '%';
      }
      return new Intl.NumberFormat().format(Math.round(value));
    });
  }, [rows]);

  // Cards only — the channel rail and the range pills belong to the parent and
  // are already on screen, so a ghost that redraws them doubles them up. A
  // channel or range change is new content, so ghosting on it is correct.
  if (isLoading) {
    return (
      <div role="status" aria-busy="true" aria-label={t('loading', 'Loading')}>
        <AnalyticsCardsGhost pills={false} />
      </div>
    );
  }

  // Only the analytics endpoint saying the token is dead. Empty series is
  // "no activity", not a reconnect.
  if (needsRefresh) {
    return <RefreshChannelState onRefresh={refreshChannel(integration)} />;
  }

  if (error) {
    return <AnalyticsLoadFailedState onRetry={() => void mutate()} />;
  }

  if (noPeriodData) {
    return <NoPeriodDataState />;
  }

  return <AnalyticsChartBoard rows={rows} totals={totals} />;
};
