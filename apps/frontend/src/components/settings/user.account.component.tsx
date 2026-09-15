'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { getTimezone } from '@gitroom/frontend/components/layout/set.timezone';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useSWRConfig } from 'swr';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useRouter, useSearchParams } from 'next/navigation';
import DeleteAccountComponent from '@gitroom/frontend/components/settings/delete-account.component';
import { Skeleton } from '@gitroom/react/ui/skeleton';
import { isLinkOauthState } from '@gitroom/frontend/components/auth/google-login-return';

dayjs.extend(utc);
dayjs.extend(timezone);

type IdentityProvider = {
  provider: string;
  enabled: boolean;
  linked: boolean;
};

type IdentitiesResponse = {
  email?: string;
  name?: string | null;
  hasPassword: boolean;
  canUnlink: boolean;
  providers: IdentityProvider[];
};

const providerLabel = (
  provider: string,
  t: (key: string, fallback: string) => string,
  oauthDisplayName?: string
) => {
  switch (provider) {
    case 'GOOGLE':
      return t('google', 'Google');
    case 'GITHUB':
      return t('github', 'GitHub');
    case 'APPLE':
      return t('apple', 'Apple');
    case 'GENERIC':
      return oauthDisplayName || t('oidc', 'OIDC');
    case 'FARCASTER':
      return t('farcaster', 'Farcaster');
    case 'WALLET':
      return t('wallet', 'Wallet');
    default:
      return provider;
  }
};

const useIdentities = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const res = await fetch('/user/identities');
    if (!res.ok) {
      throw new Error('Failed to load identities');
    }
    return (await res.json()) as IdentitiesResponse;
  }, [fetch]);
  return useSWR('user-identities', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};

/**
 * Personal account: name, email, password, connected accounts, delete.
 * Timezone change stays Coming soon (User.timezone Int vs IANA).
 */
