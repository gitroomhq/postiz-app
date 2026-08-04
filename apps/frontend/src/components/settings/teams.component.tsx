'use client';

import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import React, { useCallback, useMemo } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { capitalize } from 'lodash';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import copy from 'copy-to-clipboard';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

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
        toast.show(t('invitation_link_sent', 'Invitation link sent'));
        return;
      }
      copy(url);
      modals.closeAll();
      toast.show(t('link_copied_to_clipboard', 'Link copied to clipboard'));
    },
    []
  );

  const t = useT();

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 p-[16px] pt-0">
          {sendEmail && (
            <Input
              label="Email"
              placeholder={t('enter_email', 'Enter email')}
              name="email"
            />
          )}
          <Select label="Role" name="role">
            <option value="">{t('select_role', 'Select Role')}</option>
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
            <div>
              {t('send_invitation_via_email', 'Send invitation via email?')}
            </div>
          </div>
          <Button type="submit" className="mt-[18px]">
            {sendEmail ? t('send_invitation_link', 'Send Invitation Link') : t('copy_link', 'Copy Link')}
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
  const t = useT();
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
      user: {
        email: string;
        id: string;
      };
    }>;
  }, []);
  const addMember = useCallback(() => {
    modals.openModal({
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      title: t('top_title_add_member', 'Add Member'),
      withCloseButton: true,
      children: <AddMember />,
    });
  }, [t]);
  const { data, mutate } = useSWR('/api/teams', loadTeam, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
  const remove = useCallback(
    (toRemove: {
        user: {
          id: string;
        };
      }) =>
      async () => {
        if (
          !(await deleteDialog(
            t('are_you_sure_remove_team_member', 'Are you sure you want to remove this team member?')
          ))
        ) {
          return;
        }
        await fetch(`/settings/team/${toRemove.user.id}`, {
          method: 'DELETE',
        });
        await mutate();
      },
    [t]
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px] font-[500]">{t('team_members', 'Team Members')}</h3>
      <div className="text-pqMuted mt-[4px]">
        {t(
          'invite_your_assistant_or_team_member_to_manage_your_account',
          'Invite your assistant or team member to manage your account'
        )}
      </div>
      <div className="mt-[18px] flex flex-col gap-[10px]">
        <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] overflow-hidden">
          {(data || []).map((p) => (
            <div
              key={p.user.id}
              className="flex items-center gap-[11px] p-[13px_15px] border-b border-pqLine last:border-b-0"
            >
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-pqBrand text-[12px] font-[700] text-white">
                {capitalize(p.user.email.split('@')[0]).split('.')[0].slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-[600] truncate">
                  {capitalize(p.user.email.split('@')[0]).split('.')[0]}
                </div>
                <div className="text-[12px] text-pqMuted truncate">
                  {p.user.email}
                </div>
              </div>
              <div className="flex h-[21px] items-center rounded-[999px] bg-pqSettings px-[9px] text-[11px] font-[600] text-pqMuted">
                {p.role === 'USER'
                  ? t('user', 'User')
                  : p.role === 'ADMIN'
                  ? t('admin', 'Admin')
                  : t('super_admin', 'Super Admin')}
              </div>
              <button
                type="button"
                onClick={remove(p)}
                className={clsx(
                  'flex h-[28px] w-[28px] items-center justify-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqWarn',
                  +myLevel > +getLevel(p.role) ? '' : 'invisible'
                )}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path
                    d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMember}
          className="flex h-[34px] items-center gap-[6px] self-start rounded-pqSm bg-pqBrand ps-[11px] pe-[13px] text-[13px] font-[600] text-white hover:bg-pqBrandHover"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path d="M12 5.5v13M5.5 12h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t('invite_member', 'Invite member')}
        </button>
      </div>
    </div>
  );
};
