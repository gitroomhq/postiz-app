import { FC, Fragment, useState } from 'react';
import { Title } from '@tremor/react';
import { Dialog, Transition } from '@headlessui/react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { Button } from '@clickvote/frontend/components/form/button';
import { Input } from '@clickvote/frontend/components/form/input';

type InviteMemberFormValues = {
  email: string;
};

export const SettingsOrgMembers: FC = () => {
  const [isInviteMemberDialogVisible, setIsInviteMemberDialogVisible] =
    useState(false);

  const handleToggleInviteMemberDialogVisibility = () => {
    setIsInviteMemberDialogVisible(
      (prevInviteMemberDialogVisibilityState) =>
        !prevInviteMemberDialogVisibilityState
    );
  };

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center">
        <Title className="bg-words-purple bg-clip-text text-transparent text-4xl">
          Members
        </Title>
        <div>
          <Button
            type="button"
            onClick={handleToggleInviteMemberDialogVisibility}
          >
            Invite
          </Button>
          <InviteMemberDialog
            isInviteMemberDialogOpen={isInviteMemberDialogVisible}
            onClose={handleToggleInviteMemberDialogVisibility}
          />
        </div>
      </div>
      <ul>
        <li></li>
      </ul>
    </div>
  );
};

const InviteMemberDialog: FC<{
  isInviteMemberDialogOpen: boolean;
  onClose(): void;
}> = ({ isInviteMemberDialogOpen, onClose }) => {
  const methods = useForm<InviteMemberFormValues>({
    mode: 'all',
  });
  const { mutate } = useMutation(async (email: string) =>
    axiosInstance.post('/org/invite/create', { email })
  );

  const inviteMemberToOrg = ({ email }: InviteMemberFormValues) => {
    mutate(email, {
      onSuccess: () => {
        toast.success('Member successfuly invited to organization');
        onClose();
      },
      onError: (err: any) => {
        console.error('Error inviting member to organization', err);
        toast.error(err.response.data.message ?? 'Ops, something went wrong!');
      },
    });
  };

  return (
    <Transition appear show={isInviteMemberDialogOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                <Dialog.Title as={Title} className="text-xl leading-6">
                  Invite a member to this organization
                </Dialog.Title>

                <FormProvider {...methods}>
                  <form onSubmit={methods.handleSubmit(inviteMemberToOrg)}>
                    <Input
                      label="Email address"
                      name="email"
                      labelClassName="mt-4"
                    />
                    <Button type="submit">Invite a new member</Button>
                  </form>
                </FormProvider>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
