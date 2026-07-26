'use client';

// The frame around every auth form: logo and the opposite-action button on top,
// copyright and legal links at the bottom. Both live here rather than in the
// layout because they need client state — the current route to know which way
// the top button points, and the variable context to know whether this
// deployment publishes legal pages at all.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';

export const AuthNav = () => {
  const t = useT();
  const pathname = usePathname();
  // /auth is register; /auth/login, /auth/forgot and /auth/activate all belong
  // to someone who already has an account, so only the login page offers
  // sign-up. Everything else offers the way back in.
  const onLogin = !!pathname?.startsWith('/auth/login');

  return (
    <header className="flex items-center justify-between gap-[16px]">
      <LogoTextComponent />
      <Link
        href={onLogin ? '/auth' : '/auth/login'}
        className="flex h-[38px] items-center rounded-[10px] border border-newBorder px-[18px] text-[14px] font-[500] transition-colors hover:bg-boxHover"
      >
        {onLogin ? t('sign_up', 'Sign Up') : t('login', 'Login')}
      </Link>
    </header>
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
