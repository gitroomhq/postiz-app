import {
  SearchSelect,
  SearchSelectItem,
  Title,
  Text,
  Card,
  AreaChart,
  TabGroup,
  TabList,
  Tab,
} from '@tremor/react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { useState, useEffect, useMemo } from 'react';

const dateFormatter = (data: string) => {
  const date = new Date(data);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed in JS
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${hour}:00`;
  return formattedDate;
};

const Chart = ({
  voteName,
  voteTo,
  dateRange,
}: {
  voteName: string;
  voteTo?: string;
  dateRange?: string;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', voteName, voteTo, dateRange],
    enabled: !!voteName,
    queryFn: async () => {
      return (
        await axiosInstance.get(`/votes/${voteName}/analytics`, {
          params: {
            ...(voteTo ? { voteTo } : {}),
            ...(dateRange ? { dateRange } : {}),
          },
        })
      ).data;
    },
  });

  const showData = !isLoading && !!data?.length;

  const formatedData = useMemo(() => {
    return data?.map((item: any) => ({
      _id: dateFormatter(item._id),
      count: item.count,
    }));
  }, [data]);

  if (!showData) {
    return <div className="text-violet-200">No data</div>;
  }

  return (
    <AreaChart
      className="h-72 mt-4"
      data={formatedData}
      index="_id"
      categories={['count']}
      showLegend={false}
      colors={['purple']}
    />
  );
};

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['votes'],
    queryFn: async () => {
      return (await axiosInstance.get('/votes')).data;
    },
  });

  const [voteId, setvoteId] = useState('');
  const [voteTo, setVoteTo] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [dateIndex, setDateIndex] = useState<number>(0);

  const { data: data2, isLoading: isLoading2 } = useQuery({
    queryKey: ['votesTo', voteId],
    queryFn: async () => {
      return (await axiosInstance.get(`/votes/${voteId}/to`)).data;
    },
  });

  useEffect(() => {
    if (!data?.votes?.length) {
      return;
    }
    setvoteId(data.votes[0].name);
  }, [data]);

  const showData = !isLoading && !!data?.votes?.length;
  const showData2 = !isLoading2 && !!data2?.length;

  return (
    <main className="p-4">
      <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
        Analytics
      </Title>

      <div className="flex flex-row gap-8 pt-7 items-center max-w-5xl">
        <div>
          <Text className="text-white">Vote Group</Text>
          <SearchSelect
            className="w-64 pt-2"
            value={voteId}
            onValueChange={setvoteId}
          >
            {showData ? (
              data.votes.map((vote: any) => (
                <SearchSelectItem key={vote._id} value={vote.name}>
                  {vote.name}
                </SearchSelectItem>
              ))
            ) : (
              <SearchSelectItem value="1">No votes</SearchSelectItem>
            )}
          </SearchSelect>
        </div>
        <div>
          <Text className="text-white">VoteTo</Text>
          <SearchSelect
            className="w-64 pt-2"
            value={voteTo}
            onValueChange={setVoteTo}
          >
            {showData2 ? (
              data2?.map((voteTo: string) => (
                <SearchSelectItem key={voteTo} value={voteTo}>
                  {voteTo}
                </SearchSelectItem>
              ))
            ) : (
              <SearchSelectItem value="1">No votesTo</SearchSelectItem>
            )}
          </SearchSelect>
        </div>
        <div className="pt-8 ml-auto">
          <TabGroup index={dateIndex} onIndexChange={setDateIndex}>
            <TabList variant="solid" color="purple">
              <Tab className="py-1.5">1d</Tab>
              <Tab className="py-1.5">7d</Tab>
              <Tab className="py-1.5">30d</Tab>
              <Tab className="py-1.5">1y</Tab>
            </TabList>
          </TabGroup>
        </div>
      </div>

      <div className="pt-6">
        <Card className="max-w-5xl px-4">
          <div className="flex flex-row w-full items-center justify-between">
            <div>
              <Title>Clicks over time</Title>
            </div>
            <div className="mr-2">
              <TabGroup index={selectedIndex} onIndexChange={setSelectedIndex}>
                <TabList variant="solid" color="purple">
                  <Tab>Votes</Tab>
                  {/* <Tab>Rating</Tab> */}
                </TabList>
              </TabGroup>
            </div>
          </div>
          <Chart
            voteName={voteId}
            voteTo={voteTo}
            dateRange={['1d', '7d', '30d', '1y'][dateIndex]}
          />
        </Card>
      </div>
    </main>
  );
}
