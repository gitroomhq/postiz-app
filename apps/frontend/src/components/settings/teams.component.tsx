'use client';

import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
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
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SettingsPaneEditor } from '@gitroom/frontend/components/settings/settings-pane-editor';
import { useRouter } from 'next/navigation';
import { leaveSettingsFor } from '@gitroom/frontend/components/layout/leave-settings';
import { useDevBillingStageOptional } from '@gitroom/frontend/components/billing/dev-billing-stage.provider';

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
      const { url } = await (
        await fetch('/settings/team', {
          method: 'POST',
          body: JSON.stringify(values),
        })
      ).json();
      if (values.sendEmail) {
        toast.show(t('invitation_link_sent', 'Invitation link sent'));
        onDone();
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
  };
};

type TeamLoadResult =
  | { kind: 'ok'; users: TeamRow[] }
  | { kind: 'upgrade' };

export const TeamsComponent: FC<{ onClose?: () => void }> = ({ onClose }) => {
  const fetch = useFetch();
  const user = useUser();
  const t = useT();
  const [inviting, setInviting] = useState(false);
  const lookBilling = useDevBillingStageOptional();
  const lookUnlocksTeams =
    !!lookBilling?.active && !!user?.tier?.team_members;
  const myLevel = user?.role === 'USER' ? 0 : user?.role === 'ADMIN' ? 1 : 2;
  const getLevel = useCallback(
    (role: 'USER' | 'ADMIN' | 'SUPERADMIN') =>
      role === 'USER' ? 0 : role === 'ADMIN' ? 1 : 2,
    []
  );
  const loadTeam = useCallback(async (): Promise<TeamLoadResult> => {
    const res = await fetch('/settings/team');
    // Backend is source of truth for real subscriptions. DEV LOOK override can
    // claim team_members while GET still 402s — unlock the Teams UI for preview
    // (empty list) instead of forcing TeamsUpgradeLock.
    if (res.status === 402) {
      if (lookUnlocksTeams) {
        return { kind: 'ok', users: [] };
      }
      return { kind: 'upgrade' };
    }
    if (!res.ok) {
      return { kind: 'ok', users: [] };
    }
    const body = await res.json();
    return { kind: 'ok', users: (body.users || []) as TeamRow[] };
  }, [fetch, lookUnlocksTeams]);
  const { data, mutate } = useSWR('/api/teams', loadTeam, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  useEffect(() => {
    void mutate();
  }, [lookUnlocksTeams, mutate]);

  const remove = useCallback(
    (toRemove: {
        user: {
          id: string;
        };
      }) =>
      async () => {
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
    [t, fetch, mutate]
  );

  if (data?.kind === 'upgrade') {
    return <TeamsUpgradeLock onClose={onClose} />;
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

  return (
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <div className="overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        {rows.map((p) => (
          <div
            key={p.user.id}
            className="flex items-center gap-[11px] border-b border-pqLine p-[13px_15px] last:border-b-0"
          >
            <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-pqBrand text-[12px] font-[700] text-white">
              {capitalize(p.user.email.split('@')[0]).split('.')[0].slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-[600]">
                {capitalize(p.user.email.split('@')[0]).split('.')[0]}
              </div>
              <div className="mt-[1px] truncate text-[12px] text-pqMuted">
                {p.user.email}
              </div>
            </div>
            <div className="grid h-[21px] shrink-0 place-items-center rounded-[999px] bg-pqSettings px-[9px] text-[11px] font-[600] text-pqMuted">
              {p.role === 'USER'
                ? t('user', 'User')
                : p.role === 'ADMIN'
                ? t('admin', 'Admin')
                : t('super_admin', 'Super Admin')}
            </div>
            <button
              type="button"
              onClick={remove(p)}
              aria-label={t('remove', 'Remove')}
              className={clsx(
                'grid h-[28px] w-[28px] place-items-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqWarn',
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
 * Settings is an intercepting `@modal/(.)settings` overlay — a bare Link to
 * `/billing` can leave the scrim stranded; `back()`+`push()` races. Use
 * `leaveSettingsFor` (single soft `router.push`).
 */
export const TeamsUpgradeLock: FC<{ onClose?: () => void }> = () => {
  const t = useT();
  const router = useRouter();
  const goBilling = useCallback(() => {
    leaveSettingsFor('/billing', router);
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
