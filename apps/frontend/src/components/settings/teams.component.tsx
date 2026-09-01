'use client';

import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import React, { FC, useCallback, useMemo, useState } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { capitalize } from 'lodash';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { UpdateTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/update.team.member.dto';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { EditIcon, MailIcon, TrashIcon } from '@gitroom/frontend/components/ui/icons';
import copy from 'copy-to-clipboard';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type TeamRow = {
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  user: {
    id: string;
    email: string;
    name?: string | null;
    activated: boolean;
  };
};

const roleOptions = (t: ReturnType<typeof useT>) => [
  { value: 'USER', label: t('user', 'User') },
  { value: 'ADMIN', label: t('admin', 'Admin') },
];

const displayName = (p: TeamRow) =>
  p.user.name || capitalize(p.user.email.split('@')[0]).split('.')[0];

export const AddMember = () => {
  const modals = useModals();
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();
  const resolver = useMemo(() => {
    return classValidatorResolver(AddTeamMemberDto);
  }, []);
  const form = useForm({
    values: {
      email: '',
      name: '',
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
    async (values: {
      email: string;
      name: string;
      role: string;
      sendEmail: boolean;
    }) => {
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
          <Input
            label={t('name_optional', 'Name (optional)')}
            placeholder={t('enter_name', 'Enter name')}
            name="name"
          />
          <Select label="Role" name="role">
            <option value="">{t('select_role', 'Select Role')}</option>
            {roleOptions(t).map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
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
            {sendEmail
              ? t('send_invitation_link', 'Send Invitation Link')
              : t('copy_link', 'Copy Link')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

// Editing my own row: only the name is editable, and it goes through the
// existing self-scoped personal-details endpoint (never through the
// team-member endpoint, which explicitly refuses to target the caller).
const EditSelfForm: FC<{
  member: TeamRow;
  onSaved: () => void;
}> = ({ member, onSaved }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const resolver = useMemo(() => classValidatorResolver(UserDetailDto), []);
  const form = useForm({
    resolver,
    values: { fullname: member.user.name || '' },
  });

  const submit = useCallback(async (values: { fullname: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/user/personal', {
        method: 'POST',
        body: JSON.stringify({ fullname: values.fullname }),
      });

      if (response.status !== 200 && response.status !== 201) {
        const { message } = await response.json().catch(() => ({
          message: '',
        }));
        toaster.show(
          message ||
            t('could_not_update_profile', 'Could not update your profile'),
          'warning'
        );
        return;
      }

      toaster.show(t('profile_updated', 'Profile updated'), 'success');
      onSaved();
    } finally {
      setLoading(false);
    }
  }, [onSaved]);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 p-[16px] pt-0">
          <Input label={t('name', 'Name')} name="fullname" />
          <Button type="submit" loading={loading} className="mt-[18px]">
            {t('save', 'Save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

// Editing another member I'm allowed to manage: name always, role only
// when I'm a super admin (the server enforces this independently of what
// this form sends).
const EditTeamMemberForm: FC<{
  member: TeamRow;
  canChangeRole: boolean;
  onSaved: () => void;
}> = ({ member, canChangeRole, onSaved }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const resolver = useMemo(() => classValidatorResolver(UpdateTeamMemberDto), []);
  const form = useForm({
    resolver,
    values: {
      name: member.user.name || '',
      role: member.role === 'SUPERADMIN' ? 'ADMIN' : member.role,
    },
  });

  const submit = useCallback(
    async (values: { name: string; role: string }) => {
      setLoading(true);
      try {
        const response = await fetch(`/settings/team/${member.user.id}`, {
          method: 'PUT',
          body: JSON.stringify(
            canChangeRole
              ? { name: values.name, role: values.role }
              : { name: values.name }
          ),
        });

        if (response.status !== 200 && response.status !== 201) {
          const { message } = await response.json().catch(() => ({
            message: '',
          }));
          toaster.show(
            message ||
              t(
                'could_not_update_team_member',
                'Could not update team member'
              ),
            'warning'
          );
          return;
        }

        toaster.show(
          t('team_member_updated', 'Team member updated'),
          'success'
        );
        onSaved();
      } finally {
        setLoading(false);
      }
    },
    [member.user.id, canChangeRole, onSaved]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 p-[16px] pt-0">
          <Input label={t('name', 'Name')} name="name" />
          {canChangeRole && (
            <Select label={t('role', 'Role')} name="role">
              {roleOptions(t).map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          )}
          <Button type="submit" loading={loading} className="mt-[18px]">
            {t('save', 'Save')}
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
    return (await (await fetch('/settings/team')).json()).users as TeamRow[];
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
  const toaster = useToaster();
  const sortedData = useMemo(
    () =>
      [...(data || [])].sort((a, b) =>
        displayName(a).localeCompare(displayName(b))
      ),
    [data]
  );
  const resetPassword = useCallback(
    (member: TeamRow) => async () => {
      if (
        !(await deleteDialog(
          t(
            'send_password_reset_email_confirm',
            'A password reset email will be sent to {{email}}. Continue?',
            { email: member.user.email }
          ),
          t('yes_send_it', 'Yes, send it'),
          t('send_password_reset_email', 'Send password reset email')
        ))
      ) {
        return;
      }
      await fetch('/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email: member.user.email, provider: 'LOCAL' }),
      });
      toaster.show(
        t(
          'password_reset_email_sent',
          'If an account exists for this email, a reset link was sent'
        ),
        'success'
      );
    },
    [t, toaster]
  );
  const remove = useCallback(
    (toRemove: TeamRow) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_remove_team_member',
            'Are you sure you want to remove this team member?'
          )
        ))
      ) {
        return;
      }
      await fetch(`/settings/team/${toRemove.user.id}`, {
        method: 'DELETE',
      });
      await mutate();
    },
    [t, mutate]
  );

  const editMember = useCallback(
    (member: TeamRow) => {
      const isSelf = member.user.id === user?.id;
      modals.openModal({
        title: t('edit_team_member', 'Edit team member'),
        withCloseButton: true,
        children: isSelf ? (
          <EditSelfForm
            member={member}
            onSaved={async () => {
              modals.closeAll();
              await mutate();
            }}
          />
        ) : (
          <EditTeamMemberForm
            member={member}
            canChangeRole={myLevel === 2}
            onSaved={async () => {
              modals.closeAll();
              await mutate();
            }}
          />
        ),
      });
    },
    [modals, t, mutate, user?.id, myLevel]
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('team_members', 'Team Members')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'invite_your_assistant_or_team_member_to_manage_your_account',
          'Invite your assistant or team member to manage your account'
        )}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
        <div className="flex items-center justify-between">
          <div className="mt-[4px]">{t('team_members', 'Team Members')}</div>
          <Button onClick={addMember}>
            {t('add_another_member', 'Add another member')}
          </Button>
        </div>
        <div className="flex flex-col">
          {sortedData.map((p) => {
            const isSelf = p.user.id === user?.id;
            const canManage = +myLevel > +getLevel(p.role);
            return (
              <div
                key={p.user.id}
                className="flex items-center gap-[16px] py-[12px] border-b border-newTableBorder last:border-b-0"
              >
                <div className="flex-1 flex items-center gap-[8px]">
                  {displayName(p)}
                  {isSelf && (
                    <span className="text-[11px] font-[600] px-[8px] py-[2px] rounded-full bg-boxFocused text-textItemFocused">
                      {t('you', 'You')}
                    </span>
                  )}
                  {!p.user.activated && (
                    <span className="text-[11px] font-[600] px-[8px] py-[2px] rounded-full bg-red-500/10 text-red-400">
                      {t('not_verified', 'Not verified')}
                    </span>
                  )}
                </div>
                <div className="w-[110px]">
                  {p.role === 'USER'
                    ? t('user', 'User')
                    : p.role === 'ADMIN'
                    ? t('admin', 'Admin')
                    : t('super_admin', 'Super Admin')}
                </div>
                <div
                  className="w-[220px] truncate text-customColor18"
                  title={p.user.email}
                >
                  {p.user.email}
                </div>
                <div className="flex gap-[12px] justify-end w-[96px]">
                  {(isSelf || canManage) && (
                    <div
                      className="cursor-pointer text-customColor18 hover:text-newTextColor"
                      onClick={() => editMember(p)}
                    >
                      <EditIcon size={16} />
                    </div>
                  )}
                  {canManage && !isSelf && p.user.activated && (
                    <div
                      className="cursor-pointer text-customColor18 hover:text-newTextColor"
                      onClick={resetPassword(p)}
                    >
                      <MailIcon size={16} />
                    </div>
                  )}
                  {canManage && !isSelf && (
                    <div
                      className="cursor-pointer text-red-400 hover:text-red-500"
                      onClick={remove(p)}
                    >
                      <TrashIcon size={16} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
