'use client';

import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import React, { FC, useCallback, useMemo, useState } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { capitalize } from 'lodash';
import { ModalFormActions } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import copy from 'copy-to-clipboard';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SettingsPaneEditor } from '@gitroom/frontend/components/settings/settings-pane-editor';
import { useRouter } from 'next/navigation';
import { leaveSettingsFor } from '@gitroom/frontend/components/layout/leave-settings';
import { Skeleton } from '@gitroom/react/ui/skeleton';
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
export const AddMember: FC<{
  onCancel: () => void;
  onDone: () => void;
}> = ({ onCancel, onDone }) => {
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();
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
      // The invite awaits sendEmail server-side, so an unconfigured mail
      // provider gives a 500 — and customFetch resolves it. Unchecked, that
      // reported "Invitation link sent" for an invite nobody received, and on
      // the copy path put the literal string "undefined" on the clipboard.
      const response = await fetch('/settings/team', {
        method: 'POST',
        body: JSON.stringify(values),
      });

        if (!response?.ok) {
        const { message } = await response.json().catch(() => ({ message: '' }));
        toast.show(
          message ||
            t('team_invite_failed', 'Could not send the invitation, please try again'),
          'warning'
        );
        return;
      }

      const { url } = await response.json().catch(() => ({} as any));

      if (values.sendEmail) {
        toast.show(t('invitation_link_sent', 'Invitation link sent'));
        onDone();
        return;
      }

      if (!url) {
        toast.show(
          t('team_invite_failed', 'Could not send the invitation, please try again'),
          'warning'
        );
        return;
      }

      copy(url);
      toast.show(t('link_copied_to_clipboard', 'Link copied to clipboard'));
      onDone();
    },
    [fetch, toast, t, onDone]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex flex-1 flex-col gap-[16px] pt-0">
          {sendEmail && (
            <Input
              label={t('email', 'Email')}
              placeholder={t('enter_email', 'Enter email')}
              name="email"
            />
          )}
          <Select label={t('role', 'Role')} name="role" hideErrors={true}>
            <option value="">{t('select_role', 'Select Role')}</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.name}
              </option>
            ))}
          </Select>
          <Checkbox
            name="sendEmail"
            label={t(
              'send_invitation_via_email',
              'Send invitation via email'
            )}
          />
          <p className="-mt-[8px] ps-[28px] text-[12.5px] leading-[1.45] text-pqMuted">
            {sendEmail
              ? t(
                  'add_member_email_hint',
                  'We’ll email them a link to join this workspace.'
                )
              : t(
                  'add_member_copy_hint',
                  'Copy a link and share it yourself — no email is sent.'
                )}
          </p>
          <div className="flex justify-end">
            <ModalFormActions onCancel={onCancel}>
              <Button
                type="submit"
                className="h-[40px] shrink-0 rounded-[10px] px-[18px] text-[13.5px] font-[600]"
              >
                {sendEmail
                  ? t('send_invitation_link', 'Send invitation link')
                  : t('copy_link', 'Copy invite link')}
              </Button>
            </ModalFormActions>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
type TeamRow = {
  id: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  user: {
    email: string;
    id: string;
    name?: string | null;
    providerName?: string;
  };
};

type TeamLoadResult =
  | { kind: 'ok'; users: TeamRow[] }
  | { kind: 'upgrade' };

