import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import React, { useCallback, useMemo } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { capitalize } from 'lodash';
import { useModals } from '@mantine/modals';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Input } from '@gitroom/react/form/input';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import copy from 'copy-to-clipboard';
import interClass from '@gitroom/react/helpers/inter.font';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';
import { ReactComponent as BinSvg } from '@gitroom/frontend/assets/bin.svg';

const roles = [
  {
    name: 'User',
    value: 'USER',
  },
  {
    name: 'Admin',
    value: 'ADMIN',
  },
];

export const AddMember = () => {
  const modals = useModals();
  const fetch = useFetch();
  const toast = useToaster();

  const resolver = useMemo(() => {
    return classValidatorResolver(AddTeamMemberDto);
  }, []);

  const form = useForm({
    values: {
      email: '',
      role: '',
      sendEmail: true,
    },
    resolver,
    mode: 'onChange',
  });

  const sendEmail = useWatch({
    control: form.control,
    name: 'sendEmail',
  });

  const submit = useCallback(
    async (values: { email: string; role: string; sendEmail: boolean }) => {
      const { url } = await (
        await fetch('/settings/team', {
          method: 'POST',
          body: JSON.stringify(values),
        })
      ).json();

      if (values.sendEmail) {
        modals.closeAll();
        toast.show('Invitation link sent');
        return;
      }

      copy(url);
      modals.closeAll();
      toast.show('Link copied to clipboard');
    },
    []
  );

  const closeModal = useCallback(() => {
    return modals.closeAll();
  }, []);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0">
          <TopTitle title="Add Member" />
          <button
            onClick={closeModal}
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
            type="button"
          >
            <CloseXSvg />
          </button>

          {sendEmail && (
            <Input label="Email" placeholder="Enter email" name="email" />
          )}
          <Select label="Role" name="role">
            <option value="">Select Role</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-[5px]">
            <div>
              <Checkbox name="sendEmail" />
            </div>
            <div>Send invitation via email?</div>
          </div>
          <Button type="submit" className="mt-[18px]">
            {sendEmail ? 'Send Invitation Link' : 'Copy Link'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const TeamsComponent = () => {
  const fetch = useFetch();
  const user = useUser();
  const modals = useModals();

  const myLevel = user?.role === 'USER' ? 0 : user?.role === 'ADMIN' ? 1 : 2;
  const getLevel = useCallback(
    (role: 'USER' | 'ADMIN' | 'SUPERADMIN') =>
      role === 'USER' ? 0 : role === 'ADMIN' ? 1 : 2,
    []
  );
  const loadTeam = useCallback(async () => {
    return (await (await fetch('/settings/team')).json()).users as Array<{
      id: string;
      role: 'SUPERADMIN' | 'ADMIN' | 'USER';
      user: { email: string; id: string };
    }>;
  }, []);

  const addMember = useCallback(() => {
    modals.openModal({
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
      children: <AddMember />,
    });
  }, []);

  const { data, mutate } = useSWR('/api/teams', loadTeam, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  const remove = useCallback(
    (toRemove: { user: { id: string } }) => async () => {
      if (
        !(await deleteDialog(
          'Are you sure you want to remove this team member?'
        ))
      ) {
        return;
      }

      await fetch(`/settings/team/${toRemove.user.id}`, {
        method: 'DELETE',
      });

      await mutate();
    },
    []
  );

  return (
    <div className="flex flex-col">
      <h2 className="text-[24px] mb-[24px]">Team Members</h2>
      <h3 className="text-[20px]">Account Managers</h3>
      <div className="text-customColor18 mt-[4px]">
        Invite your assistant or team member to manage your account
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
        <div className="flex flex-col gap-[16px]">
          {(data || []).map((p) => (
            <div key={p.user.id} className="flex items-center">
              <div className="flex-1">
                {capitalize(p.user.email.split('@')[0]).split('.')[0]}
              </div>
              <div className="flex-1">
                {p.role === 'USER'
                  ? 'User'
                  : p.role === 'ADMIN'
                  ? 'Admin'
                  : 'Super Admin'}
              </div>
              {+myLevel > +getLevel(p.role) ? (
                <div className="flex-1 flex justify-end">
                  <Button
                    className={`!bg-customColor3 !h-[24px] border border-customColor21 rounded-[4px] text-[12px] ${interClass}`}
                    onClick={remove(p)}
                  >
                    <div className="flex justify-center items-center gap-[4px]">
                      <div>
                        <BinSvg />
                      </div>
                      <div>Remove</div>
                    </div>
                  </Button>
                </div>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          ))}
        </div>
        <div>
          <Button className="rounded-[4px]" onClick={addMember}>
            Add another member
          </Button>
        </div>
      </div>
    </div>
  );
};
