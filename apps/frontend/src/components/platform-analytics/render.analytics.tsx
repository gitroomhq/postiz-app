import { FC, useCallback, useMemo, useState } from 'react';
import { Integration } from '@prisma/client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { Bar } from 'react-chartjs-2';
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

export const RenderAnalytics: FC<{ integration: Integration; date: number }> = (
  props
) => {
  const { integration, date } = props;
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>(null);

  const fetch = useFetch();

  const getDaysParam = useCallback((date: number) => {
    if (date <= 7) return '7';
    if (date <= 30) return '30';
    return '90';
  }, []);

  // Load community data
  const loadCommunity = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/report/instagram/community?businessId=${
          integration.internalId
        }&days=${getDaysParam(date)}`
      );
      const data = await response.json();

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
        tableData: data.table,
      };
    } catch (error) {
      console.error('Error loading community analytics:', error);
      return { chartData: [], rawData: [], tableData: null };
    } finally {
      setLoading(false);
    }
  }, [integration, date, getDaysParam]);

  // Load overview data
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const response = await fetch(
        `/report/instagram/overview?businessId=${
          integration.internalId
        }&days=${getDaysParam(date)}`
      );
      const data = await response.json();
      setOverviewData(data);
    } catch (error) {
      console.error('Error loading overview analytics:', error);
      setOverviewData(null);
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

  // Load overview data when component mounts
  useSWR(`/overview-${integration?.id}-${date}`, loadOverview, {
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
    return data?.chartData?.map((p: any) => {
      return p.latestValue;
    });
  }, [data]);

  const communityTableData = useMemo(() => {
    if (!data?.tableData) return null;

    return {
      months: data.tableData.Data,
      followers: data.tableData.Followers,
      following: data.tableData.Following,
      totalContent: data.tableData.TotalContent,
      growth: data.tableData.Growth,
    };
  }, [data]);

  const overviewTableData = useMemo(() => {
    if (!overviewData?.table) return null;

    return {
      months: overviewData.table.Data,
      impressions: overviewData.table.Impressions,
      avgReachPerDay: overviewData.table.AvgReachPerDay,
      totalContent: overviewData.table.TotalContent,
    };
  }, [overviewData]);

  // Prepare data for the followers growth bar chart
  const followersBarChartData = useMemo(() => {
    if (!data?.rawData) return null;

    const chartData = data.rawData.slice(-14);
    
    return {
      labels: chartData.map((item: any) => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: 'Followers Growth',
          data: chartData.map((item: any) => item.followers),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [data?.rawData]);

  // Prepare data for the impressions bar chart
  const impressionsBarChartData = useMemo(() => {
    if (!overviewData?.chart) return null;

    const chartData = overviewData.chart.slice(-14);
    
    return {
      labels: chartData.map((item: any) => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: 'Impressions',
          data: chartData.map((item: any) => item.impressions),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [overviewData?.chart]);

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
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
      {/* Existing 3-column charts */}
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


      {/* Community Section */}
      {communityTableData && (
        <div className="flex flex-col gap-[20px]">
          {/* Community Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Community</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {communityTableData.months
                      .slice(0, -1)
                      .map((month: string, index: number) => (
                        <th key={`month-${index}`} className="pb-[8px]">
                          {month}
                        </th>
                      ))}
                    <th className="pb-[8px]">
                      {communityTableData.months[communityTableData.months.length - 1]}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Followers</td>
                    {communityTableData.followers
                      .slice(0, -1)
                      .map((value: string, index: number) => (
                        <td key={`followers-${index}`} className="py-[8px]">
                          {value}
                        </td>
                      ))}
                    <td className="py-[8px]">
                      {communityTableData.followers[communityTableData.followers.length - 1]}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Following</td>
                    {communityTableData.following
                      .slice(0, -1)
                      .map((value: string, index: number) => (
                        <td key={`following-${index}`} className="py-[8px]">
                          {value}
                        </td>
                      ))}
                    <td className="py-[8px]">
                      {communityTableData.following[communityTableData.following.length - 1]}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Content</td>
                    {communityTableData.totalContent
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
                      {communityTableData.totalContent[communityTableData.totalContent.length - 1]}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {communityTableData.growth && (
              <div className="mt-[12px] text-sm">Growth: {communityTableData.growth}</div>
            )}
          </div>

          {/* Followers Growth Bar Chart */}
{/* Followers Growth Bar Chart */}
{/* Community Growth Bar Chart */}
{/* Followers Growth Bar Chart */}
{followersBarChartData && (
  <div className="bg-secondary p-[16px]">
    <h2 className="text-[20px] mb-[16px]">Community Growth</h2>
    <div className="h-[200px] relative">
      <Bar 
        data={{
          labels: followersBarChartData.labels,
          datasets: [
            {
              label: 'Followers',
              data: data?.rawData?.slice(-14).map((item: any) => item.followers) || [],
              backgroundColor: 'rgba(75, 192, 192, 0.8)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            },
            {
              label: 'Following',
              data: data?.rawData?.slice(-14).map((item: any) => item.following) || [],
              backgroundColor: 'rgba(255, 159, 64, 0.8)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 1,
            },
            {
              label: 'Total Content',
              data: data?.rawData?.slice(-14).map((item: any) => item.totalContent) || [],
              backgroundColor: 'rgba(153, 102, 255, 0.8)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1,
            }
          ]
        }} 
        options={{
          ...barChartOptions,
          scales: {
            ...barChartOptions.scales,
            x: {
              stacked: false, // Change to true if you want stacked bars
            },
            y: {
              stacked: false, // Change to true if you want stacked bars
              beginAtZero: false,
            }
          },
          plugins: {
            ...barChartOptions.plugins,
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          }
        }} 
      />
    </div>
    <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
      <div className="flex flex-col items-center">
        <div className="text-[24px] font-bold">
          {data?.rawData[data.rawData.length - 1]?.followers || 0}
          <span className="text-green-500 text-[14px] ml-2">↑</span>
        </div>
        <div className="text-[14px] text-gray-400">Followers</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-[24px] font-bold">
          {data?.rawData[data.rawData.length - 1]?.following || 0}
        </div>
        <div className="text-[14px] text-gray-400">Following</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-[24px] font-bold">
          {data?.rawData?.[data?.rawData?.length - 1]?.totalContent || 0}
        </div>
        <div className="text-[14px] text-gray-400">Total Content</div>
      </div>
    </div>
  </div>
)}
        </div>
      )}

            {/* Overview Section */}
      {overviewTableData && (
        <div className="flex flex-col gap-[20px]">
          {/* Overview Table */}
          <div className="bg-secondary p-[16px]">
            <h2 className="text-[20px] mb-[16px]">Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-[8px]">Data</th>
                    {overviewTableData.months
                      .slice(0, -1)
                      .map((month: string, index: number) => (
                        <th key={`overview-month-${index}`} className="pb-[8px]">
                          {month}
                        </th>
                      ))}
                    <th className="pb-[8px]">
                      {overviewTableData.months[overviewTableData.months.length - 1]}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Impressions</td>
                    {overviewTableData.impressions
                      .slice(0, -1)
                      .map((value: string, index: number) => (
                        <td key={`impressions-${index}`} className="py-[8px]">
                          {value}
                        </td>
                      ))}
                    <td className="py-[8px]">
                      {overviewTableData.impressions[overviewTableData.impressions.length - 1]}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-[8px]">Avg Reach Per Day</td>
                    {overviewTableData.avgReachPerDay
                      .slice(0, -1)
                      .map((value: string, index: number) => (
                        <td key={`reach-${index}`} className="py-[8px]">
                          {value}
                        </td>
                      ))}
                    <td className="py-[8px]">
                      {overviewTableData.avgReachPerDay[overviewTableData.avgReachPerDay.length - 1]}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-[8px] font-bold">Total Content</td>
                    {overviewTableData.totalContent
                      .slice(0, -1)
                      .map((value: string, index: number) => (
                        <td
                          key={`overview-content-${index}`}
                          className="py-[8px] font-bold"
                        >
                          {value}
                        </td>
                      ))}
                    <td className="py-[8px] font-bold">
                      {overviewTableData.totalContent[overviewTableData.totalContent.length - 1]}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Impressions Bar Chart */}
          {impressionsBarChartData && (
            <div className="bg-secondary p-[16px]">
              <h2 className="text-[20px] mb-[16px]">Impressions</h2>
              <div className="h-[200px] relative">
                <Bar data={impressionsBarChartData} options={barChartOptions} />
              </div>
              <div className="mt-[16px] grid grid-cols-3 gap-[20px]">
                <div className="flex flex-col items-center">
                  <div className="text-[24px] font-bold">
                    {overviewData?.chart?.[overviewData.chart.length - 1]?.impressions || 0}
                  </div>
                  <div className="text-[14px] text-gray-400">Impressions</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[24px] font-bold">
                    {overviewData?.chart?.[overviewData.chart.length - 1]?.avgReachPerDay || 0}
                  </div>
                  <div className="text-[14px] text-gray-400">Avg Reach</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[24px] font-bold">
                    {overviewData?.chart?.[overviewData.chart.length - 1]?.totalContent || 0}
                  </div>
                  <div className="text-[14px] text-gray-400">Total Content</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};