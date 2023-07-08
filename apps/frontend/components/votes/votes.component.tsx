import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import Link from 'next/link';

export const VotesComponent: FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['votes'],
    queryFn: async () => {
      return (await axiosInstance.get('/votes')).data;
    },
  });
  return (
    <>
      <Link href="/votes/add">Add Vote</Link>
      {!isLoading && !!data.votes.length && (
        <table className="w-full mt-5 border border-white/20">
          <thead>
            <tr>
              <th className="text-left bg-black p-3 border border-white/20">
                Vote
              </th>
              <th className="text-left bg-black p-3 border border-white/20">
                Type
              </th>
              <th className="text-left bg-black p-3 border border-white/20">
                Clicks
              </th>
              <th className="text-left bg-black p-3 border border-white/20">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {data.votes.map((vote: any) => (
              <tr key={vote.id}>
                <td className="p-3 border border-white/20">
                  <Link href={`/votes/${vote._id}`}>{vote.name}</Link>
                </td>
                <td className="p-3 border border-white/20">{vote.type}</td>
                <td className="p-3 border border-white/20">0</td>
                <td className="p-3 border border-white/20">0</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};
