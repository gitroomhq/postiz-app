import { FC, ReactNode, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { AnalyticsCardsGhost } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';
import { analyticsHasActivity } from './analytics-activity';

interface AnalyticsDataItem {
  label: string;
  data: Array<{ total: number; date: string }>;
  average?: boolean;
  percentageChange?: number;
}

const TrendIndicator: FC<{ value: number; average?: boolean }> = ({
  value,
  average,
}) => {
  if (value === 0) return null;

  const isPositive = value > 0;
  const displayValue = Math.abs(value).toFixed(1);

  return (
    <span
      className={clsx(
        'flex h-[23px] shrink-0 items-center gap-[4px] rounded-full pe-[9px] ps-[7px] text-[12.5px] font-[600]',
        isPositive ? 'bg-pqOkSoft text-pqOk' : 'bg-pqWarnSoft text-pqWarn'
      )}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        className={isPositive ? '' : 'rotate-180'}
      >
        <path d="M6 2.5L10 7.5H2L6 2.5Z" fill="currentColor" />
      </svg>
      <span>
        {displayValue}
        {average ? 'pp' : '%'}
      </span>
    </span>
  );
};

const AnalyticsCard: FC<{
  item: AnalyticsDataItem;
  total: string | number;
  index: number;
}> = ({ item, total, index }) => {
  const colorVariants = ['purple', 'green', 'amber'] as const;
  const color = colorVariants[index % colorVariants.length];
  const hasDataPoints = item.data.length >= 1;

  return (
    <div className="flex flex-col overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] transition-[box-shadow] hover:shadow-[inset_0_0_0_1px_var(--brand),var(--e2)]">
      <div className="flex items-center gap-[9px] px-[17px] pt-[15px]">
        <span className="min-w-0 flex-1 truncate text-[12px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
          {item.label}
        </span>
        {item.percentageChange !== undefined && (
          <TrendIndicator
            value={item.percentageChange}
            average={item.average}
          />
        )}
      </div>
      {hasDataPoints ? (
        <>
          <div className="px-[17px] pt-[10px]">
            <div className="text-[28px] font-[600] leading-[1.1] tracking-tight text-pqText">
              {total}
            </div>
          </div>
          <div className="px-[12px] pb-[12px] pt-[8px]">
            <div className="relative h-[100px]">
              <ChartSocial
                data={item.data}
                color={color === 'amber' ? 'blue' : color}
                key={`chart-${index}`}
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
        iconClassName
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
          'This channel needs to be refreshed to display analytics'
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
    return (await fetch(`/analytics/${integration.id}?date=${date}`)).json();
  }, [integration, date]);

  // `isLoading` and not a flag set inside the fetcher: that flag flipped false
  // before the unawaited `.json()` had parsed, and it flipped true again on
  // every revalidation, so the whole grid was replaced by a ghost each refetch.
  const { data, isLoading } = useSWR(
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
    }
  );

  const toast = useToaster();

  const refreshChannel = useCallback(
    (integrationData: AnalyticsIntegration) => async () => {
      const { url } = await (
        await fetch(
          `/integrations/social/${integrationData.identifier}?refresh=${integrationData.internalId}`,
          {
            method: 'GET',
          }
        )
      ).json();

      if (!url) {
        toast.show(
          'Could not connect to the platform, please try again later',
          'warning'
        );
        return;
      }

      window.location.href = url;
    },
    [fetch, toast]
  );

  // One narrowing for the whole component. `customFetch` resolves a 4xx too, so
  // `data` can be `{ message, statusCode }` — `.map` on that is a render crash,
  // and guarding only the memo left the JSX below to do it anyway.
  const rows: AnalyticsDataItem[] = Array.isArray(data) ? data : [];
  const failed = !isLoading && !Array.isArray(data);
  const needsRefresh = failed || !!integration.refreshNeeded;
  const noPeriodData = !needsRefresh && !analyticsHasActivity(rows);

  const totals = useMemo(() => {
    return rows.map((p: AnalyticsDataItem) => {
      const value =
        (p?.data.reduce(
          (acc: number, curr: { total: number }) => acc + Number(curr.total),
          0
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

  // A 4xx body, a thrown JSON parse, or a channel already flagged
  // refreshNeeded. Empty series is not this — that is "no activity".
  if (needsRefresh) {
    return <RefreshChannelState onRefresh={refreshChannel(integration)} />;
  }

  if (noPeriodData) {
    return <NoPeriodDataState />;
  }

  return (
    <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((item: AnalyticsDataItem, index: number) => (
        <AnalyticsCard
          key={`analytics-${index}`}
          item={item}
          total={totals[index]}
          index={index}
        />
      ))}
    </div>
  );
};
