import { FC, useCallback, useMemo, useState } from 'react';
import { Integration } from '@prisma/client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const RenderAnalytics: FC<{
  integration: Integration;
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
  const refreshChannel = useCallback(
    (
        integration: Integration & {
          identifier: string;
        }
      ) =>
      async () => {
        const { url } = await (
          await fetch(
            `/integrations/social/${integration.identifier}?refresh=${integration.internalId}`,
            {
              method: 'GET',
            }
          )
        ).json();
        window.location.href = url;
      },
    []
  );

  const t = useT();

  const total = useMemo(() => {
    return data?.map((p: any) => {
      const value =
        (p?.data.reduce((acc: number, curr: any) => acc + curr.total, 0) || 0) /
        (p.average ? p.data.length : 1);
      if (p.average) {
        return value.toFixed(2) + '%';
      }
      return value;
    });
  }, [data]);
  if (loading) {
    return (
      <>
        <LoadingComponent />
      </>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[12px] md:gap-[16px] lg:gap-[20px]">
      {data?.length === 0 && (
        <div className="text-[12px] md:text-[14px]">
          {t(
            'this_channel_needs_to_be_refreshed',
            'This channel needs to be refreshed,'
          )}
          <div
            className="underline hover:font-bold cursor-pointer"
            onClick={refreshChannel(integration as any)}
          >
            {t('click_here_to_refresh', 'click here to refresh')}
          </div>
        </div>
      )}
      {data?.map((p: any, index: number) => (
        <div key={`pl-${index}`} className="flex">
          <div className="flex-1 bg-newTableHeader rounded-[8px] py-[8px] md:py-[10px] px-[12px] md:px-[16px] gap-[8px] md:gap-[10px] flex flex-col">
            <div className="flex items-center gap-[10px] md:gap-[14px]">
              <div className="text-[14px] md:text-[18px] lg:text-[20px] font-[500]">{p.label}</div>
            </div>
            <div className="flex-1">
              <div className="h-[120px] md:h-[140px] lg:h-[156px] relative">
                <ChartSocial {...p} key={`p-${index}`} />
              </div>
            </div>
            <div className="text-[28px] md:text-[36px] lg:text-[50px] leading-[32px] md:leading-[40px] lg:leading-[60px] font-[600]">{total[index]}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
