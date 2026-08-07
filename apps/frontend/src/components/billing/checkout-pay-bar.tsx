'use client';

import { FC, ReactNode } from 'react';
import { clsx } from 'clsx';
import { StripeTrust } from '@gitroom/frontend/components/billing/stripe-trust';

/**
 * Shared content width for checkout page + fixed pay bars.
 * Bars must match the page rail — a narrower bar (e.g. 1360) shifts Stripe
 * left edge inward when switching Lifetime ↔ Subscription.
 */
export const CHECKOUT_MAX = 'mx-auto w-full max-w-[1600px]';

const BAR_INNER =
  'grid h-[92px] grid-cols-[minmax(0,1fr)_minmax(320px,max-content)_auto] items-center gap-[28px] px-[40px] tablet:px-[28px] mobile:h-auto mobile:grid-cols-1 mobile:gap-[12px] mobile:!px-[16px] mobile:py-[14px]';

/**
 * Fixed bottom pay bar shell shared by Lifetime + subscription submit bars.
 * Stable columns keep Stripe X position when copy/CTA width changes.
 */
export const CheckoutPayBarShell: FC<{
  summary: ReactNode;
  action: ReactNode;
  /** Optional data-* for tests / analytics */
  'data-pay-bar'?: string;
  className?: string;
}> = ({ summary, action, className, 'data-pay-bar': dataPayBar }) => (
  <div
    data-pay-bar={dataPayBar}
    className={clsx(
      'animate-fadeIn fixed bottom-0 left-0 z-[100] w-full border-t border-pqLine bg-pqInner',
      className
    )}
  >
    <div className={clsx(CHECKOUT_MAX, BAR_INNER)}>
      <div className="min-w-0 mobile:hidden">
        <StripeTrust />
      </div>
      <div className="min-w-0 text-end mobile:text-center">{summary}</div>
      <div className="min-w-0 justify-self-end mobile:w-full mobile:justify-self-stretch">
        {action}
      </div>
    </div>
  </div>
);
