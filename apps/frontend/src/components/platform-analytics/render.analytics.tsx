import { FC, useCallback, useMemo, useState } from 'react';
import { Integration } from '@prisma/client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { BarChart } from '@mui/x-charts/BarChart';

export const RenderAnalytics: FC<{ integration: Integration; date: number }> = (
  props
) => {
  const { integration, date } = props;
  const [loading, setLoading] = useState(true);

  const fetch = useFetch();

  const getDaysParam = useCallback((date: number) => {
    if (date <= 7) return '7';
    if (date <= 30) return '30';
    return '90';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/report/instagram/community?businessId=${
          integration.internalId
        }&days=${getDaysParam(date)}`
      );
      const data = await response.json();

      // Get the most recent data point (last item in the array)
      const latestData = data.chart[data.chart.length - 1];

      const transformedData = [
        {
          label: 'Followers',
          data: data.chart.map((item: any) => ({
            date: item.date,
            total: item.followers,
          })),
          average: false,
          latestValue: latestData.followers,
        },
        {
          label: 'Following',
          data: data.chart.map((item: any) => ({
            date: item.date,
            total: item.following,
          })),
          average: false,
          latestValue: latestData.following,
        },
        {
          label: 'Total Content',
          data: data.chart.map((item: any) => ({
            date: item.date,
            total: item.totalContent,
          })),
          average: false,
          latestValue: latestData.totalContent,
        },
      ];

      return {
        chartData: transformedData,
        rawData: data.chart,
        tableData: data.table, // Include table data from API
      };
    } catch (error) {
      console.error('Error loading analytics:', error);
      return { chartData: [], rawData: [], tableData: null };
    } finally {
      setLoading(false);
    }
  }, [integration, date, getDaysParam]);

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
    (integration: Integration & { identifier: string }) => async () => {
      const { url } = await (
        await fetch(
          `/integrations/social/${integration.identifier}?customerId=${integration.customerId}&refresh=${integration.internalId}`,
          {
            method: 'GET',
          }
        )
      ).json();

      window.location.href = url;
    },
    []
  );

  // Modified total calculation to use the latest value instead of summing/averaging
  const total = useMemo(() => {
    return data?.chartData?.map((p: any) => {
      // Return the latest value directly
      return p.latestValue;
    });
  }, [data]);

  // Prepare data for the table from API response
  const tableData = useMemo(() => {
    if (!data?.tableData) return null;

    return {
      months: data.tableData.Data,
      followers: data.tableData.Followers,
      following: data.tableData.Following,
      totalContent: data.tableData.TotalContent,
      growth: data.tableData.Growth,
    };
  }, [data]);

  // Static data for the bar chart
  const barChartData = useMemo(() => {
    return {
      series: [
        { data: [35, 44, 24, 34], label: 'Posts' },
        { data: [51, 6, 49, 30], label: 'Reels' },
        { data: [15, 25, 30, 50], label: 'Stories' },
      ],
      xAxis: [{ scaleType: 'band', data: ['Jan', 'Feb', 'Mar', 'Apr'] }],
    };
  }, []);

  if (loading) {
    return (
      <>
        <LoadingComponent />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="grid grid-cols-3 gap-[20px]">
        {data?.chartData?.length === 0 && (
          <div>
            This channel needs to be refreshed,{' '}
            <div
              className="underline hover:font-bold cursor-pointer"
              onClick={refreshChannel(integration as any)}
            >
              click here to refresh
            </div>
          </div>
        )}
        {data?.chartData?.map((p: any, index: number) => (
          <div key={`pl-${index}`} className="flex">
            <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
              <div className="flex items-center gap-[14px]">
                <div className="text-[20px]">{p.label}</div>
              </div>
              <div className="flex-1">
                <div className="h-[156px] relative">
                  <ChartSocial {...p} key={`p-${index}`} />
                </div>
              </div>
              <div className="text-[50px] leading-[60px]">
                {(total ?? [])[index]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Community Table */}
      {tableData && (
        <div className="bg-secondary p-[16px]">
          <h2 className="text-[20px] mb-[16px]">Community</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="pb-[8px]">Data</th>
                  {tableData.months
                    .slice(0, -1)
                    .map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  <th className="pb-[8px]">
                    {tableData.months[tableData.months.length - 1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-[8px]">Followers</td>
                  {tableData.followers
                    .slice(0, -1)
                    .map((value: string, index: number) => (
                      <td key={`followers-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  <td className="py-[8px]">
                    {tableData.followers[tableData.followers.length - 1]}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-[8px]">Following</td>
                  {tableData.following
                    .slice(0, -1)
                    .map((value: string, index: number) => (
                      <td key={`following-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  <td className="py-[8px]">
                    {tableData.following[tableData.following.length - 1]}
                  </td>
                </tr>
                <tr>
                  <td className="py-[8px] font-bold">Total Content</td>
                  {tableData.totalContent
                    .slice(0, -1)
                    .map((value: string, index: number) => (
                      <td
                        key={`content-${index}`}
                        className="py-[8px] font-bold"
                      >
                        {value}
                      </td>
                    ))}
                  <td className="py-[8px] font-bold">
                    {tableData.totalContent[tableData.totalContent.length - 1]}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {tableData.growth && (
            <div className="mt-[12px] text-sm">Growth: {tableData.growth}</div>
          )}
        </div>
      )}
    </div>
  );
};
