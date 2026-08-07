'use client';

import { FC } from 'react';
import { clsx } from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Monthly / Yearly segment control.
 *
 * Selected state is brand-filled (not inverted text-on-bg): a white pill with
 * black label + green “months free” chip clashed when Yearly was on. Badge
 * adapts — on-brand when Yearly is selected, ok-soft when it is not.
 */
export const BillingPeriodToggle: FC<{
  period: 'MONTHLY' | 'YEARLY';
  monthsFreeN: number;
  onChange: (period: 'MONTHLY' | 'YEARLY') => void;
  className?: string;
}> = ({ period, monthsFreeN, onChange, className }) => {
  const t = useT();
  const yearlyOn = period === 'YEARLY';

  return (
    <div
      data-billing-period-toggle="1"
      className={clsx(
        'flex shrink-0 select-none items-center gap-[3px] rounded-full bg-pqSettings p-[3px]',
        className
      )}
    >
      <button
        type="button"
        className={clsx(
          'flex h-[32px] items-center justify-center rounded-full px-[16px] text-[13px] font-[600] transition-colors',
          period === 'MONTHLY'
            ? 'bg-pqBrand text-pqOnBrand shadow-[0_8px_18px_-10px_color-mix(in_srgb,var(--brand)_75%,transparent)]'
            : 'bg-transparent text-pqMuted hover:text-pqText'
        )}
        onClick={() => onChange('MONTHLY')}
      >
        {t('billing_monthly', 'Monthly')}
      </button>
      <button
        type="button"
        className={clsx(
          'flex h-[32px] items-center justify-center gap-[7px] rounded-full pe-[8px] ps-[14px] text-[13px] font-[600] transition-colors',
          yearlyOn
            ? 'bg-pqBrand text-pqOnBrand shadow-[0_8px_18px_-10px_color-mix(in_srgb,var(--brand)_75%,transparent)]'
            : 'bg-transparent text-pqMuted hover:text-pqText'
        )}
        onClick={() => onChange('YEARLY')}
      >
        <span>{t('billing_yearly', 'Yearly')}</span>
        <span
          className={clsx(
            'flex h-[20px] shrink-0 items-center whitespace-nowrap rounded-full px-[8px] text-[10.5px] font-[700] tracking-[0.01em]',
            yearlyOn
              ? 'bg-pqOnBrand text-pqBrand'
              : 'bg-pqOkSoft text-pqOk'
          )}
        >
          {t('billing_months_free', '{{n}} months free', { n: monthsFreeN })}
        </span>
      </button>
    </div>
  );
};
