import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { LinkButton } from '@clickvote/frontend/components/form/link.button';
import Link from 'next/link';
import { Title } from '@tremor/react';

export const VotesComponent: FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['votes'],
    queryFn: async () => {
      return (await axiosInstance.get('/votes')).data;
    },
  });
  return (
    <div className="p-4">
      <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
        Votes
      </Title>
      <LinkButton href="/votes/add" className="py-5 mt-5">
        Add Vote
      </LinkButton>
      {!isLoading && !!data.votes.length && (
        <table className="max-w-5xl w-full mt-7 border border-bright-purple/70 bg-dark-purple">
          <thead className="bg-dark-purple">
            <tr className="">
              <th className="text-left p-3 border border-bright-purple/70">
                Vote
              </th>
              <th className="text-left p-3 border border-bright-purple/70">
                Type
              </th>
              <th className="text-left p-3 border border-bright-purple/70">
                Clicks
              </th>
              <th className="text-left p-3 border border-bright-purple/70">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {data.votes.map((vote: any) => (
              <tr key={vote.id}>
                <td className="p-3 border border-bright-purple/70">
                  <Link href={`/votes/${vote._id}`}>{vote.name}</Link>
                </td>
                <td className="p-3 border border-bright-purple/70">
                  {vote.type}
                </td>
                <td className="p-3 border border-bright-purple/70">
                  {vote.count || 0}
                </td>
                <td className="p-3 border border-bright-purple/70">
                  {vote.type === 'single'
                    ? vote.count
                    : ((vote.sum || 1) / (vote.count || 1)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
