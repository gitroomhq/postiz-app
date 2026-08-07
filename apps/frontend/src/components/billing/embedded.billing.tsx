'use client';

import { Stripe } from '@stripe/stripe-js';

import { FC, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PaymentElement,
  BillingAddressElement,
  CheckoutProvider,
  useCheckout,
} from '@stripe/react-stripe-js/checkout';
import { modeEmitter } from '@gitroom/frontend/components/layout/mode.component';
import useCookie from 'react-use-cookie';
import { Button } from '@gitroom/react/form/button';
import dayjs from 'dayjs';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { TRIAL_DAYS, pricing, tierLabel } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { StripeTrust } from '@gitroom/frontend/components/billing/stripe-trust';
import { CheckoutPayBarShell } from '@gitroom/frontend/components/billing/checkout-pay-bar';
import { CouponChrome } from '@gitroom/frontend/components/billing/coupon-chrome';
import { useDateFormat } from '@gitroom/frontend/components/launches/helpers/date.format';

export const EmbeddedBilling: FC<{
  stripe: Promise<Stripe>;
  secret: string;
  showCoupon?: boolean;
  autoApplyCoupon?: string;
  /** When Lifetime is selected, hide Stripe-driven summary + pay bar. */
  suppressCheckoutChrome?: boolean;
  fallbackTier?: string;
  fallbackPeriod?: string;
  fallbackAllowTrial?: boolean;
}> = ({
  stripe,
  secret,
  showCoupon = true,
  autoApplyCoupon,
  suppressCheckoutChrome = false,
  fallbackTier = 'PRO',
  fallbackPeriod = 'MONTHLY',
  fallbackAllowTrial = true,
}) => {
  const [saveSecret, setSaveSecret] = useState(secret);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useCookie('mode', 'light');
  const t = useT();

  useEffect(() => {
    modeEmitter.on('mode', (value) => {
      setMode(value);
      setLoading(true);
    });

    return () => {
      modeEmitter.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    if (loading) {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (secret && saveSecret !== secret) {
      setSaveSecret(secret);
    }
  }, [secret, setSaveSecret]);

  const swapping = saveSecret !== secret || loading;

  return (
    <div className="billing-form flex w-full flex-1 flex-col gap-[22px] rounded-[22px] bg-pqInner p-[34px_32px] shadow-pqE1 ring-1 ring-inset ring-pqLine mobile:p-[24px_20px]">
      <div className="mb-[2px] flex items-center gap-[16px]">
        <h2 className="flex-1 font-display text-[21px] font-[600] tracking-[-0.02em]">
          {t('billing_payment_details', 'Payment details')}
        </h2>
        {/* Card-brand chips, lifted from the prototype. Their fills are the
            card networks' own marks — like the Stripe wordmark below, brand
            colours are the one place a fixed colour is the correct one. */}
        <div className="flex items-center gap-[6px]">
          <svg width="32" height="21" viewBox="0 0 30 20" aria-label="Mastercard">
            <rect width="30" height="20" rx="4" fill="#fff" stroke="var(--line)" />
            <circle cx="12" cy="10" r="6" fill="#EB001B" />
            <circle cx="18" cy="10" r="6" fill="#F79E1B" fillOpacity=".9" />
          </svg>
          <svg width="32" height="21" viewBox="0 0 30 20" aria-label="Visa">
            <rect width="30" height="20" rx="4" fill="#fff" stroke="var(--line)" />
            <text
              x="15"
              y="14"
              textAnchor="middle"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontSize="9"
              fontWeight="800"
              fill="#1434CB"
            >
              VISA
            </text>
          </svg>
          <svg width="32" height="21" viewBox="0 0 30 20" aria-label="American Express">
            <rect width="30" height="20" rx="4" fill="#fff" stroke="var(--line)" />
            <text
              x="15"
              y="14"
              textAnchor="middle"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontSize="7"
              fontWeight="800"
              fill="#016FD0"
            >
              AMEX
            </text>
          </svg>
        </div>
      </div>
      {swapping ? (
        <div className="flex flex-col gap-[16px] py-[8px]">
          <div className="flex items-center gap-[12px] text-[15px] text-pqMuted">
            <div className="size-[18px] shrink-0 animate-spin rounded-full border-2 border-pqLine border-t-pqBrand" />
            {t(
              'billing_loading_payment_form',
              'Loading secure payment form…'
            )}
          </div>
          <div className="flex flex-col gap-[12px]">
            <div className="h-[44px] animate-pulse rounded-[11px] bg-pqSettings" />
            <div className="h-[44px] animate-pulse rounded-[11px] bg-pqSettings" />
            <div className="h-[44px] animate-pulse rounded-[11px] bg-pqSettings" />
          </div>
        </div>
      ) : (
        <CheckoutProvider
          stripe={stripe}
          options={{
            clientSecret: secret,
            elementsOptions: {
              // The hex literals in this file are the exception the token rule
              // allows for, and they are here rather than a token because of
              // what reads them. Stripe's Elements run in a cross-origin
              // iframe: its appearance API takes literal colours and cannot
              // resolve a CSS variable from this document. Each value mirrors a
              // token from colors.scss and must move with it. The others are
              // brand marks — the Stripe wordmark and the card-network chips —
              // which are the one place a fixed colour is the correct one.
              appearance: {
                variables: {
                  // --text, per theme.
                  colorText: mode === 'dark' ? '#ededf0' : '#18181b',
                  // --brand — selected payment-method radios / tabs.
                  colorPrimary: '#7c3aed',
                  borderRadius: '8px',
                  // --settings, per theme — the surface the design's checkout
                  // fields sit on, inside the --inner payment card.
                  colorBackground: mode === 'dark' ? '#1f1f24' : '#e9e9ef',
                },
                rules: {
                  '.Label': {
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                  },
                  '.Input': {
                    height: '44px',
                    // --settings, as above.
                    backgroundColor: mode === 'dark' ? '#1f1f24' : '#e9e9ef',
                    // --border / stronger than default hairline so fields read.
                    border:
                      mode === 'dark'
                        ? '1.5px solid #3a3a42'
                        : '1.5px solid #c8c8d0',
                  },
                  // Payment-method radios — unselected was near-invisible.
                  '.RadioIcon': {
                    width: '20px',
                    height: '20px',
                  },
                  '.RadioIconOuter': {
                    stroke:
                      mode === 'dark' ? '#9b9ba4' : '#5f5f6b',
                    strokeWidth: '2px',
                  },
                  '.RadioIconInner': {
                    fill: '#7c3aed',
                    r: '5',
                  },
                  '.Tab': {
                    border:
                      mode === 'dark'
                        ? '1.5px solid #3a3a42'
                        : '1.5px solid #c8c8d0',
                  },
                  '.Tab--selected': {
                    borderColor: '#7c3aed',
                    boxShadow: '0 0 0 1px #7c3aed',
                  },
                },
              },
            },
          }}
        >
          <FormWrapper
            showCoupon={showCoupon}
            autoApplyCoupon={autoApplyCoupon}
            suppressCheckoutChrome={suppressCheckoutChrome}
            fallbackTier={fallbackTier}
            fallbackPeriod={fallbackPeriod}
            fallbackAllowTrial={fallbackAllowTrial}
          />
        </CheckoutProvider>
      )}
    </div>
  );
};

const CheckoutSessionStatus: FC = () => {
  const checkoutState = useCheckout();
  const t = useT();

  if (checkoutState.type === 'loading') {
    return (
      <div className="flex flex-col gap-[16px] py-[8px]">
        <div className="flex items-center gap-[12px] text-[15px] text-pqMuted">
          <div className="size-[18px] shrink-0 animate-spin rounded-full border-2 border-pqLine border-t-pqBrand" />
          {t(
            'billing_loading_payment_form',
            'Loading secure payment form…'
          )}
        </div>
        <div className="flex flex-col gap-[12px]">
          <div className="h-[44px] animate-pulse rounded-[11px] bg-pqSettings" />
          <div className="h-[44px] animate-pulse rounded-[11px] bg-pqSettings" />
          <div className="h-[44px] animate-pulse rounded-[11px] bg-pqSettings" />
        </div>
      </div>
    );
  }

  if (checkoutState.type === 'error') {
    const raw = checkoutState.error.message || '';
    const hint = t(
      'billing_payment_form_error_hint',
      'Check that Stripe keys match this environment, then pick a plan again or refresh.'
    );
    const detail =
      !raw.trim() || /internal server error|^error$/i.test(raw) ? hint : raw;
    return (
      <div className="flex items-start gap-[11px] rounded-[14px] bg-pqAmberSoft p-[13px_16px] text-[14.5px] text-pqText ring-1 ring-inset ring-pqAmberLine">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          aria-hidden="true"
          className="mt-[1px] shrink-0 text-pqWarn"
        >
          <path
            d="M12 8v4.5M12 16.2h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <span className="font-[600]">
            {t(
              'billing_payment_form_unavailable',
              'Payment form could not be loaded'
            )}
          </span>
          <span className="font-[500] leading-[1.5] text-pqMuted">{detail}</span>
        </div>
      </div>
    );
  }

  return null;
};

const FormWrapper: FC<{
  showCoupon?: boolean;
  autoApplyCoupon?: string;
  suppressCheckoutChrome?: boolean;
  fallbackTier?: string;
  fallbackPeriod?: string;
  fallbackAllowTrial?: boolean;
}> = ({
  showCoupon = true,
  autoApplyCoupon,
  suppressCheckoutChrome = false,
  fallbackTier = 'PRO',
  fallbackPeriod = 'MONTHLY',
  fallbackAllowTrial = true,
}) => {
  const checkoutState = useCheckout();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);

  if (checkoutState.type !== 'success') {
    return (
      <>
        <CheckoutSessionStatus />
        {!suppressCheckoutChrome && (
          <OrderSummarySlot>
            <PriceBreakdownFallback
              tier={fallbackTier}
              period={fallbackPeriod}
              allowTrial={fallbackAllowTrial}
              showCoupon={showCoupon}
            />
          </OrderSummarySlot>
        )}
        {!suppressCheckoutChrome && (
          <SubmitBarFallback
            tier={fallbackTier}
            period={fallbackPeriod}
            allowTrial={fallbackAllowTrial}
            pending={checkoutState.type === 'loading'}
          />
        )}
      </>
    );
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const { checkout } = checkoutState;

    const confirmResult = await checkout.confirm();

    if (confirmResult.type === 'error') {
      toaster.show(confirmResult.error.message, 'warning');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1">
      <StripeInputs
        showCoupon={showCoupon}
        autoApplyCoupon={autoApplyCoupon}
        loading={loading}
        suppressCheckoutChrome={suppressCheckoutChrome}
      />
    </form>
  );
};

/**
 * Moves the order summary into `#pq-order-summary` (bottom of the right column).
 *
 * The summary reads checkout state, so it has to render inside the
 * CheckoutProvider — which lives in the payment form. Same portal pattern as
 * header-slot.tsx.
 */
const OrderSummarySlot: FC<{ children: ReactNode }> = ({ children }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // The slot belongs to a sibling subtree, so it only exists after the first
  // paint. State (not a ref) so finding it re-renders and the portal opens.
  useEffect(() => {
    setSlot(document.getElementById('pq-order-summary'));
  }, []);

  if (!slot) return null;
  return createPortal(children, slot);
};

const StripeInputs: FC<{
  showCoupon: boolean;
  autoApplyCoupon?: string;
  loading: boolean;
  suppressCheckoutChrome?: boolean;
}> = ({
  showCoupon,
  autoApplyCoupon,
  loading,
  suppressCheckoutChrome = false,
}) => {
  const checkout = useCheckout();
  const t = useT();
  return (
    <>
      {/* The session is created with automatic_tax and
          billing_address_collection: 'required', so the address has to be
          collected here — Stripe Tax has no other way to learn the customer's
          location in the embedded flow. */}
      <div>
        <h4 className="mb-[16px] text-[16px] font-[600]">
          {checkout.type === 'loading'
            ? ''
            : t('billing_billing_address', 'Billing Address')}
        </h4>
        <BillingAddressElement />
      </div>
      <div className="mt-[22px]">
        <h4 className="mb-[16px] text-[16px] font-[600]">
          {checkout.type === 'loading' ? '' : t('billing_payment', 'Payment')}
        </h4>
        <PaymentElement
          id="payment-element"
          options={{
            fields: { billingDetails: { address: 'never' } },
            layout: 'tabs',
          }}
        />
        {!suppressCheckoutChrome && (
          <OrderSummarySlot>
            <PriceBreakdown
              coupon={
                showCoupon ? (
                  <CouponInput autoApplyCoupon={autoApplyCoupon} />
                ) : null
              }
            />
          </OrderSummarySlot>
        )}
        {!suppressCheckoutChrome && <SubmitBar loading={loading} />}
        {checkout.type === 'loading' ? null : (
          <StripeTrust className="mt-[22px]" />
        )}
      </div>
    </>
  );
};

/**
 * The order summary card. `coupon` is the coupon block, passed in as a slot so
 * it sits where the design puts it — between the line items and the total —
 * while its state stays in CouponInput.
 */
const PriceBreakdownFallback: FC<{
  tier: string;
  period: string;
  allowTrial: boolean;
  showCoupon?: boolean;
}> = ({ tier, period, allowTrial, showCoupon }) => {
  const t = useT();
  const plan = pricing[tier] || pricing.PRO;
  const amount = period === 'YEARLY' ? plan.year_price : plan.month_price;
  const periodWord =
    period === 'YEARLY'
      ? t('billing_yearly', 'Yearly').toLowerCase()
      : t('billing_monthly', 'Monthly').toLowerCase();

  return (
    <div className="flex flex-col gap-[14px] rounded-[22px] bg-pqInner p-[24px_26px_26px] shadow-pqE1 ring-1 ring-inset ring-pqLine">
      <div className="text-[17px] font-[600] tracking-[-0.015em]">
        {t('billing_order_summary', 'Order summary')}
      </div>
      <div className="flex items-center justify-between gap-[16px]">
        <span className="text-[15px] text-pqMuted">
          {tierLabel(tier)}, {t('billing_billed', 'billed')} {periodWord}
        </span>
        <span className="text-[15px]">
          ${amount} /{' '}
          {period === 'YEARLY'
            ? t('billing_year', 'year')
            : t('billing_month', 'month')}
        </span>
      </div>
      {allowTrial && (
        <div className="flex items-center justify-between gap-[16px] text-[15px] text-pqOk">
          <span>
            {t('billing_n_day_free_trial', '{{n}}-day free trial', {
              n: TRIAL_DAYS,
            })}
          </span>
          <span className="font-[600]">-${amount}</span>
        </div>
      )}
      {(showCoupon ?? true) && <CouponChrome />}
      <div className="h-px bg-pqLine" />
      <div className="flex items-baseline justify-between gap-[16px]">
        <span className="text-[16px] font-[600]">
          {t('billing_due_today', 'Due today')}
        </span>
        <span className="font-display text-[26px] font-[600] tracking-[-0.025em]">
          {allowTrial ? '$0.00' : `$${amount}.00`}
        </span>
      </div>
    </div>
  );
};

export const SubmitBarFallback: FC<{
  tier: string;
  period: string;
  allowTrial: boolean;
  /**
   * While the Stripe session is still loading. Kept for callers; the CTA stays
   * full-contrast either way — click asks for payment details instead of
   * looking disabled.
   */
  pending?: boolean;
}> = ({ tier, period, allowTrial }) => {
  const t = useT();
  const toaster = useToaster();
  const plan = pricing[tier] || pricing.PRO;
  const amount = period === 'YEARLY' ? plan.year_price : plan.month_price;
  // Match SubmitBar: lapsed (!allowTrial) → Resubscribe, not Pay Now.
  const priceShort = `$${amount}`;
  const label = allowTrial
    ? t(
        'billing_pay_0_start_trial',
        'Pay $0 Today – Start your free trial!'
      )
    : t(
        'billing_resubscribe_to_plan',
        'Resubscribe to {{plan}} – {{price}}',
        { plan: tierLabel(tier), price: priceShort }
      );

  return (
    <CheckoutPayBarShell
      data-pay-bar="subscription-fallback"
      summary={
        <>
          <div className="text-[15.5px] font-[600]">
            {allowTrial
              ? t(
                  'billing_trial_bar_loading',
                  'Your {{n}}-day trial is 100% free',
                  { n: TRIAL_DAYS }
                )
              : `$${amount} ${t('billing_due_today_lower', 'due today')}`}
          </div>
          <div className="mt-[2px] text-[14px] text-pqMuted">
            {tierLabel(tier)} ·{' '}
            {t('billing_cancel_anytime_short', 'Cancel anytime from settings')}
          </div>
        </>
      }
      action={
        <Button
          className="h-[56px] w-full rounded-[15px] px-[30px] text-[16px] font-[700] shadow-[0_14px_30px_-14px_rgba(124,58,237,.95)]"
          type="button"
          onClick={() => {
            toaster.show(
              t(
                'billing_complete_payment_details',
                'Complete your payment details above, then try again.'
              ),
              'warning'
            );
          }}
        >
          {label}
        </Button>
      }
    />
  );
};

/**
 * The order summary card. `coupon` is the coupon block, passed in as a slot so
 * it sits where the design puts it — between the line items and the total —
 * while its state stays in CouponInput.
 */
const PriceBreakdown: FC<{ coupon?: ReactNode }> = ({ coupon }) => {
  const checkoutState = useCheckout();
  const t = useT();
  const { longDateNoWeekdayPattern } = useDateFormat();

  if (checkoutState.type !== 'success') {
    return null;
  }

  const { checkout } = checkoutState;
  const lineItem = checkout?.lineItems?.[0];
  const recurring = checkout?.recurring;
  const discountAmounts = checkout?.discountAmounts;
  const hasDiscount = discountAmounts && discountAmounts.length > 0;

  // Get values
  const planName = lineItem?.name || t('billing_subscription', 'Subscription');
  const unitAmount = lineItem?.unitAmount?.amount || '$0.00';
  const discountDisplay = hasDiscount ? discountAmounts[0] : null;
  const dueToday = checkout?.total?.total?.amount || '$0.00';
  const nextBillingTotal = recurring?.dueNext?.total?.amount;
  const nextBillingDate = recurring?.trial?.trialEnd
    ? dayjs(recurring.trial.trialEnd * 1000).format(longDateNoWeekdayPattern())
    : null;
  const billingInterval =
    recurring?.interval === 'month'
      ? t('billing_monthly', 'Monthly')
      : t('billing_yearly', 'Yearly');

  return (
    <div className="flex flex-col gap-[14px] rounded-[22px] bg-pqInner p-[24px_26px_26px] shadow-pqE1 ring-1 ring-inset ring-pqLine">
      <div className="text-[17px] font-[600] tracking-[-0.015em]">
        {t('billing_order_summary', 'Order summary')}
      </div>

      {/* Plan */}
      <div className="flex items-center justify-between gap-[16px]">
        <span className="text-[15px] text-pqMuted">
          {planName} · {billingInterval}
        </span>
        <span className="text-[15px]">{unitAmount}</span>
      </div>

      {/* Discount */}
      {discountDisplay && (
        <div className="flex items-center justify-between gap-[16px] text-[15px]">
          <span className="text-pqMuted">
            {discountDisplay.displayName || discountDisplay.promotionCode}
            {discountDisplay.percentOff &&
              ` (${discountDisplay.percentOff}% off)`}
          </span>
          <span className="font-[600] text-pqOk">
            {discountDisplay.amount !== '$0.00'
              ? `-${discountDisplay.amount}`
              : t('billing_applied', 'Applied')}
          </span>
        </div>
      )}

      {/* Trial credit. The design shows the trial as its own line — "7-day
          free trial  -$49" — rather than only as a zero at the bottom. Two
          numbers that explain each other read as an invoice; one number that
          contradicts the price above it reads as a mistake. */}
      {!!recurring?.trial?.trialEnd && (
        <div
          data-trial-credit="1"
          className="flex items-center justify-between gap-[16px] text-[15px] text-pqOk"
        >
          <span>
            {t('billing_n_day_free_trial', '{{n}}-day free trial', {
              n: TRIAL_DAYS,
            })}
          </span>
          <span className="font-[600]">-{unitAmount}</span>
        </div>
      )}

      {coupon}

      {/* Divider */}
      <div className="h-px bg-pqLine" />

      {/* Due today */}
      <div className="flex items-baseline justify-between gap-[16px]">
        <span className="text-[16px] font-[600]">
          {t('billing_due_today', 'Due today')}
        </span>
        <span className="font-display text-[26px] font-[600] tracking-[-0.025em]">
          {dueToday}
        </span>
      </div>

      {/* Next billing info */}
      {nextBillingTotal && nextBillingDate && (
        <div className="text-[14px] text-pqMuted">
          {t('billing_then', 'Then')} {nextBillingTotal}{' '}
          {t('billing_on', 'on')} {nextBillingDate}
        </div>
      )}

      <div className="flex items-start gap-[10px] rounded-[13px] bg-pqBrandSoft p-[13px_15px] text-[14px] leading-[1.5]">
        <svg
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          aria-hidden="true"
          className="mt-[1px] shrink-0 text-pqBrand"
        >
          <path
            d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="m8.5 12.3 2.4 2.4 4.6-5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          <strong>
            {t(
              'billing_cancel_notice_title',
              'Cancel anytime from settings without talking to a person.'
            )}
          </strong>{' '}
          <span className="text-pqMuted">
            {!!recurring?.trial?.trialEnd
              ? t(
                  'billing_cancel_notice_trial',
                  'Cancel before the trial ends and you are never charged.'
                )
              : t(
                  'billing_cancel_notice_lapsed',
                  'If you cancel later, your plan runs to the end of the billing period.'
                )}
          </span>
        </span>
      </div>
    </div>
  );
};

const AppliedCouponDisplay: FC<{
  appliedCode: string;
  checkout: any;
  isApplying: boolean;
  onRemove: () => void;
}> = ({ appliedCode, checkout, isApplying, onRemove }) => {
  const t = useT();
  const { longDateNoWeekdayPattern } = useDateFormat();

  // Get discount display from checkout state
  const getDiscountDisplay = (): string | null => {
    // Try to get percentage from discountAmounts
    const percentOff = checkout?.discountAmounts?.[0]?.percentOff;
    if (percentOff && typeof percentOff === 'number' && percentOff > 0) {
      return `-${percentOff}%`;
    }

    // Try to get actual discount amount from recurring.dueNext.discount
    const recurringDiscount =
      checkout?.recurring?.dueNext?.discount?.minorUnitsAmount;
    if (
      recurringDiscount &&
      typeof recurringDiscount === 'number' &&
      recurringDiscount > 0
    ) {
      return `-$${(recurringDiscount / 100).toFixed(2)}`;
    }

    // Try lineItems discount
    const lineItemDiscount =
      checkout?.lineItems?.[0]?.discountAmounts?.[0]?.percentOff;
    if (
      lineItemDiscount &&
      typeof lineItemDiscount === 'number' &&
      lineItemDiscount > 0
    ) {
      return `-${lineItemDiscount}%`;
    }

    return null;
  };

  // Get expiration date from checkout state (if available)
  const getExpirationDate = (): string | null => {
    const discount = checkout?.discountAmounts?.[0];
    const lineItemDiscount = checkout?.lineItems?.[0]?.discountAmounts?.[0];

    // Check for expiresAt in various locations (Unix timestamp)
    const expiresAt =
      discount?.expiresAt ||
      discount?.expires_at ||
      lineItemDiscount?.expiresAt ||
      lineItemDiscount?.expires_at ||
      checkout?.promotionCode?.expiresAt ||
      checkout?.promotionCode?.expires_at;

    if (expiresAt && typeof expiresAt === 'number') {
      const date = new Date(expiresAt * 1000);
      return dayjs(date).format(longDateNoWeekdayPattern());
    }

    if (expiresAt && typeof expiresAt === 'string') {
      return dayjs(expiresAt).format(longDateNoWeekdayPattern());
    }

    return null;
  };

  const discountDisplay = getDiscountDisplay();
  const expirationDate = getExpirationDate();

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex h-[46px] items-center gap-[10px] rounded-[13px] bg-pqOkSoft px-[14px]">
        <svg
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-pqOk"
        >
          <path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="min-w-0 flex-1 truncate text-[14.5px] font-[600]">
          {appliedCode}{' '}
          <span className="font-[400] text-pqMuted">
            {t('billing_discount_applied', 'applied')}
            {discountDisplay && ` (${discountDisplay})`}
          </span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={isApplying}
          className="shrink-0 text-[13.5px] font-[600] text-pqMuted transition-colors hover:text-pqText disabled:opacity-50"
        >
          {t('billing_remove', 'Remove')}
        </button>
      </div>
      {expirationDate && (
        <p className="flex items-center gap-[6px] text-[13px] text-pqMuted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {t('billing_coupon_expires', 'Coupon expires on')} {expirationDate}
        </p>
      )}
    </div>
  );
};

export const CouponInput: FC<{ autoApplyCoupon?: string }> = ({
  autoApplyCoupon,
}) => {
  const checkoutState = useCheckout();
  const t = useT();
  const toaster = useToaster();
  const [couponCode, setCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const { checkout } =
    checkoutState.type === 'success' ? checkoutState : { checkout: null };

  // Auto-apply coupon from backend when checkout is ready
  useEffect(() => {
    if (autoApplyCoupon) {
      handleApplyCoupon(undefined, autoApplyCoupon);
    }
  }, []);

  // Check if a coupon is already pre-applied (e.g., auto-apply coupon from backend)
  const preAppliedCode = checkout?.discountAmounts?.[0]?.promotionCode;
  const effectiveAppliedCode = appliedCode || preAppliedCode || null;

  const handleApplyCoupon = async (e?: any, coupon?: string) => {
    if (!coupon && !couponCode.trim()) return;
    if (!checkout?.applyPromotionCode) {
      toaster.show(
        t(
          'billing_coupon_when_checkout_ready',
          'Enter your coupon again once checkout is ready, or on the Stripe payment page.'
        ),
        'warning'
      );
      return;
    }

    setIsApplying(true);
    try {
      const result = await checkout.applyPromotionCode(
        coupon || couponCode.trim()
      );
      if (result.type === 'error') {
        toaster.show(
          result.error.message ||
            t('billing_invalid_coupon', 'Invalid coupon code'),
          'warning'
        );
      } else {
        setAppliedCode(coupon || couponCode.trim());
        setCouponCode('');
        setShowInput(false);
        toaster.show(
          t('billing_coupon_applied', 'Coupon applied successfully!'),
          'success'
        );
      }
    } catch (err: any) {
      toaster.show(
        err.message || t('billing_invalid_coupon', 'Invalid coupon code'),
        'warning'
      );
    }
    setIsApplying(false);
  };

  const handleRemoveCoupon = async () => {
    setIsApplying(true);
    try {
      await checkout.removePromotionCode();
      setAppliedCode(null);
      toaster.show(t('billing_coupon_removed', 'Coupon removed'), 'success');
    } catch (err: any) {
      toaster.show(
        err.message ||
          t('billing_error_removing_coupon', 'Error removing coupon'),
        'warning'
      );
    }
    setIsApplying(false);
  };

  // Show applied coupon (either manually applied or pre-applied from backend)
  if (effectiveAppliedCode) {
    return (
      <AppliedCouponDisplay
        appliedCode={effectiveAppliedCode}
        checkout={checkout}
        isApplying={isApplying}
        onRemove={handleRemoveCoupon}
      />
    );
  }

  // Show "Have a coupon code?" row
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

  // Show input field
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
          disabled={isApplying}
          autoFocus
          className="h-[44px] min-w-0 flex-1 rounded-[11px] bg-pqSettings px-[14px] text-[14.5px] text-pqText ring-1 ring-inset ring-pqLine placeholder:text-pqSoft focus:outline-none focus:ring-pqBrand disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApplyCoupon();
            }
            if (e.key === 'Escape') {
              setShowInput(false);
              setCouponCode('');
            }
          }}
        />
        <button
          type="button"
          onClick={() => handleApplyCoupon()}
          disabled={isApplying || !couponCode.trim()}
          className="h-[44px] shrink-0 rounded-[11px] bg-pqBrand px-[20px] text-[14.5px] font-[600] text-pqOnBrand transition-all hover:bg-pqBrandHover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplying
            ? t('billing_applying', 'Applying...')
            : t('billing_apply', 'Apply')}
        </button>
      </div>
    </div>
  );
};

