'use client';

// The frame around every auth form: logo on top, copyright and legal links at
// the bottom. Login / Create account switching lives next to the form
// (AuthModeSwitch + AuthModeFooter), not in this header. Nobody looking at the
// fields was finding the opposite action in the top-right corner.

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { ChevronLeftIcon } from '@gitroom/frontend/components/ui/icons';

/** Phone auth hides email fields until this query is set. Desktop ignores it. */
export const AUTH_EMAIL_METHOD = 'email';

export const isAuthEmailMethod = (searchParams: {
  get: (key: string) => string | null;
}) => searchParams.get('method') === AUTH_EMAIL_METHOD;

export const authModeHref = (
  path: '/auth' | '/auth/login',
  emailMethod: boolean,
) => (emailMethod ? `${path}?method=${AUTH_EMAIL_METHOD}` : path);

export const AuthNav = () => {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const emailMethod = isAuthEmailMethod(searchParams);
  const innerAuth =
    pathname.startsWith('/auth/forgot') ||
    pathname.startsWith('/auth/activate');
  const showBack = emailMethod || innerAuth;

  return (
    <header className="flex items-center gap-[4px]">
      {showBack && (
        <button
          type="button"
          onClick={() =>
            innerAuth ? router.push('/auth/login') : router.replace(pathname)
          }
          aria-label={t('back', 'Back')}
          className={`${
            emailMethod && !innerAuth ? 'lg:hidden' : ''
          } -ms-[8px] flex size-[40px] shrink-0 items-center justify-center rounded-[8px] text-newTextColor hover:bg-boxHover`}
        >
          <ChevronLeftIcon size={22} />
        </button>
      )}
      <LogoTextComponent />
    </header>
  );
};

export const AuthModeSwitch = () => {
  const t = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onLogin = pathname === '/auth/login';
  const emailMethod = isAuthEmailMethod(searchParams);

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
        href={authModeHref('/auth/login', emailMethod)}
        className={tabClass(onLogin)}
        aria-current={onLogin ? 'page' : undefined}
      >
        {t('sign_in', 'Sign In')}
      </Link>
      <Link
        href={authModeHref('/auth', emailMethod)}
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
  const searchParams = useSearchParams();
  const onLogin = pathname === '/auth/login';
  const emailMethod = isAuthEmailMethod(searchParams);

  return (
    <p className="mt-[20px] text-center text-[14px] text-textItemBlur">
      {onLogin ? (
        <>
          {t('dont_have_an_account', "Don't have an account?")}{' '}
          <Link
            href={authModeHref('/auth', emailMethod)}
            className="font-[500] text-newTextColor underline hover:font-bold"
          >
            {t('create_one', 'Create one')}
          </Link>
        </>
      ) : (
        <>
          {t('already_have_an_account', 'Already have an account?')}{' '}
          <Link
            href={authModeHref('/auth/login', emailMethod)}
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
