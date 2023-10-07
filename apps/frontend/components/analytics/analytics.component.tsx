import { SearchSelect, SearchSelectItem, Title, Text } from '@tremor/react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { useState } from 'react';

export default function DashboardExample() {
  const { data, isLoading } = useQuery({
    queryKey: ['votes'],
    queryFn: async () => {
      return (await axiosInstance.get('/votes')).data;
    },
  });

  const [voteId, setvoteId] = useState('');
  const [voteTo, setVoteTo] = useState('');

  const { data: data2, isLoading: isLoading2 } = useQuery({
    queryKey: ['votesTo', voteId],
    queryFn: async () => {
      return (await axiosInstance.get(`/votes/${voteId}/to`)).data;
    },
  });

  const showData = !isLoading && !!data?.votes?.length;
  const showData2 = !isLoading2;

  return (
    <main className="p-4">
      <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
        Analytics
      </Title>

      <div className="flex flex-row gap-8 pt-4">
        <div>
          <Text className="text-white">Vote Group</Text>
          <SearchSelect
            className="w-64 pt-2"
            value={voteId}
            onValueChange={setvoteId}
          >
            {showData ? (
              data.votes.map((vote: any) => (
                <SearchSelectItem key={vote._id} value={vote._id}>
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
            <SearchSelectItem value="1">No votesTo</SearchSelectItem>
            {/* {showData2 ? (
              data2.votes.map((vote: any) => (
                <SearchSelectItem key={vote._id} value={vote._id}>
                  {vote.name}
                </SearchSelectItem>
              ))
            ) : (
              <SearchSelectItem value="1">No votesTo</SearchSelectItem>
            )} */}
          </SearchSelect>
        </div>
      </div>

      {showData && JSON.stringify(data.votes)}
      {showData2 && JSON.stringify(data2)}
    </main>
  );
}
