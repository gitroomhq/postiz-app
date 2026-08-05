import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import clsx from 'clsx';

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

const EmptyState: FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const t = useT();

  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-pqMd bg-pqPop px-[24px] py-[48px] shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="mb-[16px] flex h-[48px] w-[48px] items-center justify-center rounded-full bg-pqBrandSoft">
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
      </div>
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
    </div>
  );
};

type AnalyticsIntegration = {
  id: string;
  identifier: string;
  internalId?: string;
};

export const RenderAnalytics: FC<{
  integration: AnalyticsIntegration;
  date: number;
}> = (props) => {
  const { integration, date } = props;
  const [loading, setLoading] = useState(true);
  const fetch = useFetch();

  const load = useCallback(async () => {
    setLoading(true);
    const load = (
      await fetch(`/analytics/${integration.id}?date=${date}`)
    ).json();
    setLoading(false);
    return load;
  }, [integration, date]);

  const { data } = useSWR(`/analytics-${integration?.id}-${date}`, load, {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    revalidateOnMount: true,
  });

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

  const totals = useMemo(() => {
    return data?.map((p: AnalyticsDataItem) => {
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
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-[48px]">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 lg:grid-cols-3">
      {data?.length === 0 && (
        <EmptyState onRefresh={refreshChannel(integration)} />
      )}
      {data?.map((item: AnalyticsDataItem, index: number) => (
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