export const UserAccountComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const toaster = useToaster();
  const { mutate: globalMutate } = useSWRConfig();
  const { data, mutate, isLoading, error } = useIdentities();
  const { oauthDisplayName, isGeneral, genericOauth } = useVariables();
  const router = useRouter();
  const search = useSearchParams();
  const currentTz = useMemo(() => getTimezone(), []);
  const detectedTz = useMemo(() => dayjs.tz.guess(), []);

  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [nextEmail, setNextEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [setPasswordToken, setSetPasswordToken] = useState('');
  const [savingAuth, setSavingAuth] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    const confirmEmail = search.get('confirmEmail');
    const setPasswordParam = search.get('setPassword');
    if (confirmEmail) {
      (async () => {
        const res = await fetch('/user/email/confirm', {
          method: 'POST',
          body: JSON.stringify({ token: confirmEmail }),
        });
        if (res.ok) {
          toaster.show(t('email_updated', 'Email updated'), 'success');
          await globalMutate('/user/self');
          await mutate();
        } else {
          const { message } = await res.json().catch(() => ({ message: '' }));
          toaster.show(
            message || t('email_update_failed', 'Could not update email'),
            'warning'
          );
        }
        router.replace('/settings?tab=account', { scroll: false });
      })();
    }
    if (setPasswordParam) {
      setSetPasswordToken(setPasswordParam);
      setPasswordOpen(true);
      router.replace('/settings?tab=account', { scroll: false });
    }
  }, [search, fetch, toaster, t, globalMutate, mutate, router]);

  useEffect(() => {
    const code = search.get('code');
    const state = search.get('state');
    if (!code || !isLinkOauthState(state)) {
      return;
    }
    const provider = (
      search.get('provider') ||
      (genericOauth ? 'GENERIC' : isGeneral ? 'GOOGLE' : 'GITHUB')
    ).toUpperCase();
    (async () => {
      const res = await fetch(`/auth/oauth/${provider}/exists`, {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      });
      if (res.ok) {
        toaster.show(
          t('account_linked', 'Account connected'),
          'success'
        );
        await mutate();
      } else {
        const message = await res.text();
        toaster.show(
          message || t('account_link_failed', 'Could not connect this account'),
          'warning'
        );
      }
      router.replace('/settings?tab=account', { scroll: false });
    })();
  }, [search, fetch, genericOauth, isGeneral, toaster, t, mutate, router]);

  const saveName = useCallback(async () => {
    const fullname = name.trim();
    if (fullname.length < 3) {
      toaster.show(
        t('name_too_short', 'Name must be at least 3 characters'),
        'warning'
      );
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch('/user/personal', {
        method: 'POST',
        body: JSON.stringify({ fullname }),
      });
      if (!res.ok) {
        toaster.show(t('could_not_save', 'Could not save'), 'warning');
        return;
      }
      await globalMutate('/user/self');
      toaster.show(t('settings_updated', 'Settings updated'), 'success');
    } finally {
      setSavingName(false);
    }
  }, [name, fetch, toaster, t, globalMutate]);

  const requestEmail = useCallback(async () => {
    setSavingAuth(true);
    try {
      const res = await fetch('/user/email/request', {
        method: 'POST',
        body: JSON.stringify({
          email: nextEmail,
          password: emailPassword || undefined,
        }),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: '' }));
        toaster.show(
          message || t('email_update_failed', 'Could not update email'),
          'warning'
        );
        return;
      }
      toaster.show(
        t(
          'email_confirm_sent',
          'Check the new inbox to confirm the change'
        ),
        'success'
      );
      setEmailOpen(false);
      setNextEmail('');
      setEmailPassword('');
    } finally {
      setSavingAuth(false);
    }
  }, [fetch, nextEmail, emailPassword, toaster, t]);

  const hasPassword = data?.hasPassword ?? false;

  const savePassword = useCallback(async () => {
    if (password.length < 8) {
      toaster.show(
        t('password_too_short', 'Password must be at least 8 characters'),
        'warning'
      );
      return;
    }
    if (password !== repeatPassword) {
      toaster.show(t('passwords_do_not_match', 'Passwords do not match'), 'warning');
      return;
    }
    setSavingAuth(true);
    try {
      const res = await fetch('/user/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          password,
          repeatPassword,
          token: hasPassword ? undefined : setPasswordToken || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toaster.show(
          body.message ||
            t('password_update_failed', 'Could not update password'),
          'warning'
        );
        return;
      }
      if (body.emailed) {
        toaster.show(
          t(
            'password_confirm_sent',
            'Check your email to confirm the new password'
          ),
          'success'
        );
      } else {
        toaster.show(
          t(
            'other_sessions_signed_out',
            'Password updated. Other sessions were signed out.'
          ),
          'success'
        );
      }
      setPasswordOpen(false);
      setCurrentPassword('');
      setPassword('');
      setRepeatPassword('');
      setSetPasswordToken('');
      await mutate();
    } finally {
      setSavingAuth(false);
    }
  }, [
    password,
    repeatPassword,
    currentPassword,
    setPasswordToken,
    hasPassword,
    fetch,
    toaster,
    t,
    mutate,
  ]);

  const connectProvider = useCallback(
    async (provider: string) => {
      const res = await fetch(`/user/identities/${provider}/link`, {
        method: 'POST',
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: '' }));
        toaster.show(
          message || t('account_link_failed', 'Could not connect this account'),
          'warning'
        );
        return;
      }
      const { url } = await res.json();
      if (!url || !String(url).startsWith('http')) {
        toaster.show(
          t('account_link_failed', 'Could not connect this account'),
          'warning'
        );
        return;
      }
      window.location.href = url;
    },
    [fetch, toaster, t]
  );

  const unlinkProvider = useCallback(
    async (provider: string) => {
      if (
        !(await deleteDialog(
          t(
            'unlink_account_confirm',
            'Unlink this sign-in method from your account?'
          ),
          t('unlink', 'Unlink')
        ))
      ) {
        return;
      }
      const res = await fetch(`/user/identities/${provider}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: '' }));
        toaster.show(
          message || t('account_unlink_failed', 'Could not unlink this account'),
          'warning'
        );
        return;
      }
      toaster.show(t('account_unlinked', 'Account unlinked'), 'success');
      await mutate();
    },
    [fetch, toaster, t, mutate]
  );

  const providers = (data?.providers || []).filter((row) => row.enabled);

  if (isLoading && !data) {
    return (
      <div className="mt-[18px] flex flex-col gap-[10px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]"
          >
            <Skeleton className="h-[13px] w-[28%]" />
            <Skeleton className="mt-[8px] h-[11px] w-[54%]" />
            <Skeleton className="mt-[12px] h-[40px] w-full rounded-[10px]" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mt-[18px] rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="text-[13.5px] font-[600] text-pqText">
          {t('account', 'Account')}
        </div>
        <div className="mt-[6px] text-[12.5px] text-pqMuted">
          {t('account_load_failed', 'Could not load your account settings.')}
        </div>
        <button
          type="button"
          onClick={() => mutate()}
          className="mt-[12px] h-[32px] rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqText shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover"
        >
          {t('retry', 'Retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <div className="rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="text-[13.5px] font-[600] text-pqText">
          {t('profile', 'Profile')}
        </div>
        <div className="mt-[2px] text-[12px] text-pqMuted">
          {t('profile_description', 'Your name as it appears to your team.')}
        </div>
        <label className="mt-[12px] flex flex-col gap-[5px]">
          <span className="text-[13px] font-[500] text-pqMuted">
            {t('name', 'Name')}
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-[40px] rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
          />
        </label>
        <div className="mt-[12px]">
          <Button loading={savingName} onClick={saveName}>
            {t('save', 'Save')}
          </Button>
        </div>
        <div className="mt-[16px] text-[13px] font-[500] text-pqMuted">
          {t('email', 'Email')}
        </div>
        <div className="mt-[4px] text-[13.5px] font-[500] text-pqText">
          {user?.email}
        </div>
        {!emailOpen ? (
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className="mt-[10px] h-[32px] rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqText shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover"
          >
            {t('change', 'Change')}
          </button>
        ) : (
          <div className="mt-[12px] flex flex-col gap-[10px]">
            <input
              type="email"
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
              placeholder={t('new_email', 'New email')}
              className="h-[40px] rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
            />
            {hasPassword && (
              <input
                type="password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                placeholder={t('current_password', 'Current password')}
                className="h-[40px] rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
              />
            )}
            <div className="flex gap-[6px]">
              <Button loading={savingAuth} onClick={requestEmail}>
                {t('send_confirmation', 'Send confirmation')}
              </Button>
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                className="h-[40px] rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqMuted"
              >
                {t('cancel', 'Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="text-[13.5px] font-[600] text-pqText">
          {t('password', 'Password')}
        </div>
        <div className="mt-[2px] text-[12px] text-pqMuted">
          {hasPassword
            ? t(
                'change_password_description',
                'Changing your password signs out other sessions.'
              )
            : t(
                'set_password_description',
                'Add a password so you can sign in with email as well.'
              )}
        </div>
        {!passwordOpen ? (
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="mt-[12px] h-[32px] rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqText shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover"
          >
            {hasPassword ? t('change', 'Change') : t('set_password', 'Set password')}
          </button>
        ) : (
          <div className="mt-[12px] flex flex-col gap-[10px]">
            {hasPassword && (
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder={t('current_password', 'Current password')}
                className="h-[40px] rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
              />
            )}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('new_password', 'New password')}
              className="h-[40px] rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
            />
            <input
              type="password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              placeholder={t('repeat_password', 'Repeat password')}
              className="h-[40px] rounded-[10px] bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
            />
            <div className="flex gap-[6px]">
              <Button loading={savingAuth} onClick={savePassword}>
                {t('save', 'Save')}
              </Button>
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="h-[40px] rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqMuted"
              >
                {t('cancel', 'Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {providers.length > 0 && (
        <div className="rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
          <div className="text-[13.5px] font-[600] text-pqText">
            {t('connected_accounts', 'Connected accounts')}
          </div>
          <div className="mt-[2px] text-[12px] text-pqMuted">
            {t(
              'connected_accounts_description',
              'Link a sign-in method. You cannot unlink the last one unless a password is set.'
            )}
          </div>
          <div className="mt-[12px] flex flex-col">
            {providers.map((row) => (
              <div
                key={row.provider}
                className="flex items-center justify-between gap-[12px] border-b border-pqLine py-[10px] last:border-b-0"
              >
                <div>
                  <div className="text-[13.5px] font-[600] text-pqText">
                    {providerLabel(row.provider, t, oauthDisplayName)}
                  </div>
                  <div className="text-[12px] text-pqMuted">
                    {row.linked
                      ? t('linked', 'Linked')
                      : t('not_connected', 'Not connected')}
                  </div>
                </div>
                {row.linked ? (
                  <button
                    type="button"
                    onClick={() => unlinkProvider(row.provider)}
                    disabled={!data?.canUnlink}
                    className="h-[32px] rounded-pqSm px-[13px] text-[12.5px] font-[500] text-pqWarn shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('unlink', 'Unlink')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => connectProvider(row.provider)}
                    className="h-[32px] rounded-pqSm bg-pqBrand px-[13px] text-[12.5px] font-[600] text-pqOnBrand hover:bg-pqBrandHover"
                  >
                    {t('connect', 'Connect')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex items-start justify-between gap-[14px]">
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-[600] text-pqText">
              {t('timezone', 'Timezone')}
            </div>
            <div className="mt-[2px] text-[12px] text-pqMuted">
              {t(
                'timezone_display_description',
                'Used for notifications and how times are shown. Channel post slots keep their own offsets.'
              )}
            </div>
            <div className="mt-[10px] text-[13px] font-[500] text-pqText">
              {currentTz}
            </div>
            {currentTz !== detectedTz && (
              <div className="mt-[2px] text-[12px] text-pqSoft">
                {t('timezone_detected', 'Detected')}: {detectedTz}
              </div>
            )}
          </div>
          <span className="shrink-0 rounded-[999px] bg-pqSettings px-[9px] py-[3px] text-[11px] font-[600] text-pqMuted">
            {t('coming_soon', 'Coming soon')}
          </span>
        </div>
      </div>

      <DeleteAccountComponent />
    </div>
  );
};
