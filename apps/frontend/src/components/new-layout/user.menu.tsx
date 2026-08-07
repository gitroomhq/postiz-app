'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';
import { useThemeMode } from '@gitroom/frontend/components/layout/mode.component';
import {
  useMenuFilter,
  useMenuItem,
} from '@gitroom/frontend/components/layout/top.menu';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useAnchoredPopover } from '@gitroom/frontend/components/layout/use.anchored.popover';

/** First initial for the avatar fallback, from name or email. */
function initialOf(user: { name?: string; email?: string } | undefined) {
  const source = user?.name?.trim() || user?.email?.trim() || '';
  return source ? source[0].toUpperCase() : '?';
}

/**
 * Full label for the menu header: trimmed `user.name`, else email local-part,
 * else "Account". Header chip uses only the first whitespace token (given name).
 */
function userDisplayNames(user: { name?: string; email?: string }) {
  const fullName =
    user.name?.trim() || user.email?.split('@')[0] || 'Account';
  const firstName = fullName.split(/\s+/)[0] || fullName;
  return { fullName, firstName };
}

const ROW =
  'flex w-full items-center gap-[10px] rounded-pqSm px-[10px] py-[8px] text-start text-[13px] transition-colors hover:bg-pqHover';

const Divider = ({ className }: { className?: string }) => (
  <div className={clsx('h-[1px] bg-pqLine', className)} />
);

/**
 * Identity in the top-right: avatar + given name that opens a menu with the
 * full name, email, Settings, Billing, the theme switch and Logout.
 *
 * The design chrome is avatar-only (name lives in the menu / tooltip); owner
 * asked to show the given name in the header too. Avatar stays before the name
 * in DOM order (left→right in LTR; start→end in RTL). `data-hdr-name` hides
 * the label under tablet width, matching the prototype's leftover rule.
 *
 * The theme control used to be its own header icon. The redesign folds it in
 * here, so this is now the only place the app writes the `mode` cookie outside
 * the paywall header — the cookie, the emitter and the `<body>` class are all
 * still `mode.component.tsx`'s, reached through `useThemeMode()`.
 */
export const UserMenu = () => {
  const t = useT();
  const user = useUser();
  const router = useRouter();
  const fetch = useFetch();
  const { isSecured, affiliateUrl, billingEnabled } = useVariables();
  const { mode, setMode } = useThemeMode();
  const { secondMenu } = useMenuItem();
  const filter = useMenuFilter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { referenceRef, floatingRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >(open, 'end');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const logout = useCallback(async () => {
    setOpen(false);
    if (
      await deleteDialog(
        t('are_you_sure_you_want_to_logout', 'Are you sure you want to logout?'),
        t('yes_logout', 'Yes logout')
      )
    ) {
      if (!isSecured) {
        setCookie('auth', '', -10);
      } else {
        await fetch('/user/logout', { method: 'POST' });
      }
      window.location.href = '/';
    }
  }, [isSecured]);

  if (!user) return null;

  const { fullName, firstName } = userDisplayNames(user);
  const picture = (user as { picture?: { path?: string } }).picture?.path;

  // Same gate the rail applies, so the menu cannot reach a screen the rail
  // deliberately hides.
  const billing = secondMenu.find((f) => f.path === '/billing');
  const showBilling = !!billing && filter(billing);
  // Affiliate left Settings when the sub-nav matched the design; same gates as
  // before (configured URL, billing on, member+ roles).
  const showAffiliate =
    !!affiliateUrl &&
    !!billingEnabled &&
    ['ADMIN', 'SUPERADMIN', 'USER'].includes(user?.role!);

  const avatar = (size: string, text: string) => (
    <span
      className={clsx(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-pqBrand font-[600] text-white',
        size,
        text
      )}
    >
      {picture ? (
        <img src={picture} alt="" className="size-full object-cover" />
      ) : (
        initialOf(user)
      )}
    </span>
  );

  return (
    <div ref={ref} className="relative flex shrink-0 items-center">
      <button
        type="button"
        ref={referenceRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('account_menu', 'Account menu')}
        className={clsx(
          'flex h-[30px] max-w-[200px] items-center gap-[8px] rounded-[8px] p-[2px] transition-colors hover:bg-pqHover',
          open && 'bg-pqHover'
        )}
      >
        {avatar('size-[26px]', 'text-[11px]')}
        <span
          data-hdr-name="1"
          className="min-w-0 truncate pe-[6px] text-[12.5px] font-[500] -tracking-[0.1px] text-pqText"
        >
          {firstName}
        </span>
      </button>

      {open && (
        <div
          ref={floatingRef}
          role="menu"
          className="z-[300] w-[248px] animate-pqPop rounded-pqMd border border-pqBorder bg-pqInner p-[6px] shadow-pq"
        >
          <div className="flex items-center gap-[10px] px-[10px] pb-[10px] pt-[8px]">
            {avatar('size-[32px]', 'text-[13px]')}
            <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
              <span className="truncate text-[13px] font-[600] text-pqText">
                {fullName}
              </span>
              <span className="truncate text-[11.5px] text-pqSoft">
                {user.email}
              </span>
            </div>
          </div>
          <Divider className="mx-[4px] mb-[6px]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.push('/settings');
            }}
            className={clsx(ROW, 'text-pqText')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            {t('settings', 'Settings')}
          </button>

          {showBilling && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push('/billing');
              }}
              className={clsx(ROW, 'text-pqText')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M2.5 9.5h19M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {user?.isLifetime
                ? t('lifetime_deal', 'Lifetime deal')
                : t('billing_and_invoices', 'Billing & invoices')}
            </button>
          )}

          {showAffiliate && (
            <a
              role="menuitem"
              href={affiliateUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className={clsx(ROW, 'text-pqText')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 8v6M22 11h-6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('affiliate', 'Affiliate')}
            </a>
          )}

          <Divider className="mx-[4px] my-[6px]" />

          <div className="flex items-center gap-[8px] px-[10px] pb-[8px] pt-[6px]">
            <span className="flex-1 text-[13px] text-pqMuted">
              {t('theme', 'Theme')}
            </span>
            <div className="flex gap-[2px] rounded-full bg-pqSettings p-[2px]">
              {(
                [
                  {
                    key: 'light' as const,
                    label: t('switch_to_light_mode', 'Switch to light mode'),
                    d: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
                  },
                  {
                    key: 'dark' as const,
                    label: t('switch_to_dark_mode', 'Switch to dark mode'),
                    d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
                  },
                ]
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMode(option.key)}
                  aria-label={option.label}
                  aria-pressed={mode === option.key}
                  data-tooltip-id="tooltip"
                  data-tooltip-content={option.label}
                  className={clsx(
                    'grid h-[24px] w-[28px] place-items-center rounded-full transition-colors',
                    mode === option.key
                      ? 'bg-pqInner text-pqText'
                      : 'text-pqSoft hover:text-pqText'
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d={option.d}
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <Divider className="mx-[4px] mb-[6px] mt-[2px]" />

          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className={clsx(ROW, 'text-pqWarn')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('sign_out', 'Sign out')}
          </button>
        </div>
      )}
    </div>
  );
};
