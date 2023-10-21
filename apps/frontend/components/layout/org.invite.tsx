import { FC, Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setCookie } from 'cookies-next';
import { toast } from 'react-toastify';
import { Transition, Portal } from '@headlessui/react';
import { Title } from '@tremor/react';
import { useUserContext } from '@clickvote/frontend/helper/user.context';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { Button } from '@clickvote/frontend/components/form/button';

interface InviteProps {
  invite: {
    _id: string;
    org: {
      _id: string;
      name: string;
    };
  }
}

export const OrgInvite: FC = () => {
  const { addNewOrg } = useUserContext();
  const queryClient = useQueryClient();
  const [isInviteVisible, setIsInviteVisible] = useState(false);
  const { data } = useQuery<InviteProps>({
    queryKey: ['org_invite'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<InviteProps>('/org/invites/user');

      if (data.invite) {
        setIsInviteVisible(true);
      }

      return data;
    },
  });
  const { mutate: acceptOrgInviteMutate } = useMutation({
    mutationKey: ['accept_org_invite'],
    mutationFn: (id: string) => axiosInstance.put(`org/invites/accept/${id}`),
  });
  const { mutate: declineOrgInviteMutate } = useMutation({
    mutationKey: ['decline_org_invite'],
    mutationFn: (id: string) =>
      axiosInstance.delete(`org/invites/decline/${id}`),
  });

  const invite = data?.invite;

  const handleAcceptInvite = async () => {
    acceptOrgInviteMutate(invite?._id!, {
      onSuccess: async () => {
        const org = invite?.org!;
        setCookie('org', org._id);
        addNewOrg({
          ...org,
          id: org._id,
        });
        setIsInviteVisible(false);
      },
      onError: (err: any) => {
        console.error('Could not accept organization invite', err);
        toast.error(err.response.data.message ?? 'Ops, something went wrong!');
      },
    });
  };

  const handleDeclineInvite = () => {
    declineOrgInviteMutate(invite?._id!, {
      onSuccess: () => {
        setIsInviteVisible(false);
      },
      onError: (err: any) => {
        console.error('Could not decline organization invite', err);
        toast.error(err.response.data.message ?? 'Ops, something went wrong!');
      },
    });
  };

  const invalidateOrgInviteQuery = () => {
    queryClient.invalidateQueries(['org_invite']);
  }

  return (
    <Portal>
      <Transition
        appear
        show={isInviteVisible}
        as={Fragment}
        // Note: We must invalidate the organization invitation query after the animation has completed to prevent
        // the organization name from disappearing prematurely, especially before the component unmounts.
        afterLeave={invalidateOrgInviteQuery}
      >
        <Transition.Child
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="absolute right-5 top-24 w-full max-w-md transform overflow-hidden rounded-2xl border border-[#ffffff]/20 bg-[#05050B] p-6 text-left align-middle shadow-xl"
        >
          <Title className="text-lg font-medium">
            Join the {invite?.org.name} organization?
          </Title>
          <p className="mt-1 text-sm">
            You have been invited to join the {invite?.org.name} organization.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              className="font-light bg-none bg-gray-900"
              onClick={handleAcceptInvite}
            >
              Accept Invite
            </Button>
            <Button
              type="button"
              className="bg-none bg-red-200"
              onClick={handleDeclineInvite}
            >
              <span className="text-red-500">Decline Invite</span>
            </Button>
          </div>
        </Transition.Child>
      </Transition>
    </Portal>
  );
};
