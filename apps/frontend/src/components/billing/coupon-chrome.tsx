'use client';

import { FC, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';

/**
 * Design coupon closed/open chrome for order summaries that are not yet
 * wired to a live Stripe Checkout session (loading, error, lifetime local).
 * Apply queues a toast — real apply happens once Embedded CouponInput or
 * hosted Checkout (allow_promotion_codes) is available.
 */
export const CouponChrome: FC<{
  /** Toast when Apply is pressed without a live session. */
  pendingHint?: string;
}> = ({ pendingHint }) => {
  const t = useT();
  const toaster = useToaster();
  const [couponCode, setCouponCode] = useState('');
  const [showInput, setShowInput] = useState(false);

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        className="flex h-[44px] w-full items-center gap-[9px] rounded-[12px] bg-pqSettings px-[14px] text-start transition-shadow hover:shadow-[inset_0_0_0_999px_var(--hover)]"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-pqBrand"
        >
          <path
            d="M7 17 17 7M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <span className="flex-1 text-[14px] font-[600]">
          {t('billing_have_discount_coupon', 'Have a coupon code?')}
        </span>
        <span className="text-[13.5px] font-[600] text-pqBrand">
          {t('billing_add', 'Add')}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-[10px] rounded-[13px] border border-dashed border-pqBrand p-[14px]">
      <div className="flex items-center gap-[10px]">
        <h4 className="flex-1 text-[14.5px] font-[600]">
          {t('billing_discount_coupon', 'Coupon code')}
        </h4>
        <button
          type="button"
          onClick={() => {
            setShowInput(false);
            setCouponCode('');
          }}
          className="text-[13.5px] font-[600] text-pqMuted transition-colors hover:text-pqText"
        >
          {t('billing_cancel', 'Cancel')}
        </button>
      </div>
      <div className="flex items-center gap-[9px]">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder={t('billing_enter_coupon_code', 'Enter coupon code')}
          autoFocus
          className="h-[44px] min-w-0 flex-1 rounded-[11px] bg-pqSettings px-[14px] text-[14.5px] text-pqText ring-1 ring-inset ring-pqLine placeholder:text-pqSoft focus:outline-none focus:ring-pqBrand"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              toaster.show(
                pendingHint ||
                  t(
                    'billing_coupon_when_checkout_ready',
                    'Enter your coupon again once checkout is ready, or on the Stripe payment page.'
                  ),
                'warning'
              );
            }
            if (e.key === 'Escape') {
              setShowInput(false);
              setCouponCode('');
            }
          }}
        />
        <button
          type="button"
          disabled={!couponCode.trim()}
          onClick={() =>
            toaster.show(
              pendingHint ||
                t(
                  'billing_coupon_when_checkout_ready',
                  'Enter your coupon again once checkout is ready, or on the Stripe payment page.'
                ),
              'warning'
            )
          }
          className="h-[44px] shrink-0 rounded-[11px] bg-pqBrand px-[20px] text-[14.5px] font-[600] text-pqOnBrand transition-all hover:bg-pqBrandHover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('billing_apply', 'Apply')}
        </button>
      </div>
    </div>
  );
};
