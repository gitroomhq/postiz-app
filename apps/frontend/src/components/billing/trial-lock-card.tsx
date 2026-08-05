'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FinishTrial } from '@gitroom/frontend/components/billing/finish.trial';

export type TrialLockCardProps = {
  /** Short name for titles/CTAs — e.g. "X", "AI Copilot". */
  name: string;
  title: string;
  description: string;
  perks: string[];
  /** Optional real trial-end date; never invent one. */
  unlocksOn?: Date | string | null;
  /** Card sits in a page (channel step) vs centered modal overlay (AI). */
  variant?: 'inline' | 'overlay';
};

/**
 * Design trial-lock card shared by Add-channel (X) and AI Copilot.
 * Primary ends the trial via FinishTrial; secondary goes to Billing.
 */
export const TrialLockCard: FC<TrialLockCardProps> = ({
  name,
  title,
  description,
  perks,
  unlocksOn,
  variant = 'inline',
}) => {
  const t = useT();
  const [finishTrial, setFinishTrial] = useState(false);

  let foot: string;
  if (unlocksOn) {
    const d =
      typeof unlocksOn === 'string' ? new Date(unlocksOn) : unlocksOn;
    const formatted = Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
    foot = formatted
      ? t(
          'or_wait_unlocks_on_date',
          'Or wait — {{name}} unlocks on {{date}} when your trial ends.',
          { name, date: formatted }
        )
      : t(
          'or_wait_until_trial_ends',
          'Or wait — {{name}} unlocks by itself when your free trial ends.',
          { name }
        );
  } else {
    foot = t(
      'or_wait_until_trial_ends',
      'Or wait — {{name}} unlocks by itself when your free trial ends.',
      { name }
    );
  }

  const card = (
    <div
      data-trial-lock-card="1"
      className={
        variant === 'overlay'
          ? 'flex w-full max-w-[440px] flex-col items-center gap-[16px] rounded-[20px] bg-pqInner px-[28px] py-[30px] text-center shadow-[var(--shadow)] outline outline-1 outline-offset-[-1px] outline-pqBorder'
          : 'flex w-full flex-col gap-[14px] rounded-pqMd border border-pqBorder bg-pqPop p-[18px]'
      }
    >
      <span className="grid size-[52px] place-items-center rounded-[16px] bg-pqBrandSoft text-pqBrand shadow-[inset_0_0_0_1px_rgba(124,58,237,.28)]">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
          <path
            d="M7 10V7.5a5 5 0 0 1 10 0V10M6 10h12a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 6 10Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <div className={variant === 'overlay' ? '' : 'text-start'}>
        <div className="font-display text-[21px] font-[600] -tracking-[0.02em] text-pqText">
          {title}
        </div>
        <div className="mt-[8px] text-[13.5px] leading-[1.6] text-pqMuted text-pretty">
          {description}
        </div>
      </div>

      <div
        className={
          variant === 'overlay'
            ? 'flex w-full flex-col gap-[9px] border-y border-pqLine py-[14px]'
            : 'flex w-full flex-col gap-[9px]'
        }
      >
        {perks.map((perk) => (
          <div
            key={perk}
            className="flex items-center gap-[10px] text-start text-[13.5px] text-pqMuted"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              className="shrink-0 text-pqBrand"
              aria-hidden="true"
            >
              <path
                d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.25 12.75 10.5 15l5.25-5.25"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{perk}</span>
          </div>
        ))}
      </div>

      <div className="relative mt-[2px] flex w-full justify-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-[26px] -inset-y-[18px] rounded-full bg-[radial-gradient(60%_100%_at_50%_50%,rgba(124,58,237,.5),rgba(124,58,237,0)_72%)] blur-[14px]"
        />
        <button
          type="button"
          onClick={() => setFinishTrial(true)}
          className="relative h-[44px] w-full overflow-hidden rounded-[12px] bg-pqBrand text-[14px] font-[600] text-pqOnBrand transition-[filter] hover:brightness-110"
        >
          {t('end_trial_to_unlock', 'End free trial to unlock {{name}}', {
            name,
          })}
        </button>
      </div>

      <Link
        href="/billing"
        className="grid h-[38px] w-full place-items-center rounded-[11px] text-[13px] font-[600] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover hover:text-pqText"
      >
        {t(
          'change_plan_or_payment_method',
          'Change plan or payment method'
        )}
      </Link>

      <div className="text-[12.5px] text-pqSoft">{foot}</div>

      {finishTrial && <FinishTrial close={() => setFinishTrial(false)} />}
    </div>
  );

  if (variant === 'overlay') {
    return (
      <div
        data-ai-lock="1"
        className="absolute inset-0 z-[30] flex items-center justify-center bg-pqPopup p-[24px] backdrop-blur-[3px]"
      >
        {card}
      </div>
    );
  }

  return card;
};