const SubmitBar: FC<{ loading: boolean }> = ({ loading }) => {
  const checkoutState = useCheckout();
  const t = useT();
  const user = useUser();
  if (checkoutState.type === 'loading' || checkoutState.type === 'error') {
    return null;
  }

  const { checkout } = checkoutState;
  const onTrial = !!checkout.recurring?.trial?.trialEnd;
  // `allowTrial` false on the FREE paywall means a lapsed subscriber — design
  // `subEnded` — so the CTA reads "Resubscribe…". First-time purchasers who
  // are not trial-eligible still get "Pay Now" (`pwSubmitLabel` when !subEnded).
  const lapsed = !user?.allowTrial;
  const lineItem = checkout.lineItems?.[0];
  const planName = lineItem?.name || t('billing_subscription', 'Subscription');
  const dueToday = checkout.total?.total?.amount || '$0.00';
  // Stripe amounts arrive as display strings ("$20.00"); bar copy shortens to
  // "$20" so it matches the design's "Resubscribe to Creator - $20".
  const dueShort = dueToday.replace(/\.00\b/, '');
  const interval = checkout.recurring?.interval;
  const periodLabel =
    interval === 'year'
      ? t('billing_a_year', 'a year')
      : t('billing_a_month', 'a month');

  return (
    <CheckoutPayBarShell
      data-pay-bar="subscription"
      summary={
        onTrial ? (
          <>
            <div className="text-[15.5px] font-[600]">
              {t('billing_your_7_day_trial_is', 'Your 7-day trial is')}{' '}
              {t('billing_100_percent_free', '100% free')}{' '}
              {t('billing_ending', 'ending')}{' '}
              {dayjs(checkout.recurring!.trial!.trialEnd! * 1000).format(
                'D MMM, YYYY'
              )}
            </div>
            <div className="mt-[2px] text-[14px] text-pqMuted">
              {t('billing_cancel_anytime_short', 'Cancel anytime from settings')}
            </div>
          </>
        ) : (
          <>
            <div className="text-[15.5px] font-[600]">
              {dueShort} {t('billing_due_today_lower', 'due today')}
            </div>
            <div className="mt-[2px] text-[14px] text-pqMuted">
              {planName} · {dueShort} {periodLabel} ·{' '}
              {t('billing_cancel_anytime_short', 'Cancel anytime from settings')}
            </div>
          </>
        )
      }
      action={
        <Button
          // Full brand contrast even while confirming — `!opacity-100`
          // overrides Button's loading mute; label swaps to Processing.
          className="h-[56px] w-full rounded-[15px] px-[30px] text-[16px] font-[700] shadow-[0_14px_30px_-14px_rgba(124,58,237,.95)] !opacity-100"
          type="submit"
          disabled={loading}
        >
          {loading
            ? t('billing_processing', 'Processing…')
            : onTrial
            ? t(
                'billing_pay_0_start_trial',
                'Pay $0 Today – Start your free trial!'
              )
            : lapsed
            ? t(
                'billing_resubscribe_to_plan',
                'Resubscribe to {{plan}} – {{price}}',
                { plan: planName, price: dueShort }
              )
            : t('billing_pay_now', 'Pay Now')}
        </Button>
      }
    />
  );
};
