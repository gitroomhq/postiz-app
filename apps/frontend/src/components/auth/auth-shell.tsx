'use client';

import { ReactNode } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { FarcasterProvider } from '@gitroom/frontend/components/auth/providers/farcaster.provider';

export type AuthStep = 'method' | 'email';

/**
 * The provider buttons (Google / OIDC / GitHub / Farcaster / Wallet), rendered
 * with exactly the gating login.tsx and register.tsx used before — this only
 * moves the choice onto its own step. Wallet stays a per-form concern because
 * register lazy-loads it; callers pass it via `extraProviders`.
 */
function Providers({ extraProviders }: { extraProviders?: ReactNode }) {
  const { isGeneral, neynarClientId, genericOauth } = useVariables();
  if (isGeneral && genericOauth) return <OauthProvider />;
  if (!isGeneral) return <GithubProvider />;
  return (
    <div className="gap-[8px] flex">
      <GoogleProvider />
      {!!neynarClientId && <FarcasterProvider />}
      {extraProviders}
    </div>
  );
}

/**
 * Shared chrome for login and register. Splits the form into two steps:
 *
 *   step 1 "method" — pick a provider or "continue with email". No network call
 *                     happens here; choosing email is just `onContinueEmail()`.
 *   step 2 "email"  — the caller's email/password fields.
 *
 * Back navigation (email -> method) is pure state, so a mistyped email costs
 * nothing to correct. This is the shape an OTP flow will slot into later: only
 * step 2 changes (a code field), the machine around it stays.
 */
export function AuthShell({
  title,
  subtitle,
  step,
  onContinueEmail,
  onBack,
  extraProviders,
  emailStep,
}: {
  title: string;
  /** One line under the title, in the manner of the marketing site. */
  subtitle?: string;
  step: AuthStep;
  onContinueEmail: () => void;
  onBack: () => void;
  extraProviders?: ReactNode;
  /** The email + password (+ organization) fields and submit button. */
  emailStep: ReactNode;
}) {
  const t = useT();

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center gap-[12px]">
        {step === 'email' && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('back', 'Back')}
            className="shrink-0 -ms-[4px] grid size-[36px] place-items-center rounded-full text-textItemBlur hover:bg-boxHover hover:text-newTextColor transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5 L8 12 L15 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <h1 className="text-[40px] font-[600] -tracking-[0.8px] font-display">
          {title}
        </h1>
      </div>

      {!!subtitle && (
        <p className="mt-[10px] text-[15px] text-textItemBlur">{subtitle}</p>
      )}

      {/* A floor rather than a reservation: enough that the short method step
          does not look cramped, low enough that the taller email step does not
          leave a hole under it. The layout centres this block vertically, so
          what growth remains reads as the form breathing, not jumping. */}
      <div className="min-h-[320px] flex flex-col mt-[28px]">
        {step === 'method' ? (
          <>
            <div className="text-[14px] mb-[12px] text-pqMuted">
              {t('continue_with', 'Continue With')}
            </div>
            <Providers extraProviders={extraProviders} />
            <div className="h-[20px] mb-[24px] mt-[24px] relative">
              <div className="absolute w-full h-[1px] bg-pqBorder top-[50%] -translate-y-[50%]" />
              <div className="absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex">
                <div className="px-[16px] bg-pqInner text-pqMuted text-[13px]">
                  {t('or', 'or')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onContinueEmail}
              className="h-[52px] rounded-[10px] border border-pqBorder hover:bg-pqHover transition-colors flex items-center justify-center gap-[10px] text-[15px] font-[500]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M4 7 L12 13 L20 7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('continue_with_email', 'Continue with email')}
            </button>
          </>
        ) : (
          emailStep
        )}
      </div>
    </div>
  );
}
