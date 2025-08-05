import { FC, useCallback, useMemo, useState } from 'react';
import { Integration } from '@prisma/client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type IntegrationWithIdentifier = Integration & {
  identifier: string;
};

export const RenderAnalytics: FC<{ integration: IntegrationWithIdentifier; date: number }> = (
  props
) => {
  const { integration, date } = props;
  const fetch = useFetch();

  const getDaysParam = useCallback((date: number) => {
    if (date <= 7) return '7';
    if (date <= 30) return '30';
    return '90';
  }, []);

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

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
    maintainAspectRatio: false,
  };

  // ==================== FACEBOOK COMPONENT ====================
  if (integration.identifier === 'facebook') {
    const [loading, setLoading] = useState(true);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<any>(null);
    const fetch = useFetch();

    const getDaysParam = useCallback((date: number) => {
      if (date <= 7) return '7';
      if (date <= 30) return '30';
      return '90';
    }, []);

    const loadCommunity = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/report/facebook/community?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          likes: 0,
          followers: 0,
          totalContent: 0
        };

        const chartData = data?.chart || [defaultChartItem];
        const latestData = chartData[chartData.length - 1] || defaultChartItem;

        const transformedData = [
          {
            label: 'Likes',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.likes || 0,
            })),
            average: false,
            latestValue: latestData.likes || 0,
          },
          {
            label: 'Followers',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.followers || 0,
            })),
            average: false,
            latestValue: latestData.followers || 0,
          },
          {
            label: 'Total Content',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.totalContent || 0,
            })),
            average: false,
            latestValue: latestData.totalContent || 0,
          },
        ];

        return {
          chartData: transformedData,
          rawData: chartData,
          tableData: data?.table || {
            Data: ['No data', 'No data'],
            Likes: ['0', '0%'],
            Followers: ['0', '0%'],
            TotalContent: ['0', '0%'],
            Growth: "+0 New Followers"
          },
        };
      } catch (error) {
        console.error('Error loading community analytics:', error);
        return {
          chartData: [],
          rawData: [],
          tableData: {
            Data: ['No data', 'No data'],
            Likes: ['0', '0%'],
            Followers: ['0', '0%'],
            TotalContent: ['0', '0%'],
            Growth: "+0 New Followers"
          }
        };
      } finally {
        setLoading(false);
      }
    }, [integration, date, getDaysParam, fetch]);

    const loadOverview = useCallback(async () => {
      setOverviewLoading(true);
      try {
        const response = await fetch(
          `/report/facebook/overview?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          impressions: 0,
          pageViews: 0,
          totalContent: 0
        };

        setOverviewData({
          chart: data?.chart || [defaultChartItem],
          table: data?.table || {
            Data: ['No data', 'No data'],
            Impressions: ['0', '0%'],
            PageViews: ['0', '0%'],
            TotalContent: ['0', '0%']
          }
        });
      } catch (error) {
        console.error('Error loading overview analytics:', error);
        setOverviewData({
          chart: [{
            date: new Date().toISOString(),
            impressions: 0,
            pageViews: 0,
            totalContent: 0
          }],
          table: {
            Data: ['No data', 'No data'],
            Impressions: ['0', '0%'],
            PageViews: ['0', '0%'],
            TotalContent: ['0', '0%']
          }
        });
      } finally {
        setOverviewLoading(false);
      }
    }, [integration, date, getDaysParam, fetch]);

    const { data } = useSWR(`/facebook-analytics-${integration?.id}-${date}`, loadCommunity, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/facebook-overview-${integration?.id}-${date}`, loadOverview, {
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
      [fetch]
    );

    const total = useMemo(() => {
      return data?.chartData?.map((p: any) => p.latestValue) || [0, 0, 0];
    }, [data]);

    const communityTableData = useMemo(() => {
      if (!data?.tableData) return {
        months: ['No data', 'No data'],
        likes: ['0', '0%'],
        followers: ['0', '0%'],
        totalContent: ['0', '0%'],
        growth: "+0 New Followers"
      };

      return {
        months: data.tableData.Data || ['No data', 'No data'],
        likes: data.tableData.Likes || ['0', '0%'],
        followers: data.tableData.Followers || ['0', '0%'],
        totalContent: data.tableData.TotalContent || ['0', '0%'],
        growth: data.tableData.Growth || "+0 New Followers"
      };
    }, [data]);

    const overviewTableData = useMemo(() => {
      if (!overviewData?.table) return {
        months: ['No data', 'No data'],
        impressions: ['0', '0%'],
        pageViews: ['0', '0%'],
        totalContent: ['0', '0%']
      };

      return {
        months: overviewData.table.Data || ['No data', 'No data'],
        impressions: overviewData.table.Impressions || ['0', '0%'],
        pageViews: overviewData.table.PageViews || ['0', '0%'],
        totalContent: overviewData.table.TotalContent || ['0', '0%']
      };
    }, [overviewData]);

    const pageGrowthBarChartData = useMemo(() => {
      const rawData = data?.rawData || [];
      const chartData = rawData.slice(-date); // Changed from -14 to -date

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Likes',
            data: chartData.map((item: any) => item.likes || 0),
            backgroundColor: 'rgba(59, 89, 152, 0.6)',
            borderColor: 'rgba(59, 89, 152, 1)',
            borderWidth: 1,
          },
          {
            label: 'Followers',
            data: chartData.map((item: any) => item.followers || 0),
            backgroundColor: 'rgba(12, 143, 125, 0.6)',
            borderColor: 'rgb(16, 96, 133)',
            borderWidth: 1,
          }
        ],
      };
    }, [data?.rawData, date]);

    const impressionsBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-date); // Changed from -14 to -date

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Impressions',
            data: chartData.map((item: any) => item.impressions || 0),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
          {
            label: 'Page Visits',
            data: chartData.map((item: any) => item.pageViews || 0),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [overviewData?.chart, date]);

    const barChartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            boxWidth: 12,
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
      maintainAspectRatio: false,
    };

    if (loading || overviewLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Main Metrics Cards */}
        <div className="grid grid-cols-3 gap-[20px]">
          {(!data || data.chartData?.length === 0) ? (
            <div className="col-span-3">
              This channel needs to be refreshed,{' '}
              <div
                className="underline hover:font-bold cursor-pointer"
                onClick={refreshChannel(integration as any)}
              >
                click here to refresh
              </div>
            </div>
          ) : (
            data?.chartData?.map((p: any, index: number) => (
              <div key={`pl-${index}`} className="flex">
                <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                  <div className="flex items-center gap-[14px]">
                    <div className="text-[20px]">{p.label}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-[156px] relative">
                      {p.data.length > 0 ? (
                        <ChartSocial {...p} key={`p-${index}`} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[50px] leading-[60px]">
                    {total[index]}
                    {index < 2 && (
                      <span className="text-green-500 text-[20px] ml-2">↑</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Page Growth Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Page Growth Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Facebook Page Growth</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {communityTableData.months.map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Likes</td>
                    {communityTableData.likes.map((value: string, index: number) => (
                      <td key={`likes-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Followers</td>
                    {communityTableData.followers.map((value: string, index: number) => (
                      <td key={`followers-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Impressions</td>
                    {overviewTableData.impressions.map((value: string, index: number) => (
                      <td key={`impressions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Page Visits</td>
                    {overviewTableData.pageViews.map((value: string, index: number) => (
                      <td key={`pageViews-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Content</td>
                    {communityTableData.totalContent.map((value: string, index: number) => (
                      <td key={`content-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-[12px] text-sm">{communityTableData.growth}</div>
          </div>

          {/* Page Growth Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Page Growth</h2>
            <div className="h-[200px] relative">
              {pageGrowthBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={pageGrowthBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.likes || 0}
                  {data?.rawData?.[data.rawData?.length - 1]?.likes >
                    data?.rawData?.[data.rawData?.length - 2]?.likes && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Likes</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.followers || 0}
                  {data?.rawData?.[data.rawData?.length - 1]?.followers >
                    data?.rawData?.[data.rawData?.length - 2]?.followers && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Followers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.totalContent || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Content</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Overview Section */}
          <h2 className="text-[20px] mb-[16px]">Page Overview</h2>
          <div className="bg-secondary p-[16px]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {overviewTableData.months.map((month: string, index: number) => (
                      <th key={`overview-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Impressions</td>
                    {overviewTableData.impressions.map((value: string, index: number) => (
                      <td key={`impressions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Page Visits</td>
                    {overviewTableData.pageViews.map((value: string, index: number) => (
                      <td key={`pageViews-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Content</td>
                    {overviewTableData.totalContent.map((value: string, index: number) => (
                      <td key={`overview-content-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Impressions Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Impressions & Page Visits</h2>
            <div className="h-[200px] relative">
              {impressionsBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={impressionsBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions || 0}
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions >
                    overviewData?.chart?.[overviewData.chart?.length - 2]?.impressions && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Impressions</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.pageViews || 0}
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.pageViews >
                    overviewData?.chart?.[overviewData.chart?.length - 2]?.pageViews && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Page Visits</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.totalContent || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Content</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== INSTAGRAM COMPONENT ====================
  if (integration.identifier === 'instagram') {
    const [loading, setLoading] = useState(true);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<any>(null);

    const loadCommunity = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/report/instagram/community?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          followers: 0,
          following: 0,
          totalContent: 0
        };

        const chartData = data?.chart || [defaultChartItem];
        const latestData = chartData[chartData.length - 1] || defaultChartItem;

        const transformedData = [
          {
            label: 'Followers',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.followers || 0,
            })),
            average: false,
            latestValue: latestData.followers || 0,
          },
          {
            label: 'Following',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.following || 0,
            })),
            average: false,
            latestValue: latestData.following || 0,
          },
          {
            label: 'Total Content',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.totalContent || 0,
            })),
            average: false,
            latestValue: latestData.totalContent || 0,
          },
        ];

        return {
          chartData: transformedData,
          rawData: chartData,
          tableData: data?.table || {
            Data: ['No data', 'No data'],
            Followers: ['0', '0%'],
            Following: ['0', '0%'],
            TotalContent: ['0', '0%'],
            Growth: "+0 New Followers"
          },
        };
      } catch (error) {
        console.error('Error loading community analytics:', error);
        return {
          chartData: [],
          rawData: [],
          tableData: {
            Data: ['No data', 'No data'],
            Followers: ['0', '0%'],
            Following: ['0', '0%'],
            TotalContent: ['0', '0%'],
            Growth: "+0 New Followers"
          }
        };
      } finally {
        setLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadOverview = useCallback(async () => {
      setOverviewLoading(true);
      try {
        const response = await fetch(
          `/report/instagram/overview?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          impressions: 0,
          avgReachPerDay: 0,
          totalContent: 0
        };

        setOverviewData({
          chart: data?.chart || [defaultChartItem],
          table: data?.table || {
            Data: ['No data', 'No data'],
            Impressions: ['0', '0%'],
            AvgReachPerDay: ['0', '0%'],
            TotalContent: ['0', '0%']
          }
        });
      } catch (error) {
        console.error('Error loading overview analytics:', error);
        setOverviewData({
          chart: [{
            date: new Date().toISOString(),
            impressions: 0,
            avgReachPerDay: 0,
            totalContent: 0
          }],
          table: {
            Data: ['No data', 'No data'],
            Impressions: ['0', '0%'],
            AvgReachPerDay: ['0', '0%'],
            TotalContent: ['0', '0%']
          }
        });
      } finally {
        setOverviewLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const { data } = useSWR(`/analytics-${integration?.id}-${date}`, loadCommunity, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/overview-${integration?.id}-${date}`, loadOverview, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    const total = useMemo(() => {
      return data?.chartData?.map((p: any) => p.latestValue) || [0, 0, 0];
    }, [data]);

    const communityTableData = useMemo(() => {
      if (!data?.tableData) return {
        months: ['No data', 'No data'],
        followers: ['0', '0%'],
        following: ['0', '0%'],
        totalContent: ['0', '0%'],
        growth: "+0 New Followers"
      };

      return {
        months: data.tableData.Data || ['No data', 'No data'],
        followers: data.tableData.Followers || ['0', '0%'],
        following: data.tableData.Following || ['0', '0%'],
        totalContent: data.tableData.TotalContent || ['0', '0%'],
        growth: data.tableData.Growth || "+0 New Followers"
      };
    }, [data]);

    const overviewTableData = useMemo(() => {
      if (!overviewData?.table) return {
        months: ['No data', 'No data'],
        impressions: ['0', '0%'],
        avgReachPerDay: ['0', '0%'],
        totalContent: ['0', '0%']
      };

      return {
        months: overviewData.table.Data || ['No data', 'No data'],
        impressions: overviewData.table.Impressions || ['0', '0%'],
        avgReachPerDay: overviewData.table.AvgReachPerDay || ['0', '0%'],
        totalContent: overviewData.table.TotalContent || ['0', '0%']
      };
    }, [overviewData]);

    const followersBarChartData = useMemo(() => {
      const rawData = data?.rawData || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Followers',
            data: chartData.map((item: any) => item.followers || 0),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Following',
            data: chartData.map((item: any) => item.following || 0),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [data?.rawData]);

    const impressionsBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Impressions',
            data: chartData.map((item: any) => item.impressions || 0),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
          {
            label: 'Avg Reach',
            data: chartData.map((item: any) => item.avgReachPerDay || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [overviewData?.chart]);

    if (loading || overviewLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Main Metrics Cards */}
        <div className="grid grid-cols-3 gap-[20px]">
          {(!data || data.chartData?.length === 0) ? (
            <div className="col-span-3">
              This channel needs to be refreshed,{' '}
              <div
                className="underline hover:font-bold cursor-pointer"
                onClick={refreshChannel(integration as any)}
              >
                click here to refresh
              </div>
            </div>
          ) : (
            data?.chartData?.map((p: any, index: number) => (
              <div key={`pl-${index}`} className="flex">
                <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                  <div className="flex items-center gap-[14px]">
                    <div className="text-[20px]">{p.label}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-[156px] relative">
                      {p.data.length > 0 ? (
                        <ChartSocial {...p} key={`p-${index}`} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[50px] leading-[60px]">
                    {total[index]}
                    {index < 2 && (
                      <span className="text-green-500 text-[20px] ml-2">↑</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Community Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Community Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {communityTableData.months.map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Followers</td>
                    {communityTableData.followers.map((value: string, index: number) => (
                      <td key={`followers-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Following</td>
                    {communityTableData.following.map((value: string, index: number) => (
                      <td key={`following-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Content</td>
                    {communityTableData.totalContent.map((value: string, index: number) => (
                      <td key={`content-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-[12px] text-sm">Growth: {communityTableData.growth}</div>
          </div>

          {/* Community Growth Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community Growth</h2>
            <div className="h-[200px] relative">
              {followersBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={followersBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.followers || 0}
                  {data?.rawData?.[data.rawData?.length - 1]?.followers >
                    data?.rawData?.[data.rawData?.length - 2]?.followers && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Followers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.following || 0}
                </div>
                <div className="text-[14px] text-gray-400">Following</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.totalContent || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Content</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Overview Table */}
          <h2 className="text-[20px] mb-[16px]">Overview</h2>
          <div className="bg-secondary p-[16px]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {overviewTableData.months.map((month: string, index: number) => (
                      <th key={`overview-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Impressions</td>
                    {overviewTableData.impressions.map((value: string, index: number) => (
                      <td key={`impressions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Avg Reach Per Day</td>
                    {overviewTableData.avgReachPerDay.map((value: string, index: number) => (
                      <td key={`reach-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Content</td>
                    {overviewTableData.totalContent.map((value: string, index: number) => (
                      <td key={`overview-content-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Impressions Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Impressions & Reach</h2>
            <div className="h-[200px] relative">
              {impressionsBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={impressionsBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions || 0}
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions >
                    overviewData?.chart?.[overviewData.chart?.length - 2]?.impressions && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Impressions</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.avgReachPerDay || 0}
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.avgReachPerDay >
                    overviewData?.chart?.[overviewData.chart?.length - 2]?.avgReachPerDay && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Avg Reach</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.totalContent || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Content</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== LINKEDIN COMPONENT ====================
  if (integration.identifier === 'linkedin') {
    const [loading, setLoading] = useState(true);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<any>(null);

    const loadCommunity = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/report/linkedin/community?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          followers: 0,
          paidFollowers: 0,
          postsCount: 0
        };

        const chartData = data?.chart || [defaultChartItem];
        const latestData = chartData[chartData.length - 1] || defaultChartItem;

        const transformedData = [
          {
            label: 'Followers',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.followers || 0,
            })),
            average: false,
            latestValue: latestData.followers || 0,
          },
          {
            label: 'Paid Followers',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.paidFollowers || 0,
            })),
            average: false,
            latestValue: latestData.paidFollowers || 0,
          },
          {
            label: 'Total Posts',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.postsCount || 0,
            })),
            average: false,
            latestValue: latestData.postsCount || 0,
          },
        ];

        return {
          chartData: transformedData,
          rawData: chartData,
          tableData: data?.table || {
            Data: ['No data', 'No data'],
            Followers: ['0', '0%'],
            'Paid Followers': ['0', '0%'],
            Posts: ['0', '0%'],
            Growth: "+0 New Followers"
          },
        };
      } catch (error) {
        console.error('Error loading community analytics:', error);
        return {
          chartData: [],
          rawData: [],
          tableData: {
            Data: ['No data', 'No data'],
            Followers: ['0', '0%'],
            'Paid Followers': ['0', '0%'],
            Posts: ['0', '0%'],
            Growth: "+0 New Followers"
          }
        };
      } finally {
        setLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadOverview = useCallback(async () => {
      setOverviewLoading(true);
      try {
        const response = await fetch(
          `/report/linkedin/overview?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          impressions: 0,
          postsCount: 0
        };

        setOverviewData({
          chart: data?.chart || [defaultChartItem],
          table: data?.table || {
            Data: ['No data', 'No data'],
            Impressions: ['0', '0%'],
            Posts: ['0', '0%']
          }
        });
      } catch (error) {
        console.error('Error loading overview analytics:', error);
        setOverviewData({
          chart: [{
            date: new Date().toISOString(),
            impressions: 0,
            postsCount: 0
          }],
          table: {
            Data: ['No data', 'No data'],
            Impressions: ['0', '0%'],
            Posts: ['0', '0%']
          }
        });
      } finally {
        setOverviewLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const { data } = useSWR(`/linkedin-analytics-${integration?.id}-${date}`, loadCommunity, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/linkedin-overview-${integration?.id}-${date}`, loadOverview, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    const total = useMemo(() => {
      return data?.chartData?.map((p: any) => p.latestValue) || [0, 0, 0];
    }, [data]);

    const communityTableData = useMemo(() => {
      if (!data?.tableData) return {
        months: ['No data', 'No data'],
        followers: ['0', '0%'],
        paidFollowers: ['0', '0%'],
        posts: ['0', '0%'],
        growth: "+0 New Followers"
      };

      return {
        months: data.tableData.Data || ['No data', 'No data'],
        followers: data.tableData.Followers || ['0', '0%'],
        paidFollowers: data.tableData['Paid Followers'] || ['0', '0%'],
        posts: data.tableData.Posts || ['0', '0%'],
        growth: data.tableData.Growth || "+0 New Followers"
      };
    }, [data]);

    const overviewTableData = useMemo(() => {
      if (!overviewData?.table) return {
        months: ['No data', 'No data'],
        impressions: ['0', '0%'],
        posts: ['0', '0%']
      };

      return {
        months: overviewData.table.Data || ['No data', 'No data'],
        impressions: overviewData.table.Impressions || ['0', '0%'],
        posts: overviewData.table.Posts || ['0', '0%']
      };
    }, [overviewData]);

    const followersBarChartData = useMemo(() => {
      const rawData = data?.rawData || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Followers',
            data: chartData.map((item: any) => item.followers || 0),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Paid Followers',
            data: chartData.map((item: any) => item.paidFollowers || 0),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [data?.rawData]);

    const impressionsBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Impressions',
            data: chartData.map((item: any) => item.impressions || 0),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [overviewData?.chart]);

    if (loading || overviewLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Main Metrics Cards */}
        <div className="grid grid-cols-3 gap-[20px]">
          {(!data || data.chartData?.length === 0) ? (
            <div className="col-span-3">
              This channel needs to be refreshed,{' '}
              <div
                className="underline hover:font-bold cursor-pointer"
                onClick={refreshChannel(integration as any)}
              >
                click here to refresh
              </div>
            </div>
          ) : (
            data?.chartData?.map((p: any, index: number) => (
              <div key={`pl-${index}`} className="flex">
                <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                  <div className="flex items-center gap-[14px]">
                    <div className="text-[20px]">{p.label}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-[156px] relative">
                      {p.data.length > 0 ? (
                        <ChartSocial {...p} key={`p-${index}`} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[50px] leading-[60px]">
                    {total[index]}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Community Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Community Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {communityTableData.months.map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Followers</td>
                    {communityTableData.followers.map((value: string, index: number) => (
                      <td key={`followers-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Paid Followers</td>
                    {communityTableData.paidFollowers.map((value: string, index: number) => (
                      <td key={`paid-followers-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Posts</td>
                    {communityTableData.posts.map((value: string, index: number) => (
                      <td key={`posts-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-[12px] text-sm">Growth: {communityTableData.growth}</div>
          </div>

          {/* Community Growth Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community Growth</h2>
            <div className="h-[200px] relative">
              {followersBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={followersBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.followers || 0}
                  {data?.rawData?.[data.rawData?.length - 1]?.followers >
                    data?.rawData?.[data.rawData?.length - 2]?.followers && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Followers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.paidFollowers || 0}
                </div>
                <div className="text-[14px] text-gray-400">Paid Followers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.postsCount || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Posts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Overview Table */}
          <h2 className="text-[20px] mb-[16px]">Overview</h2>
          <div className="bg-secondary p-[16px]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {overviewTableData.months.map((month: string, index: number) => (
                      <th key={`overview-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Impressions</td>
                    {overviewTableData.impressions.map((value: string, index: number) => (
                      <td key={`impressions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Posts</td>
                    {overviewTableData.posts.map((value: string, index: number) => (
                      <td key={`overview-posts-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Impressions Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Impressions</h2>
            <div className="h-[200px] relative">
              {impressionsBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={impressionsBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-2 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions || 0}
                </div>
                <div className="text-[14px] text-gray-400">Impressions</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.postsCount || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== X (TWITTER) COMPONENT ====================
  if (integration.identifier === 'x') {
    const [loading, setLoading] = useState(true);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<any>(null);

    const loadCommunity = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/report/x/community?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          followers: 0,
          following: 0,
          totalContent: 0
        };

        const chartData = data?.chart || [defaultChartItem];
        const latestData = chartData[chartData.length - 1] || defaultChartItem;

        const transformedData = [
          {
            label: 'Followers',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.followers || 0,
            })),
            average: false,
            latestValue: latestData.followers || 0,
          },
          {
            label: 'Following',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.following || 0,
            })),
            average: false,
            latestValue: latestData.following || 0,
          },
          {
            label: 'Total Posts',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.totalContent || 0,
            })),
            average: false,
            latestValue: latestData.totalContent || 0,
          },
        ];

        return {
          chartData: transformedData,
          rawData: chartData,
          tableData: data?.table || {
            Data: ['No data', 'No data'],
            Followers: ['0', '0%'],
            Following: ['0', '0%'],
            TotalContent: ['0', '0%'],
            Growth: "+0 New Followers"
          },
        };
      } catch (error) {
        console.error('Error loading X community analytics:', error);
        return {
          chartData: [],
          rawData: [],
          tableData: {
            Data: ['No data', 'No data'],
            Followers: ['0', '0%'],
            Following: ['0', '0%'],
            TotalContent: ['0', '0%'],
            Growth: "+0 New Followers"
          }
        };
      } finally {
        setLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadOverview = useCallback(async () => {
      setOverviewLoading(true);
      try {
        const response = await fetch(
          `/report/x/overview?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          engagement: 0,
          impressions: 0,
          interactions: 0,
          totalContent: 0
        };

        setOverviewData({
          chart: data?.chart || [defaultChartItem],
          table: data?.table || {
            Data: ['No data', 'No data'],
            Engagement: ['0', '0%'],
            Impressions: ['0', '0%'],
            Interactions: ['0', '0%'],
            TotalContent: ['0', '0%']
          }
        });
      } catch (error) {
        console.error('Error loading X overview analytics:', error);
        setOverviewData({
          chart: [{
            date: new Date().toISOString(),
            engagement: 0,
            impressions: 0,
            interactions: 0,
            totalContent: 0
          }],
          table: {
            Data: ['No data', 'No data'],
            Engagement: ['0', '0%'],
            Impressions: ['0', '0%'],
            Interactions: ['0', '0%'],
            TotalContent: ['0', '0%']
          }
        });
      } finally {
        setOverviewLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const { data } = useSWR(`/x-analytics-${integration?.id}-${date}`, loadCommunity, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/x-overview-${integration?.id}-${date}`, loadOverview, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    const total = useMemo(() => {
      return data?.chartData?.map((p: any) => p.latestValue) || [0, 0, 0];
    }, [data]);

    const communityTableData = useMemo(() => {
      if (!data?.tableData) return {
        months: ['No data', 'No data'],
        followers: ['0', '0%'],
        following: ['0', '0%'],
        totalContent: ['0', '0%'],
        growth: "+0 New Followers"
      };

      return {
        months: data.tableData.Data || ['No data', 'No data'],
        followers: data.tableData.Followers || ['0', '0%'],
        following: data.tableData.Following || ['0', '0%'],
        totalContent: data.tableData.TotalContent || ['0', '0%'],
        growth: data.tableData.Growth || "+0 New Followers"
      };
    }, [data]);

    const overviewTableData = useMemo(() => {
      if (!overviewData?.table) return {
        months: ['No data', 'No data'],
        engagement: ['0', '0%'],
        impressions: ['0', '0%'],
        interactions: ['0', '0%'],
        totalContent: ['0', '0%']
      };

      return {
        months: overviewData.table.Data || ['No data', 'No data'],
        engagement: overviewData.table.Engagement || ['0', '0%'],
        impressions: overviewData.table.Impressions || ['0', '0%'],
        interactions: overviewData.table.Interactions || ['0', '0%'],
        totalContent: overviewData.table.TotalContent || ['0', '0%']
      };
    }, [overviewData]);

    const followersBarChartData = useMemo(() => {
      const rawData = data?.rawData || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Followers',
            data: chartData.map((item: any) => item.followers || 0),
            backgroundColor: 'rgba(29, 161, 242, 0.6)',
            borderColor: 'rgba(29, 161, 242, 1)',
            borderWidth: 1,
          },
          {
            label: 'Following',
            data: chartData.map((item: any) => item.following || 0),
            backgroundColor: 'rgba(196, 181, 253, 0.6)', // 💜 Light purple (semi-transparent)
            borderColor: 'rgba(196, 181, 253, 1)',       // 💜 Light purple (solid)
            borderWidth: 1,
          }
        ],
      };
    }, [data?.rawData]);

    const engagementBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Engagement Rate',
            data: chartData.map((item: any) => item.engagement || 0),
            backgroundColor: 'rgba(255, 173, 31, 0.6)',
            borderColor: 'rgba(255, 173, 31, 1)',
            borderWidth: 1,
          },
          {
            label: 'Impressions',
            data: chartData.map((item: any) => item.impressions || 0),
            backgroundColor: 'rgba(23, 191, 99, 0.6)',
            borderColor: 'rgba(23, 191, 99, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [overviewData?.chart]);

    if (loading || overviewLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Main Metrics Cards */}
        <div className="grid grid-cols-3 gap-[20px]">
          {(!data || data.chartData?.length === 0) ? (
            <div className="col-span-3">
              This channel needs to be refreshed,{' '}
              <div
                className="underline hover:font-bold cursor-pointer"
                onClick={refreshChannel(integration as any)}
              >
                click here to refresh
              </div>
            </div>
          ) : (
            data?.chartData?.map((p: any, index: number) => (
              <div key={`pl-${index}`} className="flex">
                <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                  <div className="flex items-center gap-[14px]">
                    <div className="text-[20px]">{p.label}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-[156px] relative">
                      {p.data.length > 0 ? (
                        <ChartSocial {...p} key={`p-${index}`} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[50px] leading-[60px]">
                    {total[index]}
                    {index < 2 && (
                      <span className="text-green-500 text-[20px] ml-2">↑</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Community Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Community Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {communityTableData.months.map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Followers</td>
                    {communityTableData.followers.map((value: string, index: number) => (
                      <td key={`followers-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Following</td>
                    {communityTableData.following.map((value: string, index: number) => (
                      <td key={`following-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Posts</td>
                    {communityTableData.totalContent.map((value: string, index: number) => (
                      <td key={`content-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-[12px] text-sm">Growth: {communityTableData.growth}</div>
          </div>

          {/* Community Growth Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community Growth</h2>
            <div className="h-[200px] relative">
              {followersBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={followersBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.followers || 0}
                  {communityTableData.followers[0]?.includes('↑') && (
                    <span className="text-green-500 text-[14px] ml-2">↑</span>
                  )}
                </div>
                <div className="text-[14px] text-gray-400">Followers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.following || 0}
                </div>
                <div className="text-[14px] text-gray-400">Following</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data?.rawData?.length - 1]?.totalContent || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Posts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Overview Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Post Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {overviewTableData.months.map((month: string, index: number) => (
                      <th key={`overview-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Engagement Rate</td>
                    {overviewTableData.engagement.map((value: string, index: number) => (
                      <td key={`engagement-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Impressions</td>
                    {overviewTableData.impressions.map((value: string, index: number) => (
                      <td key={`impressions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Interactions</td>
                    {overviewTableData.interactions.map((value: string, index: number) => (
                      <td key={`interactions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Posts</td>
                    {overviewTableData.totalContent.map((value: string, index: number) => (
                      <td key={`overview-content-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Engagement Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Engagement & Impressions</h2>
            <div className="h-[200px] relative">
              {engagementBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={engagementBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.engagement?.toFixed(2) || 0}%
                </div>
                <div className="text-[14px] text-gray-400">Engagement</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions || 0}
                </div>
                <div className="text-[14px] text-gray-400">Impressions</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.interactions || 0}
                </div>
                <div className="text-[14px] text-gray-400">Interactions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== GBP COMPONENT ====================
  if (integration.identifier === 'gbp') {
    const [performanceLoading, setPerformanceLoading] = useState(true);
    const [engagementLoading, setEngagementLoading] = useState(true);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [engagementData, setEngagementData] = useState<any>(null);
    const [reviewsData, setReviewsData] = useState<any>(null);

    const loadPerformance = useCallback(async () => {
      setPerformanceLoading(true);
      try {
        const response = await fetch(
          `/report/gbp/performance?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();
        setPerformanceData(data);
      } catch (error) {
        console.error('Error loading performance analytics:', error);
        setPerformanceData(null);
      } finally {
        setPerformanceLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadEngagement = useCallback(async () => {
      setEngagementLoading(true);
      try {
        const response = await fetch(
          `/report/gbp/engagement?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();
        setEngagementData(data);
      } catch (error) {
        console.error('Error loading engagement analytics:', error);
        setEngagementData(null);
      } finally {
        setEngagementLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadReviews = useCallback(async () => {
      setReviewsLoading(true);
      try {
        const response = await fetch(
          `/report/gbp/reviews?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();
        setReviewsData(data);
      } catch (error) {
        console.error('Error loading reviews analytics:', error);
        setReviewsData(null);
      } finally {
        setReviewsLoading(false);
      }
    }, [integration, date, getDaysParam]);

    useSWR(`/gbp-performance-${integration?.id}-${date}`, loadPerformance, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/gbp-engagement-${integration?.id}-${date}`, loadEngagement, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/gbp-reviews-${integration?.id}-${date}`, loadReviews, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    const performanceChartData = useMemo(() => {
      if (!performanceData?.chart) return [];

      const latestData = performanceData.chart[performanceData.chart.length - 1];

      return [
        {
          label: 'Google Maps',
          data: performanceData.chart.map((item: any) => ({
            date: item.date,
            total: item.maps,
          })),
          average: false,
          latestValue: latestData?.maps || 0,
        },
        {
          label: 'Google Search',
          data: performanceData.chart.map((item: any) => ({
            date: item.date,
            total: item.search,
          })),
          average: false,
          latestValue: latestData?.search || 0,
        },
        {
          label: 'Total',
          data: performanceData.chart.map((item: any) => ({
            date: item.date,
            total: item.total,
          })),
          average: false,
          latestValue: latestData?.total || 0,
        },
      ];
    }, [performanceData]);

    const engagementChartData = useMemo(() => {
      if (!engagementData?.chart) return [];

      const latestData = engagementData.chart[engagementData.chart.length - 1];

      return [
        {
          label: 'Website Clicks',
          data: engagementData.chart.map((item: any) => ({
            date: item.date,
            total: item.website,
          })),
          average: false,
          latestValue: latestData?.website || 0,
        },
        {
          label: 'Phone Clicks',
          data: engagementData.chart.map((item: any) => ({
            date: item.date,
            total: item.phone,
          })),
          average: false,
          latestValue: latestData?.phone || 0,
        },
        {
          label: 'Direction Clicks',
          data: engagementData.chart.map((item: any) => ({
            date: item.date,
            total: item.direction,
          })),
          average: false,
          latestValue: latestData?.direction || 0,
        },
      ];
    }, [engagementData]);

    const reviewsChartData = useMemo(() => {
      if (!reviewsData?.chart) return [];

      const latestData = reviewsData.chart[reviewsData.chart.length - 1];

      return [
        {
          label: 'Star Rating',
          data: reviewsData.chart.map((item: any) => ({
            date: item.date,
            total: item.rating,
          })),
          average: false,
          latestValue: latestData?.rating || 0,
        },
        {
          label: 'Total Reviews',
          data: reviewsData.chart.map((item: any) => ({
            date: item.date,
            total: item.reviews,
          })),
          average: false,
          latestValue: latestData?.reviews || 0,
        },
      ];
    }, [reviewsData]);

    const performanceTableData = useMemo(() => {
      if (!performanceData?.table) return null;

      return {
        months: performanceData.table.Data,
        googleMaps: performanceData.table['Google maps'],
        googleSearch: performanceData.table['Google search'],
        total: performanceData.table.Total,
      };
    }, [performanceData]);

    const engagementTableData = useMemo(() => {
      if (!engagementData?.table) return null;

      return {
        months: engagementData.table.Data,
        website: engagementData.table.Website,
        phone: engagementData.table.Phone,
        direction: engagementData.table.Direction,
        total: engagementData.table.Total,
      };
    }, [engagementData]);

    const reviewsTableData = useMemo(() => {
      if (!reviewsData?.table) return null;

      return {
        months: reviewsData.table.Data,
        starRating: reviewsData.table['Star Rating'],
        totalReview: reviewsData.table['Total Review'],
      };
    }, [reviewsData]);

    const performanceBarChartData = useMemo(() => {
      if (!performanceData?.chart) return null;

      const chartData = performanceData.chart.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Google Maps',
            data: chartData.map((item: any) => item.maps),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Google Search',
            data: chartData.map((item: any) => item.search),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          },
        ],
      };
    }, [performanceData?.chart]);

    const engagementBarChartData = useMemo(() => {
      if (!engagementData?.chart) return null;

      const chartData = engagementData.chart.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Website',
            data: chartData.map((item: any) => item.website),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: 'Phone',
            data: chartData.map((item: any) => item.phone),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          },
          {
            label: 'Direction',
            data: chartData.map((item: any) => item.direction),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
        ],
      };
    }, [engagementData?.chart]);

    const reviewsBarChartData = useMemo(() => {
      if (!reviewsData?.chart) return null;

      const chartData = reviewsData.chart.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Star Rating',
            data: chartData.map((item: any) => item.rating),
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            label: 'Total Reviews',
            data: chartData.map((item: any) => item.reviews),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
        ],
      };
    }, [reviewsData?.chart]);

    const reviewsBarChartOptions = {
      ...barChartOptions,
      scales: {
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          beginAtZero: false,
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          beginAtZero: true,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    };

    if (performanceLoading || engagementLoading || reviewsLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Performance Section */}
        <div className="grid grid-cols-3 gap-[20px]">
          {performanceChartData.length === 0 && (
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
          {performanceChartData.map((p: any, index: number) => (
            <div key={`performance-${index}`} className="flex">
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
                  {p.latestValue}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Table */}
        {performanceTableData && (
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {performanceTableData.months.map((month: string, index: number) => (
                      <th key={`performance-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Google Maps</td>
                    {performanceTableData.googleMaps.map((value: string, index: number) => (
                      <td key={`maps-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Google Search</td>
                    {performanceTableData.googleSearch.map((value: string, index: number) => (
                      <td key={`search-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total</td>
                    {performanceTableData.total.map((value: string, index: number) => (
                      <td
                        key={`total-${index}`}
                        className="py-[8px] font-bold"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Performance Bar Chart */}
        {performanceBarChartData && (
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Performance Trends</h2>
            <div className="h-[300px] relative">
              <Bar data={performanceBarChartData} options={barChartOptions} />
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {performanceData?.chart?.[performanceData.chart.length - 1]?.maps || 0}
                </div>
                <div className="text-[14px] text-gray-400">Google Maps</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {performanceData?.chart?.[performanceData.chart.length - 1]?.search || 0}
                </div>
                <div className="text-[14px] text-gray-400">Google Search</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {performanceData?.chart?.[performanceData.chart.length - 1]?.total || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total</div>
              </div>
            </div>
          </div>
        )}

        {/* Engagement Section */}
        <div className="grid grid-cols-3 gap-[20px]">
          {engagementChartData.map((p: any, index: number) => (
            <div key={`engagement-${index}`} className="flex">
              <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                <div className="flex items-center gap-[14px]">
                  <div className="text-[20px]">{p.label}</div>
                </div>
                <div className="flex-1">
                  <div className="h-[156px] relative">
                    <ChartSocial {...p} key={`e-${index}`} />
                  </div>
                </div>
                <div className="text-[50px] leading-[60px]">
                  {p.latestValue}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Engagement Table */}
        {engagementTableData && (
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Engagement</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {engagementTableData.months.map((month: string, index: number) => (
                      <th key={`engagement-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Website</td>
                    {engagementTableData.website.map((value: string, index: number) => (
                      <td key={`website-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Phone</td>
                    {engagementTableData.phone.map((value: string, index: number) => (
                      <td key={`phone-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Direction</td>
                    {engagementTableData.direction.map((value: string, index: number) => (
                      <td key={`direction-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total</td>
                    {engagementTableData.total.map((value: string, index: number) => (
                      <td
                        key={`engagement-total-${index}`}
                        className="py-[8px] font-bold"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Engagement Bar Chart */}
        {engagementBarChartData && (
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Engagement Trends</h2>
            <div className="h-[300px] relative">
              <Bar data={engagementBarChartData} options={barChartOptions} />
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {engagementData?.chart?.[engagementData.chart.length - 1]?.website || 0}
                </div>
                <div className="text-[14px] text-gray-400">Website</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {engagementData?.chart?.[engagementData.chart.length - 1]?.phone || 0}
                </div>
                <div className="text-[14px] text-gray-400">Phone</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {engagementData?.chart?.[engagementData.chart.length - 1]?.direction || 0}
                </div>
                <div className="text-[14px] text-gray-400">Direction</div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="grid grid-cols-2 gap-[20px]">
          {reviewsChartData.map((p: any, index: number) => (
            <div key={`reviews-${index}`} className="flex">
              <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                <div className="flex items-center gap-[14px]">
                  <div className="text-[20px]">{p.label}</div>
                </div>
                <div className="flex-1">
                  <div className="h-[156px] relative">
                    <ChartSocial {...p} key={`r-${index}`} />
                  </div>
                </div>
                <div className="text-[50px] leading-[60px]">
                  {p.latestValue}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reviews Table */}
        {reviewsTableData && (
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Reviews</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {reviewsTableData.months.map((month: string, index: number) => (
                      <th key={`reviews-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Star Rating</td>
                    {reviewsTableData.starRating.map((value: string, index: number) => (
                      <td key={`rating-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Review</td>
                    {reviewsTableData.totalReview.map((value: string, index: number) => (
                      <td
                        key={`total-review-${index}`}
                        className="py-[8px] font-bold"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews Bar Chart */}
        {reviewsBarChartData && (
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Reviews Trends</h2>
            <div className="h-[300px] relative">
              <Bar data={reviewsBarChartData} options={reviewsBarChartOptions} />
            </div>
            <div className="mt-[16px] grid grid-cols-2 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {reviewsData?.chart?.[reviewsData.chart.length - 1]?.rating || 0}
                </div>
                <div className="text-[14px] text-gray-400">Star Rating</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {reviewsData?.chart?.[reviewsData.chart.length - 1]?.reviews || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Reviews</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== YOUTUBE COMPONENT ====================
  if (integration.identifier === 'youtube') {
    const [loading, setLoading] = useState(true);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<any>(null);
    const [insightsData, setInsightsData] = useState<any>(null);

    // Add this date filtering helper function
    const filterInsightsByDateRange = (data: any[], days: number) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return data.filter(item => {
        const itemDate = new Date(item.month);
        return itemDate >= cutoffDate;
      });
    };

    const loadOverview = useCallback(async () => {
      setOverviewLoading(true);
      try {
        const response = await fetch(
          `/report/youtube/overview?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          subscribers: 0,
          totalViews: 0,
          totalVideos: 0
        };

        setOverviewData({
          chart: data?.chart || [defaultChartItem],
          table: data?.table || {
            Data: ['No data', 'No data'],
            Subscribers: ['0', '0%'],
            TotalViews: ['0', '0%'],
            TotalVideos: ['0', '0%']
          }
        });
      } catch (error) {
        console.error('Error loading YouTube overview analytics:', error);
        setOverviewData({
          chart: [{
            date: new Date().toISOString(),
            subscribers: 0,
            totalViews: 0,
            totalVideos: 0
          }],
          table: {
            Data: ['No data', 'No data'],
            Subscribers: ['0', '0%'],
            TotalViews: ['0', '0%'],
            TotalVideos: ['0', '0%']
          }
        });
      } finally {
        setOverviewLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadInsights = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/report/youtube/insights/list?businessId=${integration.internalId}`
        );
        const data = await response.json();

        if (!data || data.length === 0) {
          const currentMonth = new Date().toISOString().slice(0, 7);
          setInsightsData([{
            month: currentMonth,
            subscribers: 0,
            totalViews: 0,
            totalVideos: 0,
            totalLikes: 0,
            totalComments: 0
          }]);
        } else {
          setInsightsData(data);
        }
      } catch (error) {
        console.error('Error loading YouTube insights analytics:', error);
        const currentMonth = new Date().toISOString().slice(0, 7);
        setInsightsData([{
          month: currentMonth,
          subscribers: 0,
          totalViews: 0,
          totalVideos: 0,
          totalLikes: 0,
          totalComments: 0
        }]);
      } finally {
        setLoading(false);
      }
    }, [integration]);

    useSWR(`/youtube-overview-${integration?.id}-${date}`, loadOverview, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/youtube-insights-${integration?.id}`, loadInsights, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    const subscribersBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Subscribers',
            data: chartData.map((item: any) => item.subscribers || 0),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          },
        ],
      };
    }, [overviewData?.chart]);

    const viewsBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Views',
            data: chartData.map((item: any) => item.totalViews || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      };
    }, [overviewData?.chart]);

    const videosBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Videos',
            data: chartData.map((item: any) => item.totalVideos || 0),
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1,
          },
        ],
      };
    }, [overviewData?.chart]);

    const monthlyInsights = useMemo(() => {
      if (!insightsData) return [{
        month: new Date().toISOString().slice(0, 7),
        subscribers: 0,
        totalViews: 0,
        totalVideos: 0,
        totalLikes: 0,
        totalComments: 0
      }];

      // Apply date filtering to insights data
      const filteredData = filterInsightsByDateRange(insightsData, date);

      const monthlyData: Record<string, any> = {};

      filteredData.forEach((item: any) => {
        const month = item.month;
        monthlyData[month] = {
          subscribers: item.subscribers || 0,
          totalViews: item.totalViews || 0,
          totalVideos: item.totalVideos || 0,
          totalLikes: item.totalLikes || 0,
          totalComments: item.totalComments || 0,
        };
      });

      // Fallback if no data in filtered range
      if (Object.keys(monthlyData).length === 0) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        monthlyData[currentMonth] = {
          subscribers: 0,
          totalViews: 0,
          totalVideos: 0,
          totalLikes: 0,
          totalComments: 0
        };
      }

      return Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          ...data,
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    }, [insightsData, date]); // Add date to dependencies

    const insightsWithChanges = useMemo(() => {
      if (!monthlyInsights || monthlyInsights.length === 0) {
        return [{
          month: new Date().toISOString().slice(0, 7),
          subscribers: 0,
          totalViews: 0,
          totalVideos: 0,
          totalLikes: 0,
          totalComments: 0,
          changes: {
            subscribers: '0%',
            totalViews: '0%',
            totalVideos: '0%',
            totalLikes: '0%',
            totalComments: '0%'
          }
        }];
      }

      if (monthlyInsights.length < 2) {
        return [{
          ...monthlyInsights[0],
          changes: {
            subscribers: '0%',
            totalViews: '0%',
            totalVideos: '0%',
            totalLikes: '0%',
            totalComments: '0%'
          }
        }];
      }

      return monthlyInsights.map((item: any, index: number) => {
        if (index === 0) return {
          ...item, changes: {
            subscribers: '0%',
            totalViews: '0%',
            totalVideos: '0%',
            totalLikes: '0%',
            totalComments: '0%'
          }
        };

        const prevItem = monthlyInsights[index - 1];
        const changes = {
          subscribers: calculateChange(prevItem.subscribers, item.subscribers),
          totalViews: calculateChange(prevItem.totalViews, item.totalViews),
          totalVideos: calculateChange(prevItem.totalVideos, item.totalVideos),
          totalLikes: calculateChange(prevItem.totalLikes, item.totalLikes),
          totalComments: calculateChange(prevItem.totalComments, item.totalComments),
        };

        return { ...item, changes };
      });
    }, [monthlyInsights]);

    function calculateChange(prev: number, current: number): string {
      if (prev === 0) return '0%';
      const change = ((current - prev) / prev) * 100;
      return `${change.toFixed(2)}%`;
    }

    if (loading || overviewLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Overview Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Overview Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">YouTube Channel Overview(Last {date} days)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Metric</th>
                    {overviewData?.table?.Data?.map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    )) || (
                        <th className="pb-[8px]">No data</th>
                      )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Subscribers</td>
                    {overviewData?.table?.Subscribers?.map((value: string, index: number) => (
                      <td key={`subscribers-${index}`} className="py-[8px]">
                        {value || '0'}
                      </td>
                    )) || (
                        <td className="py-[8px]">0</td>
                      )}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Total Views</td>
                    {overviewData?.table?.TotalViews?.map((value: string, index: number) => (
                      <td key={`views-${index}`} className="py-[8px]">
                        {value || '0'}
                      </td>
                    )) || (
                        <td className="py-[8px]">0</td>
                      )}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Videos</td>
                    {overviewData?.table?.TotalVideos?.map((value: string, index: number) => (
                      <td key={`videos-${index}`} className="py-[8px] font-bold">
                        {value || '0'}
                      </td>
                    )) || (
                        <td className="py-[8px] font-bold">0</td>
                      )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Subscribers Growth Bar Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Subscribers Growth</h2>
            <div className="h-[200px] relative">
              {subscribersBarChartData?.labels?.length > 0 ? (
                <Bar data={subscribersBarChartData} options={barChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.subscribers || 0}
                </div>
                <div className="text-[14px] text-gray-400">Subscribers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.totalViews || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Views</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.totalVideos || 0}
                </div>
                <div className="text-[14px] text-gray-400">Total Videos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Insights Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">YouTube Post Performance (Last {date} days)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Metric</th>
                    {insightsWithChanges.map((item: any) => (
                      <th key={`month-header-${item.month}`} className="pb-[8px]">
                        {new Date(item.month).toLocaleString('default', { month: 'short' })}
                      </th>
                    ))}
                    <th className="pb-[8px]">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Subscribers</td>
                    {insightsWithChanges.map((item: any) => (
                      <td key={`subscribers-data-${item.month}`} className="py-[8px]">
                        {item.subscribers || 0}
                      </td>
                    ))}
                    <td className="py-[8px]">
                      {insightsWithChanges[insightsWithChanges.length - 1]?.changes?.subscribers || '0%'}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Video Views</td>
                    {insightsWithChanges.map((item: any) => (
                      <td key={`views-data-${item.month}`} className="py-[8px]">
                        {item.totalViews || 0}
                      </td>
                    ))}
                    <td className="py-[8px]">
                      {insightsWithChanges[insightsWithChanges.length - 1]?.changes?.totalViews || '0%'}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Likes</td>
                    {insightsWithChanges.map((item: any) => (
                      <td key={`likes-data-${item.month}`} className="py-[8px]">
                        {item.totalLikes || 0}
                      </td>
                    ))}
                    <td className="py-[8px]">
                      {insightsWithChanges[insightsWithChanges.length - 1]?.changes?.totalLikes || '0%'}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Comments</td>
                    {insightsWithChanges.map((item: any) => (
                      <td key={`comments-data-${item.month}`} className="py-[8px]">
                        {item.totalComments || 0}
                      </td>
                    ))}
                    <td className="py-[8px]">
                      {insightsWithChanges[insightsWithChanges.length - 1]?.changes?.totalComments || '0%'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Videos</td>
                    {insightsWithChanges.map((item: any) => (
                      <td key={`videos-data-${item.month}`} className="py-[8px] font-bold">
                        {item.totalVideos || 0}
                      </td>
                    ))}
                    <td className="py-[8px] font-bold">
                      {insightsWithChanges[insightsWithChanges.length - 1]?.changes?.totalVideos || '0%'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Views and Videos Charts */}
          <div className="grid grid-cols-2 gap-[20px]">
            <div className="bg-secondary p-[16px]">
              <h2 className="text-[20px] mb-[16px]">Video Views</h2>
              <div className="h-[200px] relative">
                {viewsBarChartData?.labels?.length > 0 ? (
                  <Bar data={viewsBarChartData} options={barChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    No data available
                  </div>
                )}
              </div>
            </div>
            <div className="bg-secondary p-[16px]">
              <h2 className="text-[20px] mb-[16px]">Videos Published</h2>
              <div className="h-[200px] relative">
                {videosBarChartData?.labels?.length > 0 ? (
                  <Bar data={videosBarChartData} options={barChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error state if completely no data */}
        {(!overviewData?.chart || overviewData.chart.length === 0) &&
          (!insightsData || insightsData.length === 0) && (
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
      </div>
    );
  }

  // ==================== WEBSITE COMPONENT ====================
  if (integration.identifier === 'website') {
    const [performanceLoading, setPerformanceLoading] = useState(true);
    const [locationsLoading, setLocationsLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [locationsData, setLocationsData] = useState<any>(null);

    const loadPerformance = useCallback(async () => {
      setPerformanceLoading(true);
      try {
        const response = await fetch(
          `/report/website/performance?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        const defaultChartItem = {
          date: new Date().toISOString(),
          pageViews: 0,
          visits: 0,
          visitors: 0,
          posts: 0,
          comments: 0
        };

        const chartData = data?.chart || [defaultChartItem];
        const latestData = chartData[chartData.length - 1] || defaultChartItem;

        const transformedData = [
          {
            label: 'Page Views',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.pageViews || 0,
            })),
            average: false,
            latestValue: latestData.pageViews || 0,
          },
          {
            label: 'Visits',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.visits || 0,
            })),
            average: false,
            latestValue: latestData.visits || 0,
          },
          {
            label: 'Visitors',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.visitors || 0,
            })),
            average: false,
            latestValue: latestData.visitors || 0,
          },
        ];

        setPerformanceData({
          chartData: transformedData,
          rawData: chartData,
          tableData: data?.table || {
            Data: ['No data', 'No data', 'No data'],
            'Page views': ['0', '0', '0%'],
            Visits: ['0', '0', '0%'],
            Visitors: ['0', '0', '0%'],
            Posts: ['0', '0', '0%'],
            Comments: ['0', '0', '0%']
          }
        });
      } catch (error) {
        console.error('Error loading performance analytics:', error);
        setPerformanceData({
          chartData: [],
          rawData: [],
          tableData: {
            Data: ['No data', 'No data', 'No data'],
            'Page views': ['0', '0', '0%'],
            Visits: ['0', '0', '0%'],
            Visitors: ['0', '0', '0%'],
            Posts: ['0', '0', '0%'],
            Comments: ['0', '0', '0%']
          }
        });
      } finally {
        setPerformanceLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadLocations = useCallback(async () => {
      setLocationsLoading(true);
      try {
        const response = await fetch(
          `/report/website/locations?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        setLocationsData({
          chart: data?.chart || [],
          table: data?.table || {
            Data: ['Data', 'No data', 'No data', 'No data', 'No data'],
            rows: [
              ['No data', '0', '0', '0%', '0%']
            ]
          }
        });
      } catch (error) {
        console.error('Error loading locations analytics:', error);
        setLocationsData({
          chart: [],
          table: {
            Data: ['Data', 'No data', 'No data', 'No data', 'No data'],
            rows: [
              ['No data', '0', '0', '0%', '0%']
            ]
          }
        });
      } finally {
        setLocationsLoading(false);
      }
    }, [integration, date, getDaysParam]);

    useSWR(`/website-performance-${integration?.id}-${date}`, loadPerformance, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/website-locations-${integration?.id}-${date}`, loadLocations, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    const total = useMemo(() => {
      return performanceData?.chartData?.map((p: any) => p.latestValue) || [0, 0, 0];
    }, [performanceData]);

    const performanceTableData = useMemo(() => {
      if (!performanceData?.tableData) return {
        months: ['No data', 'No data', 'No data'],
        pageViews: ['0', '0', '0%'],
        visits: ['0', '0', '0%'],
        visitors: ['0', '0', '0%'],
        posts: ['0', '0', '0%'],
        comments: ['0', '0', '0%']
      };

      return {
        months: performanceData.tableData.Data || ['No data', 'No data', 'No data'],
        pageViews: performanceData.tableData['Page views'] || ['0', '0', '0%'],
        visits: performanceData.tableData.Visits || ['0', '0', '0%'],
        visitors: performanceData.tableData.Visitors || ['0', '0', '0%'],
        posts: performanceData.tableData.Posts || ['0', '0', '0%'],
        comments: performanceData.tableData.Comments || ['0', '0', '0%']
      };
    }, [performanceData]);

    const locationsTableData = useMemo(() => {
      if (!locationsData?.table) return {
        headers: ['Data', 'No data', 'No data', 'No data', 'No data'],
        rows: [
          ['No data', '0', '0', '0%', '0%']
        ]
      };

      return {
        headers: locationsData.table.Data || ['Data', 'No data', 'No data', 'No data', 'No data'],
        rows: locationsData.table.rows || [
          ['No data', '0', '0', '0%', '0%']
        ]
      };
    }, [locationsData]);

    const performanceBarChartData = useMemo(() => {
      const rawData = performanceData?.rawData || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Page Views',
            data: chartData.map((item: any) => item.pageViews || 0),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Visits',
            data: chartData.map((item: any) => item.visits || 0),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          },
          {
            label: 'Visitors',
            data: chartData.map((item: any) => item.visitors || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [performanceData?.rawData]);

    const locationsPieChartData = useMemo(() => {
      const chartData = locationsData?.chart || [];

      const sortedData = [...chartData].sort((a, b) => b.visitors - a.visitors).slice(0, 5);

      const backgroundColors = [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
      ];

      return {
        labels: sortedData.map((item: any) => item.country),
        datasets: [
          {
            data: sortedData.map((item: any) => item.visitors),
            backgroundColor: backgroundColors.slice(0, sortedData.length),
            borderColor: backgroundColors.map(color => color.replace('0.6', '1')).slice(0, sortedData.length),
            borderWidth: 1,
          },
        ],
      };
    }, [locationsData?.chart]);

    const pieChartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const,
          labels: {
            boxWidth: 12,
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
      },
      maintainAspectRatio: false,
    };

    if (performanceLoading || locationsLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Main Metrics Cards */}
        <div className="grid grid-cols-3 gap-[20px]">
          {(!performanceData || performanceData.chartData?.length === 0) ? (
            <div className="col-span-3">
              This channel needs to be refreshed,{' '}
              <div
                className="underline hover:font-bold cursor-pointer"
                onClick={refreshChannel(integration as any)}
              >
                click here to refresh
              </div>
            </div>
          ) : (
            performanceData?.chartData?.map((p: any, index: number) => (
              <div key={`pl-${index}`} className="flex">
                <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                  <div className="flex items-center gap-[14px]">
                    <div className="text-[20px]">{p.label}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-[156px] relative">
                      {p.data.length > 0 ? (
                        <ChartSocial {...p} key={`p-${index}`} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[50px] leading-[60px]">
                    {total[index]}
                    {index < 2 && (
                      <span className="text-green-500 text-[20px] ml-2">↑</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Performance Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Performance Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {performanceTableData.months.map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Page Views</td>
                    {performanceTableData.pageViews.map((value: string, index: number) => (
                      <td key={`pageViews-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Visits</td>
                    {performanceTableData.visits.map((value: string, index: number) => (
                      <td key={`visits-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Visitors</td>
                    {performanceTableData.visitors.map((value: string, index: number) => (
                      <td key={`visitors-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Posts</td>
                    {performanceTableData.posts.map((value: string, index: number) => (
                      <td key={`posts-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px]">Comments</td>
                    {performanceTableData.comments.map((value: string, index: number) => (
                      <td key={`comments-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Growth Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Performance Trends</h2>
            <div className="h-[200px] relative">
              {performanceBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={performanceBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {performanceData?.rawData?.[performanceData.rawData?.length - 1]?.pageViews || 0}
                  {performanceData?.rawData?.[performanceData.rawData?.length - 1]?.pageViews >
                    performanceData?.rawData?.[performanceData.rawData?.length - 2]?.pageViews && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Page Views</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {performanceData?.rawData?.[performanceData.rawData?.length - 1]?.visits || 0}
                  {performanceData?.rawData?.[performanceData.rawData?.length - 1]?.visits >
                    performanceData?.rawData?.[performanceData.rawData?.length - 2]?.visits && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Visits</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {performanceData?.rawData?.[performanceData.rawData?.length - 1]?.visitors || 0}
                  {performanceData?.rawData?.[performanceData.rawData?.length - 1]?.visitors >
                    performanceData?.rawData?.[performanceData.rawData?.length - 2]?.visitors && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Visitors</div>
              </div>
            </div>
          </div>
        </div>

        {/* Locations Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Locations Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Visitor Locations</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    {locationsTableData.headers?.map((header: string, index: number) => (
                      <th key={`header-${index}`} className="pb-[8px]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {locationsTableData.rows?.map((row: any[], rowIndex: number) => (
                    <tr
                      key={`row-${rowIndex}`}
                      className={rowIndex < locationsTableData.rows.length - 1 ? 'border-b border-border' : ''}
                    >
                      {row.map((cell: string, cellIndex: number) => (
                        <td
                          key={`cell-${rowIndex}-${cellIndex}`}
                          className="py-[8px]"
                        >
                          {cellIndex === row.length - 1 ? (
                            <span className={cell.startsWith('-') ? 'text-red-500' : 'text-green-500'}>
                              {cell}
                            </span>
                          ) : (
                            cell
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Locations Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Visitor Distribution</h2>
            <div className="h-[300px] relative">
              {locationsPieChartData?.labels?.length > 0 ? (
                <Pie
                  data={locationsPieChartData}
                  options={pieChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-2 gap-[20px]">
              {locationsData?.chart?.slice(0, 4).map((item: any, index: number) => (
                <div key={`location-${index}`} className="flex flex-col">
                  <div className="text-[18px] font-bold">{item.country}</div>
                  <div className="flex justify-between">
                    <span className="text-[14px] text-gray-400">Visitors:</span>
                    <span className="text-[14px]">{item.visitors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[14px] text-gray-400">Percentage:</span>
                    <span className="text-[14px]">{item.percent}%</span>
                  </div>
                  {locationsTableData.rows?.[index]?.[4] && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-gray-400">Change:</span>
                      <span className={`text-[14px] ${locationsTableData.rows[index][4].startsWith('-') ? 'text-red-500' : 'text-green-500'
                        }`}>
                        {locationsTableData.rows[index][4]}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ==================== PINTEREST COMPONENT ====================
  if (integration.identifier === 'pinterest') {
    const [loading, setLoading] = useState(true);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<any>(null);

    const loadCommunity = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/report/pinterest/community?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        // Default empty data structure
        const defaultChartItem = {
          date: new Date().toISOString(),
          followers: 0,
          following: 0,
          posts: 0
        };

        const chartData = data?.chart || [defaultChartItem];
        const latestData = chartData[chartData.length - 1] || defaultChartItem;

        const transformedData = [
          {
            label: 'Followers',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.followers || 0,
            })),
            average: false,
            latestValue: latestData.followers || 0,
          },
          {
            label: 'Following',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.following || 0,
            })),
            average: false,
            latestValue: latestData.following || 0,
          },
          {
            label: 'Posts',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.posts || 0,
            })),
            average: false,
            latestValue: latestData.posts || 0,
          },
        ];

        return {
          chartData: transformedData,
          rawData: chartData,
          tableData: data?.table || {
            Data: ['No data', 'No data'],
            Followers: ['0', '0%'],
            Following: ['0', '0%'],
            Posts: ['0', '0%'],
            Growth: "+0 New Followers"
          },
        };
      } catch (error) {
        console.error('Error loading community analytics:', error);
        return {
          chartData: [],
          rawData: [],
          tableData: {
            Data: ['No data', 'No data'],
            Followers: ['0', '0%'],
            Following: ['0', '0%'],
            Posts: ['0', '0%'],
            Growth: "+0 New Followers"
          }
        };
      } finally {
        setLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadOverview = useCallback(async () => {
      setOverviewLoading(true);
      try {
        const response = await fetch(
          `/report/pinterest/overview?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        // Default empty data structure
        const defaultChartItem = {
          date: new Date().toISOString(),
          impressions: 0,
          posts: 0
        };

        setOverviewData({
          chart: data?.chart || [defaultChartItem],
          table: data?.table || {
            Data: ['No data', 'No data'],
            Impressions: ['0', '0%'],
            Posts: ['0', '0%']
          }
        });
      } catch (error) {
        console.error('Error loading overview analytics:', error);
        setOverviewData({
          chart: [{
            date: new Date().toISOString(),
            impressions: 0,
            posts: 0
          }],
          table: {
            Data: ['No data', 'No data'],
            Impressions: ['0', '0%'],
            Posts: ['0', '0%']
          }
        });
      } finally {
        setOverviewLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const { data } = useSWR(`/pinterest-analytics-${integration?.id}-${date}`, loadCommunity, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/pinterest-overview-${integration?.id}-${date}`, loadOverview, {
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

    const total = useMemo(() => {
      return data?.chartData?.map((p: any) => p.latestValue) || [0, 0, 0];
    }, [data]);

    const communityTableData = useMemo(() => {
      if (!data?.tableData) return {
        months: ['No data', 'No data'],
        followers: ['0', '0%'],
        following: ['0', '0%'],
        posts: ['0', '0%'],
        growth: "+0 New Followers"
      };

      return {
        months: data.tableData.Data || ['No data', 'No data'],
        followers: data.tableData.Followers || ['0', '0%'],
        following: data.tableData.Following || ['0', '0%'],
        posts: data.tableData.Posts || ['0', '0%'],
        growth: data.tableData.Growth || "+0 New Followers"
      };
    }, [data]);

    const overviewTableData = useMemo(() => {
      if (!overviewData?.table) return {
        months: ['No data', 'No data'],
        impressions: ['0', '0%'],
        posts: ['0', '0%']
      };

      return {
        months: overviewData.table.Data || ['No data', 'No data'],
        impressions: overviewData.table.Impressions || ['0', '0%'],
        posts: overviewData.table.Posts || ['0', '0%']
      };
    }, [overviewData]);

    const followersBarChartData = useMemo(() => {
      const rawData = data?.rawData || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Followers',
            data: chartData.map((item: any) => item.followers || 0),
            backgroundColor: 'rgba(230, 0, 0, 0.6)',
            borderColor: 'rgba(230, 0, 0, 1)',
            borderWidth: 1,
          },
          {
            label: 'Following',
            data: chartData.map((item: any) => item.following || 0),
            backgroundColor: 'rgba(196, 181, 253, 0.6)', // 💜 Light purple (semi-transparent)
            borderColor: 'rgba(196, 181, 253, 1)',       // 💜 Light purple (solid)
            borderWidth: 1,
          }
        ],
      };
    }, [data?.rawData]);

    const impressionsBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Impressions',
            data: chartData.map((item: any) => item.impressions || 0),
            backgroundColor: 'rgba(230, 0, 0, 0.6)',
            borderColor: 'rgba(230, 0, 0, 1)',
            borderWidth: 1,
          },
          {
            label: 'Posts',
            data: chartData.map((item: any) => item.posts || 0),
            backgroundColor: 'rgba(196, 181, 253, 0.6)', // 💜 Light purple (semi-transparent)
            borderColor: 'rgba(196, 181, 253, 1)',       // 💜 Light purple (solid)
            borderWidth: 1,
          }
        ],
      };
    }, [overviewData?.chart]);

    const barChartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            boxWidth: 12,
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
      maintainAspectRatio: false,
    };

    if (loading || overviewLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Main Metrics Cards */}
        <div className="grid grid-cols-3 gap-[20px]">
          {(!data || data.chartData?.length === 0) ? (
            <div className="col-span-3">
              This channel needs to be refreshed,{' '}
              <div
                className="underline hover:font-bold cursor-pointer"
                onClick={refreshChannel(integration as any)}
              >
                click here to refresh
              </div>
            </div>
          ) : (
            data?.chartData?.map((p: any, index: number) => (
              <div key={`pl-${index}`} className="flex">
                <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                  <div className="flex items-center gap-[14px]">
                    <div className="text-[20px]">{p.label}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-[156px] relative">
                      {p.data.length > 0 ? (
                        <ChartSocial {...p} key={`p-${index}`} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[50px] leading-[60px]">
                    {total[index]}
                    {index < 2 && ( // Show arrow only for Followers and Following
                      <span className="text-green-500 text-[20px] ml-2">↑</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Community Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Community Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {communityTableData.months.map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Followers</td>
                    {communityTableData.followers.map((value: string, index: number) => (
                      <td key={`followers-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Following</td>
                    {communityTableData.following.map((value: string, index: number) => (
                      <td key={`following-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Posts</td>
                    {communityTableData.posts.map((value: string, index: number) => (
                      <td key={`content-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-[12px] text-sm">Growth: {communityTableData.growth}</div>
          </div>

          {/* Community Growth Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community Growth</h2>
            <div className="h-[200px] relative">
              {followersBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={followersBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.followers || 0}
                  {data?.rawData?.[data.rawData?.length - 1]?.followers >
                    data?.rawData?.[data.rawData?.length - 2]?.followers && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Followers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.following || 0}
                </div>
                <div className="text-[14px] text-gray-400">Following</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.posts || 0}
                </div>
                <div className="text-[14px] text-gray-400">Posts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Overview Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {overviewTableData.months.map((month: string, index: number) => (
                      <th key={`overview-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Impressions</td>
                    {overviewTableData.impressions.map((value: string, index: number) => (
                      <td key={`impressions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Posts</td>
                    {overviewTableData.posts.map((value: string, index: number) => (
                      <td key={`overview-content-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Impressions Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Impressions & Posts</h2>
            <div className="h-[200px] relative">
              {impressionsBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={impressionsBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-2 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions || 0}
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions >
                    overviewData?.chart?.[overviewData.chart?.length - 2]?.impressions && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Impressions</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.posts || 0}
                </div>
                <div className="text-[14px] text-gray-400">Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ==================== THREADS COMPONENT ====================
  if (integration.identifier === 'threads') {
    const [loading, setLoading] = useState(true);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<any>(null);

    const loadGrowth = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/report/threads/growth?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        // Default empty data structure
        const defaultChartItem = {
          date: new Date().toISOString(),
          followers: 0,
          posts: 0
        };

        const chartData = data?.chart || [defaultChartItem];
        const latestData = chartData[chartData.length - 1] || defaultChartItem;

        const transformedData = [
          {
            label: 'Followers',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.followers || 0,
            })),
            average: false,
            latestValue: latestData.followers || 0,
          },
          {
            label: 'Posts',
            data: chartData.map((item: any) => ({
              date: item.date,
              total: item.posts || 0,
            })),
            average: false,
            latestValue: latestData.posts || 0,
          },
        ];

        return {
          chartData: transformedData,
          rawData: chartData,
          tableData: data?.table || {
            Data: ['No data', 'No data', 'No data', 'No data', 'No data'],
            Followers: ['0', '0', '0', '0', '0%'],
            Posts: ['0', '0', '0', '0', '0%'],
          },
        };
      } catch (error) {
        console.error('Error loading growth analytics:', error);
        return {
          chartData: [],
          rawData: [],
          tableData: {
            Data: ['No data', 'No data', 'No data', 'No data', 'No data'],
            Followers: ['0', '0', '0', '0', '0%'],
            Posts: ['0', '0', '0', '0', '0%'],
          }
        };
      } finally {
        setLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const loadOverview = useCallback(async () => {
      setOverviewLoading(true);
      try {
        const response = await fetch(
          `/report/threads/overview?businessId=${integration.internalId}&days=${getDaysParam(date)}`
        );
        const data = await response.json();

        // Default empty data structure
        const defaultChartItem = {
          date: new Date().toISOString(),
          engagement: 0,
          interactions: 0,
          impressions: 0,
          posts: 0
        };

        setOverviewData({
          chart: data?.chart || [defaultChartItem],
          table: data?.table || {
            Data: ['No data', 'No data', 'No data', 'No data', 'No data'],
            Engagement: ['0', '0', '0', '0', '0%'],
            Interactions: ['0', '0', '0', '0', '0%'],
            Impressions: ['0', '0', '0', '0', '0%'],
            Posts: ['0', '0', '0', '0', '0%']
          }
        });
      } catch (error) {
        console.error('Error loading overview analytics:', error);
        setOverviewData({
          chart: [{
            date: new Date().toISOString(),
            engagement: 0,
            interactions: 0,
            impressions: 0,
            posts: 0
          }],
          table: {
            Data: ['No data', 'No data', 'No data', 'No data', 'No data'],
            Engagement: ['0', '0', '0', '0', '0%'],
            Interactions: ['0', '0', '0', '0', '0%'],
            Impressions: ['0', '0', '0', '0', '0%'],
            Posts: ['0', '0', '0', '0', '0%']
          }
        });
      } finally {
        setOverviewLoading(false);
      }
    }, [integration, date, getDaysParam]);

    const { data } = useSWR(`/threads-analytics-${integration?.id}-${date}`, loadGrowth, {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    });

    useSWR(`/threads-overview-${integration?.id}-${date}`, loadOverview, {
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

    const total = useMemo(() => {
      return data?.chartData?.map((p: any) => p.latestValue) || [0, 0];
    }, [data]);

    const growthTableData = useMemo(() => {
      if (!data?.tableData) return {
        months: ['No data', 'No data', 'No data', 'No data', 'No data'],
        followers: ['0', '0', '0', '0', '0%'],
        posts: ['0', '0', '0', '0', '0%'],
      };

      return {
        months: data.tableData.Data || ['No data', 'No data', 'No data', 'No data', 'No data'],
        followers: data.tableData.Followers || ['0', '0', '0', '0', '0%'],
        posts: data.tableData.Posts || ['0', '0', '0', '0', '0%'],
      };
    }, [data]);

    const overviewTableData = useMemo(() => {
      if (!overviewData?.table) return {
        months: ['No data', 'No data', 'No data', 'No data', 'No data'],
        engagement: ['0', '0', '0', '0', '0%'],
        interactions: ['0', '0', '0', '0', '0%'],
        impressions: ['0', '0', '0', '0', '0%'],
        posts: ['0', '0', '0', '0', '0%']
      };

      return {
        months: overviewData.table.Data || ['No data', 'No data', 'No data', 'No data', 'No data'],
        engagement: overviewData.table.Engagement || ['0', '0', '0', '0', '0%'],
        interactions: overviewData.table.Interactions || ['0', '0', '0', '0', '0%'],
        impressions: overviewData.table.Impressions || ['0', '0', '0', '0', '0%'],
        posts: overviewData.table.Posts || ['0', '0', '0', '0', '0%']
      };
    }, [overviewData]);

    const followersBarChartData = useMemo(() => {
      const rawData = data?.rawData || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Followers',
            data: chartData.map((item: any) => item.followers || 0),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Posts',
            data: chartData.map((item: any) => item.posts || 0),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [data?.rawData]);

    const engagementBarChartData = useMemo(() => {
      const rawData = overviewData?.chart || [];
      const chartData = rawData.slice(-14);

      return {
        labels: chartData.map((item: any) => {
          const date = new Date(item.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: 'Engagement',
            data: chartData.map((item: any) => item.engagement || 0),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
          {
            label: 'Impressions',
            data: chartData.map((item: any) => item.impressions || 0),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          }
        ],
      };
    }, [overviewData?.chart]);

    const barChartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            boxWidth: 12,
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
      maintainAspectRatio: false,
    };

    if (loading || overviewLoading) {
      return <LoadingComponent />;
    }

    return (
      <div className="flex flex-col gap-[20px]">
        {/* Main Metrics Cards */}
        <div className="grid grid-cols-2 gap-[20px]">
          {(!data || data.chartData?.length === 0) ? (
            <div className="col-span-2">
              This channel needs to be refreshed,{' '}
              <div
                className="underline hover:font-bold cursor-pointer"
                onClick={refreshChannel(integration as any)}
              >
                click here to refresh
              </div>
            </div>
          ) : (
            data?.chartData?.map((p: any, index: number) => (
              <div key={`pl-${index}`} className="flex">
                <div className="flex-1 bg-secondary py-[10px] px-[16px] gap-[10px] flex flex-col">
                  <div className="flex items-center gap-[14px]">
                    <div className="text-[20px]">{p.label}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-[156px] relative">
                      {p.data.length > 0 ? (
                        <ChartSocial {...p} key={`p-${index}`} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[50px] leading-[60px]">
                    {total[index]}
                    {index === 0 && ( // Show arrow only for Followers
                      <span className="text-green-500 text-[20px] ml-2">↑</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Growth Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Growth Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Growth</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {growthTableData.months.map((month: string, index: number) => (
                      <th key={`month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Followers</td>
                    {growthTableData.followers.map((value: string, index: number) => (
                      <td key={`followers-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Posts</td>
                    {growthTableData.posts.map((value: string, index: number) => (
                      <td key={`posts-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Growth Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Growth Metrics</h2>
            <div className="h-[200px] relative">
              {followersBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={followersBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-2 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.followers || 0}
                  {data?.rawData?.[data.rawData?.length - 1]?.followers >
                    data?.rawData?.[data.rawData?.length - 2]?.followers && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Followers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {data?.rawData?.[data.rawData?.length - 1]?.posts || 0}
                </div>
                <div className="text-[14px] text-gray-400">Posts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="flex flex-col gap-[20px]">
          {/* Overview Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {overviewTableData.months.map((month: string, index: number) => (
                      <th key={`overview-month-${index}`} className="pb-[8px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Engagement</td>
                    {overviewTableData.engagement.map((value: string, index: number) => (
                      <td key={`engagement-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Interactions</td>
                    {overviewTableData.interactions.map((value: string, index: number) => (
                      <td key={`interactions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Impressions</td>
                    {overviewTableData.impressions.map((value: string, index: number) => (
                      <td key={`impressions-${index}`} className="py-[8px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Posts</td>
                    {overviewTableData.posts.map((value: string, index: number) => (
                      <td key={`overview-posts-${index}`} className="py-[8px] font-bold">
                        {value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Engagement Chart */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Engagement & Impressions</h2>
            <div className="h-[200px] relative">
              {engagementBarChartData?.labels?.length > 0 ? (
                <Bar
                  data={engagementBarChartData}
                  options={barChartOptions}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  No data available
                </div>
              )}
            </div>
            <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.engagement?.toFixed(2) || 0}
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.engagement >
                    overviewData?.chart?.[overviewData.chart?.length - 2]?.engagement && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Engagement</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions || 0}
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.impressions >
                    overviewData?.chart?.[overviewData.chart?.length - 2]?.impressions && (
                      <span className="text-green-500 text-[14px] ml-2">↑</span>
                    )}
                </div>
                <div className="text-[14px] text-gray-400">Impressions</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[24px] font-bold">
                  {overviewData?.chart?.[overviewData.chart?.length - 1]?.posts || 0}
                </div>
                <div className="text-[14px] text-gray-400">Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }




  // Default return if no matching platform
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-[20px] mb-[16px]">Unsupported Platform</div>
        <div>
          Analytics are not available for this platform yet.
        </div>
      </div>
    </div>
  );
};