'use client';

// The frame around every auth form: logo on top, copyright and legal links at
// the bottom. Login / Create account switching lives next to the form
// (AuthModeSwitch + AuthModeFooter), not in this header. Nobody looking at the
// fields was finding the opposite action in the top-right corner.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';

export const AuthNav = () => {
  return (
    <header className="flex items-center">
      <LogoTextComponent />
    </header>
  );
};

export const AuthModeSwitch = () => {
  const t = useT();
  const pathname = usePathname();
  const onLogin = pathname === '/auth/login';

  const tabClass = (active: boolean) =>
    `flex h-[40px] items-center justify-center rounded-[8px] text-[14px] font-[500] transition-colors ${
      active
        ? 'bg-boxHover text-newTextColor'
        : 'text-textItemBlur hover:text-newTextColor'
    }`;

  return (
    <nav
      aria-label={t('auth_mode', 'Sign in or create an account')}
      className="mt-[20px] grid grid-cols-2 gap-[4px] rounded-[10px] border border-pqBorder p-[4px]"
    >
      <Link
        href="/auth/login"
        className={tabClass(onLogin)}
        aria-current={onLogin ? 'page' : undefined}
      >
        {t('sign_in', 'Sign In')}
      </Link>
      <Link
        href="/auth"
        className={tabClass(!onLogin)}
        aria-current={!onLogin ? 'page' : undefined}
      >
        {t('create_account_tab', 'Create account')}
      </Link>
    </nav>
  );
};

export const AuthModeFooter = () => {
  const t = useT();
  const pathname = usePathname();
  const onLogin = pathname === '/auth/login';

  return (
    <p className="mt-[20px] text-center text-[14px] text-textItemBlur">
      {onLogin ? (
        <>
          {t('dont_have_an_account', "Don't have an account?")}{' '}
          <Link
            href="/auth"
            className="font-[500] text-newTextColor underline hover:font-bold"
          >
            {t('create_one', 'Create one')}
          </Link>
        </>
      ) : (
        <>
          {t('already_have_an_account', 'Already have an account?')}{' '}
          <Link
            href="/auth/login"
            className="font-[500] text-newTextColor underline hover:font-bold"
          >
            {t('sign_in', 'Sign In')}
          </Link>
        </>
      )}
    </p>
  );
};

/** `year` comes from the server so the copyright never hydrates twice. */
export const AuthFooter = ({ year }: { year: number }) => {
  const t = useT();
  const { legalUrl } = useVariables();

  return (
    <footer className="flex items-center justify-between gap-[16px] text-[12px] text-textItemBlur">
      <span>© {year} PostQueen</span>
      {/* Only link legal pages this deployment actually serves — a self-hosted
          install without LEGAL_URL would otherwise footer-link two 404s. */}
      {!!legalUrl && (
        <div className="flex items-center gap-[10px]">
          <a
            href={`${legalUrl}/terms-of-service`}
            rel="nofollow"
            className="transition-colors hover:text-newTextColor"
          >
            {t('terms', 'Terms')}
          </a>
          <span aria-hidden="true" className="text-newBorder">
            |
          </span>
          <a
            href={`${legalUrl}/privacy-policy`}
            rel="nofollow"
            className="transition-colors hover:text-newTextColor"
          >
            {t('privacy', 'Privacy')}
          </a>
        </div>
      )}
    </footer>
  );
};
