import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { timer } from '@gitroom/helpers/utils/timer';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  LIFETIME_PRICE,
  pricing,
  tierLabel,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import clsx from 'clsx';
import { isDevBillingStageEnabled } from '@gitroom/frontend/components/billing/dev-billing-stage';

/** Load period/tier when lock-card opens FinishTrial without billing props. */
const useFinishTrialSubscription = (enabled: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  return useSWR(enabled ? '/user/subscription' : null, load);
};

type FinishPhase = 'pending' | 'charged' | 'founder' | 'failed';

/**
 * End-trial overlay — LOOK from the prototype `finishTrialOpen` sheet
 * (`PostQueen App v2.dc.html` ~3090–3141 + `ft*` vals). WORK stays the repo's:
 * POST `/billing/finish-trial`, poll until clear, then revalidate on close.
 *
 * Charged amount / renew label use real tier prices and lifetime rules. Renewal
 * *dates* live in Stripe and are not invented here — lifetime shows "Never";
 * a subscription shows "Active" rather than a staged calendar day.
 *
 * Capture failure (dead card / incomplete PI) stops polling and shows the
 * payment-failed strip tone + portal CTA — never a false thank-you.
 */
export const FinishTrial: FC<{
  close: () => void;
  /** What Stripe will / did charge — from the billing screen when known. */
  charged?: number;
  period?: 'MONTHLY' | 'YEARLY';
  /** DEV localhost preview — skips POST /billing/finish-trial when enabled. */
  dryRun?: boolean;
}> = (props) => {
  const [phase, setPhase] = useState<FinishPhase>('pending');
  const fetch = useFetch();
  const user = useUser();
  const t = useT();
  const router = useRouter();
  const lifetime = !!user?.isLifetime;
  const needsSubLookup =
    typeof props.charged !== 'number' && !lifetime && props.period === undefined;
  const { data: subPayload } = useFinishTrialSubscription(needsSubLookup);
  const resolvedPeriod =
    props.period ??
    (subPayload?.subscription?.period as 'MONTHLY' | 'YEARLY' | undefined);
  const plan =
    (subPayload?.subscription?.subscriptionTier as string | undefined) ||
    user?.tier?.current ||
    'PRO';
  const planName = tierLabel(plan);

  const chargedAmount = useMemo(() => {
    if (typeof props.charged === 'number') return props.charged;
    if (lifetime) return LIFETIME_PRICE;
    const tier = pricing[plan as keyof typeof pricing];
    if (!tier) return 0;
    return resolvedPeriod === 'YEARLY' ? tier.year_price : tier.month_price;
  }, [props.charged, resolvedPeriod, lifetime, plan]);

  const chargedLabel = useMemo(() => {
    const value = chargedAmount;
    return value % 1 === 0 ? `$${value}.00` : `$${value.toFixed(2)}`;
  }, [chargedAmount]);

  const checkFinished = useCallback(async () => {
    const body = await (await fetch('/billing/is-trial-finished')).json();
    if (body?.captureBlocked) {
      setPhase('failed');
      return;
    }
    if (!body?.finished) {
      await timer(2000);
      return checkFinished();
    }
    setPhase(lifetime ? 'founder' : 'charged');
  }, [fetch, lifetime]);

  const finishSubscription = useCallback(async () => {
    const body = await (
      await fetch('/billing/finish-trial', {
        method: 'POST',
      })
    ).json();
    if (body?.captureBlocked) {
      setPhase('failed');
      return;
    }
    checkFinished();
  }, [fetch, checkFinished]);

  // Revalidate on the way out — not while open — so a trial-locked parent
  // (X panel / AI lock) does not unmount this dialog before the thank-you is read.
  const close = useCallback(() => {
    props.close();
    mutate('/user/self');
  }, [props.close]);

  const backToBilling = useCallback(() => {
    close();
    router.push('/billing');
  }, [close, router]);

  const openPortal = useCallback(async () => {
    try {
      const { portal } = await (await fetch('/billing/portal')).json();
      if (portal) {
        window.location.href = portal;
        return;
      }
    } catch {
      /* fall through to billing */
    }
    backToBilling();
  }, [fetch, backToBilling]);

  const closeToApp = useCallback(() => {
    // Opened from the 406 trial-lock popup — close the window. Otherwise the
    // design's "Close" returns to the calendar (/launches).
    if (typeof window !== 'undefined' && window.opener) {
      close();
      window.close();
      return;
    }
    close();
    router.push('/launches');
  }, [close, router]);

  useEffect(() => {
    if (props.dryRun && isDevBillingStageEnabled()) {
      timer(1500).then(() => setPhase(lifetime ? 'founder' : 'charged'));
      return;
    }
    finishSubscription();
  }, []);

  const finished = phase === 'charged' || phase === 'founder';
  const failed = phase === 'failed';

  return (
    <div
      data-finish-trial-overlay="1"
      className="fixed inset-0 z-[300] flex items-center justify-center bg-pqPopup p-[40px_24px] text-pqText"
    >
      <div className="relative flex w-full max-w-[440px] flex-col items-center gap-[18px] rounded-[18px] bg-pqPop p-[30px] text-center shadow-pqE3">
        <button
          type="button"
          onClick={close}
          aria-label={t('close', 'Close')}
          className="absolute end-[12px] top-[12px] grid size-[30px] place-items-center rounded-[8px] bg-transparent text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {phase === 'pending' && (
          <div
            data-finish-trial="pending"
            className="flex flex-col items-center gap-[18px] py-[8px]"
          >
            <div className="relative size-[64px]">
              <div className="absolute inset-0 rounded-full border-[3px] border-pqBorder" />
              <div className="absolute inset-0 animate-[pqspin_0.9s_linear_infinite] rounded-full border-[3px] border-transparent border-t-pqBrand" />
            </div>
            <div className="flex flex-col gap-[5px]">
              <h3 className="m-0 font-display text-[19px] font-[600] -tracking-[0.015em] text-pqText">
                {t('finishing_your_trial', 'Finishing your trial')}
              </h3>
              <div className="text-[13.5px] leading-[1.6] text-pqMuted">
                {t(
                  'finishing_trial_charging',
                  'Charging your card and activating the paid plan — this takes a few seconds.'
                )}
              </div>
            </div>
          </div>
        )}

        {failed && (
          <div
            data-finish-trial="failed"
            className="flex w-full flex-col items-center gap-[18px] py-[8px]"
          >
            <span className="grid size-[56px] place-items-center rounded-full bg-pqDangerSoft text-pqDanger">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <path
                  d="M2.5 9.5h19M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="flex flex-col gap-[5px]">
              <h3 className="m-0 font-display text-[19px] font-[600] -tracking-[0.015em] text-pqText">
                {t(
                  'ft_failed_title',
                  'We could not charge your credit card'
                )}
              </h3>
              <div className="text-[13.5px] leading-[1.6] text-pqMuted">
                {t(
                  'ft_failed_body',
                  'Update your payment method and try again. Your trial stays active until payment succeeds.'
                )}
              </div>
            </div>
            <div className="flex w-full gap-[9px]">
              <button
                type="button"
                onClick={openPortal}
                className="h-[42px] flex-1 rounded-[10px] bg-pqDanger text-[13.5px] font-[600] text-pqOnBrand transition-[filter] hover:brightness-110"
              >
                {t('update_payment_method', 'Update payment method')}
              </button>
              <button
                type="button"
                onClick={backToBilling}
                className="h-[42px] w-[104px] shrink-0 rounded-[10px] bg-transparent text-[13.5px] font-[600] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover hover:text-pqText"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        )}

        {finished && (
          <div
            data-finish-trial={phase === 'founder' ? 'founder' : 'charged'}
            className="flex w-full flex-col items-center gap-[18px] py-[8px]"
          >
            <span
              className={clsx(
                'grid size-[56px] place-items-center rounded-full',
                phase === 'founder'
                  ? 'bg-pqLtChipBg text-pqLtAmber'
                  : 'bg-pqOkSoft text-pqOk'
              )}
            >
              {phase === 'founder' ? (
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M3 18h18l1.2-11-5.4 3.6L12 3 7.2 10.6 1.8 7 3 18Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                  <path
                    d="M6 12.5 10.5 17 18.5 8"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>

            <div className="flex flex-col gap-[5px]">
              <h3 className="m-0 font-display text-[19px] font-[600] -tracking-[0.015em] text-pqText">
                {phase === 'founder'
                  ? t('ft_title_founding', 'You are a founding member')
                  : t('ft_title_plan', 'You are on the {{plan}} plan', {
                      plan: planName,
                    })}
              </h3>
              <div className="text-[13.5px] leading-[1.6] text-pqMuted">
                {phase === 'founder'
                  ? t(
                      'ft_body_founding',
                      'That was the only payment. PostQueen {{plan}} stays unlocked, and everything we build for it comes with it.',
                      { plan: planName }
                    )
                  : t(
                      'ft_body_charged',
                      'Your trial is finished and your card has been charged.'
                    )}
              </div>
              <div
                className={clsx(
                  'mt-[4px] flex items-center justify-center gap-[8px] text-[13.5px] font-[600]',
                  phase === 'founder' ? 'text-pqLtAmber' : 'text-pqBrand'
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="currentColor"
                  className="shrink-0"
                >
                  <path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13L12 20.5Z" />
                </svg>
                {phase === 'founder'
                  ? t(
                      'ft_thanks_founding',
                      'Thank you for backing PostQueen early.'
                    )
                  : t(
                      'ft_thanks_plan',
                      'Thank you for choosing PostQueen.'
                    )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-[7px] rounded-[12px] bg-pqTableHeader p-[13px_15px] text-start">
              <div className="flex items-center gap-[8px] text-[12.5px] text-pqMuted">
                <span className="min-w-0 flex-1">
                  {t('ft_charged_today', 'Charged today')}
                </span>
                <span className="font-[600] text-pqText">{chargedLabel}</span>
              </div>
              <div className="flex items-center gap-[8px] text-[12.5px] text-pqMuted">
                <span className="min-w-0 flex-1">
                  {phase === 'founder'
                    ? t('lt_renews', 'Renews')
                    : t('ft_next_renewal', 'Next renewal')}
                </span>
                <span
                  className={clsx(
                    'font-[600]',
                    phase === 'founder' ? 'text-pqLtAmber' : 'text-pqText'
                  )}
                >
                  {phase === 'founder'
                    ? t('lt_never', 'Never')
                    : t('ft_renewal_active', 'Active')}
                </span>
              </div>
            </div>

            <div className="flex w-full gap-[9px]">
              <button
                type="button"
                onClick={backToBilling}
                className={clsx(
                  'h-[42px] flex-1 rounded-[10px] text-[13.5px] font-[600] transition-[filter] hover:brightness-110',
                  phase === 'founder'
                    ? 'bg-pqLtSolid text-pqLtSolidFg'
                    : 'bg-pqBrand text-pqOnBrand'
                )}
              >
                {t('back_to_billing', 'Back to billing')}
              </button>
              <button
                type="button"
                onClick={closeToApp}
                className="h-[42px] w-[104px] shrink-0 rounded-[10px] bg-transparent text-[13.5px] font-[600] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover hover:text-pqText"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
