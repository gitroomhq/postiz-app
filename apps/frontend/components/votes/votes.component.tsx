import { FC, Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { LinkButton } from '@clickvote/frontend/components/form/link.button';
import { Button } from '@clickvote/frontend/components/form/button';
import Link from 'next/link';
import { Title } from '@tremor/react';
import { Dialog, Transition } from '@headlessui/react';

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
          </tbody>
        </table>
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
      <tr key={_id}>
        <td className="p-3 border border-bright-purple/70">
          <Link href={`/votes/${_id}`}>{name}</Link>
        </td>
        <td className="p-3 border border-bright-purple/70">
          {type}
        </td>
        <td className="p-3 border border-bright-purple/70">
          {count || 0}
        </td>
        <td className="p-3 border border-bright-purple/70">
          {type === 'single'
            ? count
            : ((sum || 1) / (count || 1)).toFixed(2)}
        </td>
        <td className="p-3 border border-bright-purple/70 w-[140px] text-center">
          <Button
            disabled={isLoading}
            loading={true}
            loadingText="Deleting..."
            onClick={handleToggleAlertVisibility}
          >
            Delete Vote
          </Button>
        </td>
      </tr>

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
