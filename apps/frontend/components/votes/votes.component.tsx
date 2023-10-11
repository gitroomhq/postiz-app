import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { LinkButton } from '@clickvote/frontend/components/form/link.button';
import Link from 'next/link';
import { Title } from '@tremor/react';
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Card,
} from '@tremor/react';

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
        <Card className="mt-7 max-w-4xl bg-dark-purple ring-bright-purple/80">
          <Table className="max-w-4xl w-full">
            <TableHead className="">
              <TableRow className="">
                <TableHeaderCell className="text-white">Vote</TableHeaderCell>
                <TableHeaderCell className="text-white">Type</TableHeaderCell>
                <TableHeaderCell className="text-white">Clicks</TableHeaderCell>
                <TableHeaderCell className="text-white">Score</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-bright-purple/80">
              {data.votes.map((vote: any) => (
                <TableRow key={vote.id} className="">
                  <TableCell className="text-white ">
                    <Link
                      href={`/votes/${vote._id}`}
                      className=" hover:underline hover:underline-offset-4"
                    >
                      {vote.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-white">{vote.type}</TableCell>
                  <TableCell className="text-white">
                    {vote.count || 0}
                  </TableCell>
                  <TableCell className="text-white">
                    {vote.type === 'single'
                      ? vote.count
                      : ((vote.sum || 1) / (vote.count || 1)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