export const TeamsComponent: FC = () => {
  const fetch = useFetch();
  const user = useUser();
  const t = useT();
  const toast = useToaster();
  const [inviting, setInviting] = useState(false);
  const myLevel = user?.role === 'USER' ? 0 : user?.role === 'ADMIN' ? 1 : 2;
  const getLevel = useCallback(
    (role: 'USER' | 'ADMIN' | 'SUPERADMIN') =>
      role === 'USER' ? 0 : role === 'ADMIN' ? 1 : 2,
    []
  );
  const loadTeam = useCallback(async (): Promise<TeamLoadResult> => {
    const res = await fetch('/settings/team');
    if (res.status === 402) {
      return { kind: 'upgrade' };
    }
    if (!res.ok) {
      return { kind: 'ok', users: [] };
    }
    const body = await res.json();
    return { kind: 'ok', users: (body.users || []) as TeamRow[] };
  }, [fetch]);
  const { data, isLoading, mutate } = useSWR('/api/teams', loadTeam, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  const remove = useCallback(
    (toRemove: TeamRow) =>
      async () => {
        const isSelf = toRemove.user.id === user?.id;
        if (
          !(await deleteDialog(
            isSelf
              ? t(
                  'are_you_sure_leave_workspace',
                  'Are you sure you want to leave this workspace?'
                )
              : t(
                  'are_you_sure_remove_team_member',
                  'Are you sure you want to remove this team member?'
                ),
            isSelf ? t('leave', 'Leave') : undefined
          ))
        ) {
          return;
        }
        const res = isSelf
          ? await fetch('/settings/team/leave', { method: 'POST' })
          : await fetch(`/settings/team/${toRemove.user.id}`, {
              method: 'DELETE',
            });
        if (!res.ok) {
          const { message } = await res.json().catch(() => ({ message: '' }));
          toast.show(
            message || t('team_action_failed', 'Could not update the team'),
            'warning'
          );
          return;
        }
        await mutate();
      },
    [t, fetch, mutate, user?.id, toast]
  );

  const changeRole = useCallback(
    async (member: TeamRow, role: 'USER' | 'ADMIN') => {
      if (role === member.role) {
        return;
      }
      const res = await fetch(`/settings/team/${member.user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: '' }));
        toast.show(
          message || t('team_action_failed', 'Could not update the team'),
          'warning'
        );
        return;
      }
      await mutate();
    },
    [fetch, mutate, t, toast]
  );

  const transfer = useCallback(
    async (member: TeamRow) => {
      if (
        !(await deleteDialog(
          t(
            'transfer_ownership_confirm',
            'Transfer Super Admin to this member? You will become an Admin.'
          ),
          t('transfer', 'Transfer'),
          t('transfer_ownership', 'Transfer ownership'),
          undefined,
          false
        ))
      ) {
        return;
      }
      const res = await fetch('/settings/team/transfer', {
        method: 'POST',
        body: JSON.stringify({ userId: member.user.id, confirm: true }),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: '' }));
        toast.show(
          message || t('team_action_failed', 'Could not update the team'),
          'warning'
        );
        return;
      }
      await mutate();
    },
    [fetch, mutate, t, toast]
  );

  if (data?.kind === 'upgrade') {
    return <TeamsUpgradeLock />;
  }

  if (inviting) {
    return (
      <SettingsPaneEditor
        title={t('top_title_add_member', 'Add Member')}
        description={t(
          'add_member_description',
          'Invite a teammate by email, or copy a link to share yourself.'
        )}
        onBack={() => setInviting(false)}
      >
        <AddMember
          onCancel={() => setInviting(false)}
          onDone={() => {
            mutate();
            setInviting(false);
          }}
        />
      </SettingsPaneEditor>
    );
  }

  const rows = data?.kind === 'ok' ? data.users : [];
  const superAdminCount = rows.filter((r) => r.role === 'SUPERADMIN').length;

  // An empty roster and a roster in flight are the same `[]` here, so the
  // member list waits for the fetch rather than offering "Invite member" to a
  // workspace that already has a team.
  if (isLoading) {
    return (
      <div className="mt-[18px] flex flex-col gap-[10px]">
        <div className="overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-[11px] border-b border-pqLine p-[13px_15px] last:border-b-0"
            >
              <Skeleton className="size-[30px] shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <Skeleton className="h-[13px] w-[46%]" />
                <Skeleton className="h-[11px] w-[24%]" />
              </div>
              <Skeleton className="h-[28px] w-[64px] shrink-0 rounded-pqSm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <div className="overflow-x-auto rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="min-w-[360px]">
        <div className="flex items-center gap-[11px] border-b border-pqLine px-[15px] py-[8px] text-[11px] font-[600] uppercase tracking-[0.04em] text-pqMuted">
          <div className="min-w-0 flex-1">{t('member', 'Member')}</div>
          <div className="w-[104px] shrink-0">{t('role', 'Role')}</div>
          <div className="w-[108px] shrink-0 text-end">
            {t('actions', 'Actions')}
          </div>
        </div>
        {rows.map((p) => {
          const displayName =
            p.user.name?.trim() ||
            capitalize(p.user.email.split('@')[0]).split('.')[0];
          const canManage = +myLevel > +getLevel(p.role);
          const isSelf = p.user.id === user?.id;
          const canLeave =
            isSelf && !(p.role === 'SUPERADMIN' && superAdminCount <= 1);
          const canTransfer =
            user?.role === 'SUPERADMIN' &&
            p.role === 'ADMIN' &&
            !isSelf;
          return (
            <div
              key={p.user.id}
              className="flex items-center gap-[11px] border-b border-pqLine p-[13px_15px] last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 items-center gap-[11px]">
                <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-pqBrand text-[12px] font-[700] text-pqOnBrand">
                  {displayName.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-[600]">
                    {displayName}
                  </div>
                  <div className="mt-[1px] truncate text-[12px] text-pqMuted">
                    {p.user.email}
                  </div>
                </div>
              </div>
              <div className="w-[104px] shrink-0">
                {canManage && p.role !== 'SUPERADMIN' ? (
                  <select
                    aria-label={t('role', 'Role')}
                    value={p.role}
                    onChange={(e) =>
                      changeRole(p, e.target.value as 'USER' | 'ADMIN')
                    }
                    className="h-[28px] w-full rounded-[7px] border-0 bg-pqSettings px-[8px] text-[12px] font-[600] text-pqText outline-none"
                  >
                    <option value="USER">{t('user', 'User')}</option>
                    <option value="ADMIN">{t('admin', 'Admin')}</option>
                  </select>
                ) : (
                  <div className="grid h-[21px] w-fit place-items-center rounded-[999px] bg-pqSettings px-[9px] text-[11px] font-[600] text-pqMuted">
                    {p.role === 'USER'
                      ? t('user', 'User')
                      : p.role === 'ADMIN'
                      ? t('admin', 'Admin')
                      : t('super_admin', 'Super Admin')}
                  </div>
                )}
              </div>
              <div className="flex w-[108px] shrink-0 items-center justify-end gap-[6px]">
                {canTransfer ? (
                  <button
                    type="button"
                    onClick={() => transfer(p)}
                    className="h-[28px] rounded-[7px] px-[8px] text-[12px] font-[600] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
                  >
                    {t('transfer', 'Transfer')}
                  </button>
                ) : null}
                {canLeave ? (
                  <button
                    type="button"
                    onClick={remove(p)}
                    className="h-[28px] rounded-[7px] px-[8px] text-[12px] font-[600] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqWarn"
                  >
                    {t('leave', 'Leave')}
                  </button>
                ) : null}
                {canManage ? (
                  <button
                    type="button"
                    onClick={remove(p)}
                    aria-label={t('remove', 'Remove')}
                    className="grid h-[28px] w-[28px] place-items-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqWarn"
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
                ) : null}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setInviting(true)}
        className="flex h-[34px] items-center gap-[7px] self-start rounded-pqSm bg-pqBrand ps-[11px] pe-[13px] text-[13px] font-[600] text-pqOnBrand hover:bg-pqBrandHover"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
          <path
            d="M12 5.5v13M5.5 12h13"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
        {t('invite_member', 'Invite member')}
      </button>
    </div>
  );
};

/**
 * Plan lacks `team_members` — show an inline upgrade pane instead of mounting
 * TeamsComponent (which would GET /settings/team and trip the global 402 Payment
 * Required dialog). Org admins still reach this via Settings nav.
 *
 * Visual: same lock-card language as TrialLockCard / analytics empty states
 * (brand-soft icon tile, inset card, centered copy). Design prototype hides
 * the Teams tab when gated — no locked empty state there; this is the repo
 * owner path (keep tab discoverable). CTA matches design rail `upgradeCta`
 * ("Upgrade plan"); team seats unlock at Growth, so do not say "Upgrade to Pro".
 *
 * Settings is an intercepting `@modal/(.)settings` overlay. The sheet dismisses
 * itself once the pathname leaves `/settings` (`useRouteOverlayActive`), so a
 * single navigation is enough — do not also call the parent `onClose`, which is
 * a history `back()` and would race the push. `replace` keeps the gated pane out
 * of history: Back from `/billing` returns to the page from before Settings.
 */
export const TeamsUpgradeLock: FC = () => {
  const t = useT();
  const router = useRouter();
  const goBilling = useCallback(() => {
    leaveSettingsFor('/billing', router, { replace: true });
  }, [router]);

  return (
    <div
      data-teams-upgrade-lock="1"
      className="mt-[18px] flex w-full flex-col items-center justify-center rounded-pqMd bg-pqPop px-[24px] py-[44px] text-center shadow-[inset_0_0_0_1px_var(--border)]"
    >
      <span className="grid size-[52px] place-items-center rounded-[16px] bg-pqBrandSoft text-pqBrand">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 10V7.5a5 5 0 0 1 10 0V10M6 10h12a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 6 10Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="mt-[16px] font-display text-[18px] font-[600] tracking-[-0.01em] text-pqText">
        {t('unlock_team_members', 'Unlock team members')}
      </div>
      <div className="mt-[8px] max-w-[420px] text-[13.5px] leading-[1.6] text-pqMuted text-pretty">
        {t(
          'subscription_does_not_include_team_members',
          'Your subscription does not include team members. Please upgrade your subscription to invite your team.'
        )}
      </div>
      <button
        type="button"
        onClick={goBilling}
        className="mt-[20px] flex h-[40px] items-center justify-center rounded-pqSm bg-pqBrand px-[20px] text-[13.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
      >
        {t('upgrade_plan', 'Upgrade plan')}
      </button>
    </div>
  );
};
