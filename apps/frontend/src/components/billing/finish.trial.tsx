import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { mutate } from 'swr';
import { useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { timer } from '@gitroom/helpers/utils/timer';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  LIFETIME_PRICE,
  pricing,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import clsx from 'clsx';
import { isDevBillingStageEnabled } from '@gitroom/frontend/components/billing/dev-billing-stage';

/**
 * End-trial overlay — LOOK from the prototype `finishTrialOpen` sheet
 * (`PostQueen App v2.dc.html` ~3090–3141 + `ft*` vals). WORK stays the repo's:
 * POST `/billing/finish-trial`, poll until clear, then revalidate on close.
 *
 * Charged amount / renew label use real tier prices and lifetime rules. Renewal
 * *dates* live in Stripe and are not invented here — lifetime shows "Never";
 * a subscription shows "Active" rather than a staged calendar day.
 */
export const FinishTrial: FC<{
  close: () => void;
  /** What Stripe will / did charge — from the billing screen when known. */
  charged?: number;
  period?: 'MONTHLY' | 'YEARLY';
  /** DEV localhost preview — skips POST /billing/finish-trial when enabled. */
  dryRun?: boolean;
}> = (props) => {
  const [finished, setFinished] = useState(false);
  const fetch = useFetch();
  const user = useUser();
  const t = useT();
  const router = useRouter();
  const lifetime = !!user?.isLifetime;
  const plan = user?.tier?.current || 'PRO';

  const chargedAmount = useMemo(() => {
    if (typeof props.charged === 'number') return props.charged;
    if (lifetime) return LIFETIME_PRICE;
    const tier = pricing[plan];
    if (!tier) return 0;
    return props.period === 'YEARLY' ? tier.year_price : tier.month_price;
  }, [props.charged, props.period, lifetime, plan]);

  const chargedLabel = useMemo(() => {
    const value = chargedAmount;
    return value % 1 === 0 ? `$${value}.00` : `$${value.toFixed(2)}`;
  }, [chargedAmount]);

  const finishSubscription = useCallback(async () => {
    await fetch('/billing/finish-trial', {
      method: 'POST',
    });
    checkFinished();
  }, []);

  const checkFinished = useCallback(async () => {
    const { finished: done } = await (
      await fetch('/billing/is-trial-finished')
    ).json();
    if (!done) {
      await timer(2000);
      return checkFinished();
    }

    setFinished(true);
  }, []);

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
      timer(1500).then(() => setFinished(true));
      return;
    }
    finishSubscription();
  }, []);

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

        {!finished ? (
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
        ) : (
          <div
            data-finish-trial={lifetime ? 'founder' : 'charged'}
            className="flex w-full flex-col items-center gap-[18px] py-[8px]"
          >
            <span
              className={clsx(
                'grid size-[56px] place-items-center rounded-full',
                lifetime
                  ? 'bg-pqLtChipBg text-pqLtAmber'
                  : 'bg-pqOkSoft text-pqOk'
              )}
            >
              {lifetime ? (
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
                {lifetime
                  ? t('ft_title_founding', 'You are a founding member')
                  : t('ft_title_plan', 'You are on the {{plan}} plan', {
                      plan,
                    })}
              </h3>
              <div className="text-[13.5px] leading-[1.6] text-pqMuted">
                {lifetime
                  ? t(
                      'ft_body_founding',
                      'That was the only payment. PostQueen {{plan}} stays unlocked, and everything we build for it comes with it.',
                      { plan }
                    )
                  : t(
                      'ft_body_charged',
                      'Your trial is finished and your card has been charged.'
                    )}
              </div>
              <div
                className={clsx(
                  'mt-[4px] flex items-center justify-center gap-[8px] text-[13.5px] font-[600]',
                  lifetime ? 'text-pqLtAmber' : 'text-pqBrand'
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
                {lifetime
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
                  {lifetime
                    ? t('lt_renews', 'Renews')
                    : t('ft_next_renewal', 'Next renewal')}
                </span>
                <span
                  className={clsx(
                    'font-[600]',
                    lifetime ? 'text-pqLtAmber' : 'text-pqText'
                  )}
                >
                  {lifetime
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
                  lifetime
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
