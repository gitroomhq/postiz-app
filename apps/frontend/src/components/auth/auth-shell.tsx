'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { AppleProvider } from '@gitroom/frontend/components/auth/providers/apple.provider';
import { FarcasterProvider } from '@gitroom/frontend/components/auth/providers/farcaster.provider';
import {
  AUTH_EMAIL_METHOD,
  AuthModeFooter,
  AuthModeSwitch,
  isAuthEmailMethod,
} from '@gitroom/frontend/components/auth/auth-chrome';

/**
 * The provider buttons (Google / Apple / OIDC / GitHub / Farcaster), stacked
 * full width so Apple sits under Google instead of squeezing a row of icons.
 * Wallet is opt-in via WALLET_LOGIN and stays a per-form concern because
 * register lazy-loads it; callers pass it via `extraProviders`.
 */
function Providers({ extraProviders }: { extraProviders?: ReactNode }) {
  const { isGeneral, neynarClientId, appleClientId, genericOauth } =
    useVariables();
  if (isGeneral && genericOauth) return <OauthProvider />;
  if (!isGeneral) return <GithubProvider />;
  return (
    <div className="flex flex-col gap-[8px]">
      <GoogleProvider />
      {!!appleClientId && <AppleProvider />}
      {!!neynarClientId && <FarcasterProvider />}
      {extraProviders}
    </div>
  );
}

const providerButtonClass =
  'cursor-pointer w-full bg-white border border-newBorder hover:bg-boxHover transition-colors h-[52px] rounded-[10px] flex justify-center items-center text-[#0E0E0E] gap-[10px] text-[15px] font-[500]';

function ContinueWithEmail() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <button
      type="button"
      onClick={() => router.replace(`${pathname}?method=${AUTH_EMAIL_METHOD}`)}
      aria-label={t('continue_with_email', 'Continue with email')}
      className={`lg:hidden ${providerButtonClass}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="21"
        height="21"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M4 7.5 12 13l8-5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{t('continue_with_email', 'Continue with email')}</span>
    </button>
  );
}

/**
 * Shared chrome for login and register.
 *
 * Desktop: providers, then email on one screen.
 * Phone: providers plus Continue with email; the fields (and organization on
 * sign-up) wait behind that button so nothing sits below the fold. Back in the
 * header returns to the provider list.
 */
export function AuthShell({
  title,
  subtitle,
  extraProviders,
  emailStep,
}: {
  title: string;
  /** One line under the title, in the manner of the marketing site. */
  subtitle?: string;
  extraProviders?: ReactNode;
  /** The email + password (+ organization) fields and submit button. */
  emailStep: ReactNode;
}) {
  const t = useT();
  const searchParams = useSearchParams();
  const emailOpen = isAuthEmailMethod(searchParams);

  return (
    <div className="flex flex-col flex-1">
      <h1 className="text-[40px] font-[600] -tracking-[0.8px] font-display">
        {title}
      </h1>

      {!!subtitle && (
        <p className="mt-[10px] text-[15px] text-textItemBlur">{subtitle}</p>
      )}

      <AuthModeSwitch />

      <div className="mt-[28px] flex flex-col">
        <div
          className={
            emailOpen
              ? 'hidden lg:flex lg:flex-col lg:gap-[8px]'
              : 'flex flex-col gap-[8px]'
          }
        >
          <Providers extraProviders={extraProviders} />
          <ContinueWithEmail />
        </div>
        <div className="hidden lg:block h-[20px] mb-[24px] mt-[24px] relative">
          <div className="absolute w-full h-[1px] bg-pqBorder top-[50%] -translate-y-[50%]" />
          <div className="absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex">
            <div className="px-[16px] bg-pqInner text-pqMuted text-[13px]">
              {t('or', 'or')}
            </div>
          </div>
        </div>
        <div
          className={emailOpen ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}
        >
          {emailStep}
        </div>
        <AuthModeFooter />
      </div>
    </div>
  );
}
