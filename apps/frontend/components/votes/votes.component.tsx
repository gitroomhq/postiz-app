import { FC, Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { LinkButton } from '@clickvote/frontend/components/form/link.button';
import { Button } from '@clickvote/frontend/components/form/button';
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
import { Dialog, Transition } from '@headlessui/react';
import { Trash2 } from 'lucide-react';

type VoteProps = {
  _id: string;
  name: string;
  type: string;
  count: number;
  sum: number;
}

export const VotesComponent: FC = () => {
  const { data, isLoading } = useQuery<{ votes: VoteProps[] }>({
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
      {!isLoading && !!data?.votes.length && (
        <Card className="mt-7 max-w-4xl bg-dark-purple ring-bright-purple/80">
          <Table className="max-w-4xl w-full">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="text-white">Vote</TableHeaderCell>
                <TableHeaderCell className="text-white">Type</TableHeaderCell>
                <TableHeaderCell className="text-white">Clicks</TableHeaderCell>
                <TableHeaderCell className="text-white">Score</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.votes.map((vote) => (
                <Vote
                  key={vote._id}
                  _id={vote._id}
                  name={vote.name}
                  count={vote.count}
                  sum={vote.sum}
                  type={vote.type}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

const Vote: FC<VoteProps> = ({ _id, name, count, sum, type }) => {
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation({
    mutationFn: async () => axiosInstance.delete(`/votes/${_id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['votes']);
    }
  });

  function handleToggleAlertVisibility() {
    setIsAlertVisible((prevAlertVisibleState) => !prevAlertVisibleState);
  }

  function handleDeleteVote() {
    handleToggleAlertVisibility();
    mutate();
  }

  return (
    <>
      <TableRow key={_id}>
        <TableCell className="text-white">
          <Link href={`/votes/${_id}`}>{name}</Link>
        </TableCell>
        <TableCell className="text-white">
          {type}
        </TableCell>
        <TableCell className="text-white">
          {count || 0}
        </TableCell>
        <TableCell className="text-white">
          {type === 'single'
            ? count
            : ((sum || 1) / (count || 1)).toFixed(2)}
        </TableCell>
        <TableCell>
          <Button
            disabled={isLoading}
            loading={isLoading}
            onClick={handleToggleAlertVisibility}
            className="w-[44px] h-[44px]"
            aria-label={`Delete ${name} vote`}
          >
            <Trash2 size={24} color='#FFFFFF' aria-hidden />
          </Button>
        </TableCell>
      </TableRow>

      <Transition appear show={isAlertVisible} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleToggleAlertVisibility}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-[#ffffff]/20 bg-[#05050B] p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium leading-6 text-gray-50"
                  >
                    Are you sure?
                  </Dialog.Title>
                  <div className="mt-3">
                    <p className="text-sm text-gray-200">
                      This action cannot be undone. This will permanently delete your vote.
                    </p>
                  </div>

                  <div className="mt-4 flex gap-4">
                    <Button
                      type="button"
                      className="font-medium bg-none bg-gray-900"
                      onClick={handleToggleAlertVisibility}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="font-medium bg-none bg-red-200"
                      onClick={handleDeleteVote}
                    >
                      <span className="text-red-500">
                        Yes, delete vote
                      </span>
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
