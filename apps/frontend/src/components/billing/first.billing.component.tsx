'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import dynamic from 'next/dynamic';
import { PostQueenLogo, appVersionLabel } from '@gitroom/frontend/components/ui/logo.component';
import {
  effectiveMonthly,
  LIFETIME_GRANT_TIER,
  LIFETIME_PRICE,
  lifetimeWindow,
  monthsFree,
  pricing,
  TRIAL_DAYS,
  tierLabel,
  trialWindow,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import clsx from 'clsx';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import useCookie from 'react-use-cookie';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { HelpMenu } from '@gitroom/frontend/components/new-layout/help.menu';
import { DeveloperIconComponent } from '@gitroom/frontend/components/developer/developer.icon.component';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { SubmitBarFallback } from '@gitroom/frontend/components/billing/embedded.billing';
import {
  CHECKOUT_MAX,
  CheckoutPayBarShell,
} from '@gitroom/frontend/components/billing/checkout-pay-bar';
import { BillingPeriodToggle } from '@gitroom/frontend/components/billing/billing-period-toggle';
import { CouponChrome } from '@gitroom/frontend/components/billing/coupon-chrome';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

const EmbeddedBilling = dynamic(
  () =>
    import('@gitroom/frontend/components/billing/embedded.billing').then(
      (mod) => mod.EmbeddedBilling
    ),
  {
    ssr: false,
  }
);

/** Green circle-check for the hero trust row (20px — above design's 18). */
const TrustCheck = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    aria-hidden="true"
    className="shrink-0 text-pqOk"
  >
    <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="m8 12.4 2.7 2.7L16.2 9.6"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Order summary chrome before Stripe Checkout state is ready. */
const OrderSummaryFallbackCard: FC<{
  tier: string;
  period: string;
  allowTrial: boolean;
}> = ({ tier, period, allowTrial }) => {
  const t = useT();
  const plan = pricing[tier] || pricing.PRO;
  const amount =
    period === 'YEARLY' ? plan.year_price : plan.month_price;
  const periodWord =
    period === 'YEARLY'
      ? t('billing_yearly', 'Yearly').toLowerCase()
      : t('billing_monthly', 'Monthly').toLowerCase();
  const unitLabel =
    period === 'YEARLY'
      ? `$${amount} / ${t('billing_year', 'year')}`
      : `$${amount} / ${t('billing_month', 'month')}`;

  return (
    <div
      data-order-summary-fallback="1"
      className="flex flex-col gap-[14px] rounded-[22px] bg-pqInner p-[24px_26px_26px] shadow-pqE1 ring-1 ring-inset ring-pqLine"
    >
      <div className="text-[17px] font-[600] tracking-[-0.015em]">
        {t('billing_order_summary', 'Order summary')}
      </div>
      <div className="flex items-center justify-between gap-[16px]">
        <span className="text-[15px] text-pqMuted">
          {tierLabel(tier)}, {t('billing_billed', 'billed')} {periodWord}
        </span>
        <span className="text-[15px]">{unitLabel}</span>
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
      <CouponChrome />
      <div className="h-px bg-pqLine" />
      <div className="flex items-baseline justify-between gap-[16px]">
        <span className="text-[16px] font-[600]">
          {t('billing_due_today', 'Due today')}
        </span>
        <span className="font-display text-[26px] font-[600] tracking-[-0.025em]">
          {allowTrial ? '$0.00' : `$${amount}.00`}
        </span>
      </div>
      <div className="text-[14px] text-pqMuted">
        {allowTrial
          ? t(
              'billing_then_after_trial_short',
              'Then ${{amount}} {{period}} after the trial',
              { amount, period: periodWord }
            )
          : t(
              'billing_renews_period',
              'Renews {{period}} · cancel anytime from settings',
              { period: periodWord }
            )}
      </div>
    </div>
  );
};

/** Plan / lifetime radio — stronger unselected ring so choice affordance reads. */
const CheckoutRadio: FC<{
  selected: boolean;
  tone?: 'brand' | 'lifetime';
  size?: 'md' | 'lg';
}> = ({ selected, tone = 'brand', size = 'md' }) => {
  const dim = size === 'lg' ? 'size-[22px]' : 'size-[20px]';
  const icon = size === 'lg' ? 12 : 11;
  if (tone === 'lifetime') {
    return (
      <span
        className={clsx(
          'grid shrink-0 place-items-center rounded-full',
          dim,
          selected
            ? 'bg-pqLtSolid ring-[3px] ring-pqLtChipBg'
            : 'bg-pqInner ring-2 ring-inset ring-pqLtDim'
        )}
      >
        {selected && (
          <svg
            viewBox="0 0 24 24"
            width={icon}
            height={icon}
            fill="none"
            aria-hidden="true"
            className="text-pqLtSolidFg"
          >
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    );
  }
  return (
    <span
      className={clsx(
        'grid shrink-0 place-items-center rounded-full',
        dim,
        selected
          ? 'bg-pqBrand ring-[3px] ring-pqBrandSoft'
          : 'bg-pqSettings ring-2 ring-inset ring-pqMuted'
      )}
    >
      {selected && (
        <svg
          viewBox="0 0 24 24"
          width={icon}
          height={icon}
          fill="none"
          aria-hidden="true"
          className="text-pqOnBrand"
        >
          <path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
};

/**
 * Founding-member card in the checkout right column + "OR SUBSCRIBE" divider.
 *
 * Design: selectable in-place (`paywallTier: 'LIFETIME'`). Pay still goes
 * through `POST /billing/lifetime-checkout` (hosted Stripe), not Embedded.
 * When `allowTrial`, checkout is `mode: 'setup'` ($0 today; $49 after trial);
 * otherwise immediate `mode: 'payment'`. Marketing: Everything in Pro.
 */
const LifetimeOfferCard: FC<{
  selected: boolean;
  onSelect: () => void;
}> = ({ selected, onSelect }) => {
  const t = useT();
  const user = useUser();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const window_ = useMemo(
    () => lifetimeWindow(user?.createdAt),
    [user?.createdAt, now]
  );

  // Always draw while First Billing can still sell lifetime
  // (`lifetimeWindow.open || isTrailing` — gated by the parent). The 24h
  // window only drives the countdown strip below — not whether the card exists.
  const proPlan = pricing.PRO;
  const total = Math.floor(window_.msLeft / 1000);
  const parts = [
    Math.floor(total / 3600),
    Math.floor((total % 3600) / 60),
    total % 60,
  ].map((n) => String(n).padStart(2, '0'));

  return (
    <>
      <div
        data-lifetime-card="1"
        data-lifetime-selected={selected ? '1' : '0'}
        onClick={onSelect}
        className={clsx(
          'flex cursor-pointer select-none flex-col gap-[16px] rounded-[22px] p-[20px_24px] shadow-pq',
          selected
            ? 'bg-pqLtCardOn ring-[1.5px] ring-inset ring-pqLtAmber'
            : 'bg-pqLtCardOff ring-1 ring-inset ring-pqBorder'
        )}
      >
        <div className="flex flex-wrap items-center gap-[11px]">
          <CheckoutRadio selected={selected} tone="lifetime" size="lg" />
          <span className="grid h-[21px] place-items-center rounded-full bg-pqLtSolid px-[10px] text-[10px] font-[800] uppercase tracking-[0.05em] text-pqLtSolidFg">
            {selected
              ? t('billing_founding_member', 'Founding member')
              : t('billing_become_founding_member', 'Become a founding member')}
          </span>
          <span className="flex-1" />
          <span className="flex h-[22px] items-center whitespace-nowrap rounded-full bg-pqLtChipBg px-[10px] text-[11px] font-[700] uppercase tracking-[0.03em] text-pqLtAmber ring-1 ring-inset ring-pqLtOutline">
            {t('billing_one_time_payment', 'One-time payment')}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-[14px]">
          <div className="min-w-[190px] flex-1">
            <div className="font-display text-[21px] font-[600] tracking-[-0.02em] text-pqText">
              {t('billing_lifetime_access', 'Lifetime access & updates')}
            </div>
            <div className="mt-[5px] text-[13.5px] text-pqLtDim">
              {t(
                'billing_lifetime_everything_in_pro',
                'Everything in Pro — yours forever.'
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-[7px]">
            <span className="text-[14px] text-pqLtDimmer line-through">
              ${proPlan.year_price}
              {t('billing_per_year_short', '/yr')}
            </span>
            <span className="font-display text-[38px] font-[700] leading-none tracking-[-0.03em] text-pqLtAmber">
              ${LIFETIME_PRICE}
            </span>
            <span className="text-[13.5px] text-pqLtDim">
              {t('billing_once', 'once')}
            </span>
          </div>
        </div>
        {/* Subtle hairline between price row and feature grid — card felt dense
            without a break (owner 2026-08-06). Same lt line token as the footer. */}
        <div aria-hidden className="h-px bg-pqLtLine" />
        <BillingFeatures tier={LIFETIME_GRANT_TIER} tone="lifetime" />
        <div className="flex flex-wrap items-center gap-[12px] border-t border-pqLtLine pt-[15px]">
          {window_.open && user?.allowTrial ? (
            <>
              <span className="flex h-[28px] items-center gap-[7px] whitespace-nowrap rounded-[8px] bg-pqLtChipBg pe-[11px] ps-[9px]">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0 text-pqLtAmber"
                >
                  <path
                    d="M12 7.5V12l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  data-lifetime-remaining={total}
                  className="font-display text-[13.5px] font-[700] tracking-[0.02em] text-pqLtAmber tabular-nums"
                >
                  {parts.join(':')}
                </span>
              </span>
              <span className="whitespace-nowrap text-[13px] text-pqLtDim">
                {t('billing_left_at_this_price', 'left at this price')}
              </span>
            </>
          ) : (
            <span className="flex h-[28px] items-center gap-[7px] whitespace-nowrap rounded-[8px] bg-pqLtChipBg pe-[11px] ps-[9px]">
              <span className="text-[12.5px] font-[700] uppercase tracking-[0.02em] text-pqLtAmber">
                {t('billing_founding_price', 'Founding price')}
              </span>
            </span>
          )}
          <span className="flex-1" />
          <span className="whitespace-nowrap text-[13px] text-pqLtDim">
            {t('billing_one_payment_no_renewal', 'One payment · no renewal, ever')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-[14px] px-[4px]">
        <span className="h-px flex-1 bg-pqLine" />
        <span className="text-[11.5px] font-[700] uppercase tracking-[0.09em] text-pqSoft">
          {t('billing_or_subscribe', 'Or subscribe')}
        </span>
        <span className="h-px flex-1 bg-pqLine" />
      </div>
    </>
  );
};

/**
 * Static Order summary while Lifetime is selected (no Stripe Embedded session).
 *
 * LOOK inventory matches App v2 paywall Order summary (gap 14 → 18 for
 * breathing room after density feedback). Stripe trust lives on the pay bar
 * left only — design omits it from this card; duplicating it here made the
 * panel feel busier than the prototype.
 */
const LifetimeOrderSummary: FC = () => {
  const t = useT();
  const user = useUser();
  const allowTrial = !!user?.allowTrial;
  const trialEndLabel = useMemo(() => {
    const endsAt = trialWindow(user?.createdAt).endsAt;
    return endsAt ? newDayjs(endsAt).format('D MMM, YYYY') : null;
  }, [user?.createdAt]);

  return (
    <div
      data-lifetime-order-summary="1"
      className="flex flex-col gap-[18px] rounded-[22px] bg-pqInner p-[24px_26px_26px] shadow-pqE1 ring-1 ring-inset ring-pqLine"
    >
      <div className="text-[17px] font-[600] tracking-[-0.015em]">
        {t('billing_order_summary', 'Order summary')}
      </div>
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-center justify-between gap-[16px]">
          <span className="text-[15px] text-pqMuted">
            {t('billing_lifetime_billed_once', 'Lifetime')}
            {', '}
            {t('billing_one_time_payment', 'One-time payment').toLowerCase()}
          </span>
          <span className="text-[15px]">
            ${LIFETIME_PRICE} / {t('billing_once', 'once')}
          </span>
        </div>
        {allowTrial && (
          // Design: muted label, green weight only on the credit amount.
          <div className="flex items-center justify-between gap-[16px] text-[15px]">
            <span className="text-pqMuted">
              {t('billing_n_day_free_trial', '{{n}}-day free trial', {
                n: TRIAL_DAYS,
              })}
            </span>
            <span className="font-[600] text-pqOk">-${LIFETIME_PRICE}</span>
          </div>
        )}
        <CouponChrome
          pendingHint={t(
            'billing_coupon_on_stripe_checkout',
            'You can enter your coupon on the Stripe checkout page after you continue.'
          )}
        />
      </div>
      <div className="h-px bg-pqLine" />
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-baseline justify-between gap-[16px]">
          <span className="text-[16px] font-[600]">
            {t('billing_due_today', 'Due today')}
          </span>
          <span className="font-display text-[26px] font-[600] tracking-[-0.025em]">
            {allowTrial ? '$0.00' : `$${LIFETIME_PRICE}.00`}
          </span>
        </div>
        <div className="text-[14px] text-pqMuted">
          {allowTrial
            ? t(
                'billing_lifetime_then_after_trial',
                'Then ${{price}} once on {{date}} · never charged again',
                {
                  price: LIFETIME_PRICE,
                  date: trialEndLabel || t('billing_trial_end', 'trial end'),
                }
              )
            : t(
                'billing_lifetime_then_line',
                'One payment of ${{price}} · never charged again',
                { price: LIFETIME_PRICE }
              )}
        </div>
      </div>
      {/* Design: one body colour (no muted second sentence). Trial tail =
          App v2 pwCancelTail; non-trial keeps founding never-renews
          (subscription “billing period” tail is wrong for lifetime). */}
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
          {allowTrial
            ? t(
                'billing_cancel_notice_trial',
                'Cancel before the trial ends and you are never charged.'
              )
            : t(
                'billing_lifetime_no_renewal_note',
                'Founding member access never renews.'
              )}
        </span>
      </div>
    </div>
  );
};

/** Re-enable when the founding-member deal is retired from First Billing. */
const SHOW_PRO_POPULAR_BADGE = false;

/** Fixed pay bar for Lifetime — hosted Checkout, not Embedded confirm. */
const LifetimePayBar: FC = () => {
  const t = useT();
  const user = useUser();
  const fetch = useFetch();
  const toaster = useToaster();
  const [busy, setBusy] = useState(false);
  const allowTrial = !!user?.allowTrial;
  const trialEndLabel = useMemo(() => {
    const endsAt = trialWindow(user?.createdAt).endsAt;
    return endsAt ? newDayjs(endsAt).format('D MMM, YYYY') : null;
  }, [user?.createdAt]);

  const buy = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/billing/lifetime-checkout', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 410 when the founding window closed — surface the API message.
        toaster.show(
          friendlyCheckoutError(
            typeof body?.message === 'string' ? body.message : undefined,
            t('something_went_wrong', 'Something went wrong')
          ),
          'warning'
        );
        return;
      }
      if (body?.url) {
        window.location.href = body.url;
        return;
      }
      toaster.show(t('something_went_wrong', 'Something went wrong'), 'warning');
    } finally {
      setBusy(false);
    }
  }, [fetch, t, toaster]);

  return (
    <CheckoutPayBarShell
      data-pay-bar="lifetime"
      summary={
        <>
          <div className="text-[15.5px] font-[600]">
            {allowTrial
              ? t(
                  'billing_zero_due_today_until',
                  '$0 due today, free until {{date}}',
                  {
                    date:
                      trialEndLabel ||
                      t('billing_trial_end', 'trial end'),
                  }
                )
              : `$${LIFETIME_PRICE} ${t('billing_due_today_lower', 'due today')}`}
          </div>
          <div className="mt-[2px] text-[14px] text-pqMuted">
            {allowTrial
              ? t(
                  'billing_founding_bar_sub_trial',
                  'Founding member · ${{amount}} once after the trial · never charged again',
                  { amount: LIFETIME_PRICE }
                )
              : t(
                  'billing_founding_bar_sub',
                  'Founding member · {{amount}} once · never charged again',
                  { amount: `$${LIFETIME_PRICE}` }
                )}
          </div>
        </>
      }
      action={
        <button
          type="button"
          disabled={busy}
          onClick={buy}
          // Full brand contrast while busy — label changes; no washed opacity.
          className="grid h-[56px] w-full place-items-center rounded-[15px] bg-pqBrand px-[30px] text-[16px] font-[700] text-pqOnBrand shadow-[0_14px_30px_-14px_rgba(124,58,237,.95)] transition-all hover:bg-pqBrandHover disabled:cursor-wait"
        >
          {busy
            ? t('billing_redirecting', 'Redirecting…')
            : allowTrial
            ? t(
                'billing_pay_0_start_trial',
                'Pay $0 Today – Start your free trial!'
              )
            : t(
                'billing_get_lifetime_access',
                'Get lifetime access — {{amount}} once',
                { amount: `$${LIFETIME_PRICE}` }
              )}
        </button>
      }
    />
  );
};

/** Hide Nest/Express "Internal server error" chrome; keep real API messages. */
const friendlyCheckoutError = (raw: string | undefined, fallback: string) => {
  if (!raw?.trim()) return fallback;
  if (/internal server error|^error$|econnrefused|fetch failed/i.test(raw)) {
    return fallback;
  }
  return raw;
};

const CheckoutEmbedNotice: FC<{ message: string }> = ({ message }) => {
  const t = useT();
  const fallback = t(
    'billing_checkout_load_failed',
    'Could not load checkout. Please refresh the page or try again in a moment.'
  );
  const display = friendlyCheckoutError(message, fallback);
  return (
    <div className="billing-form flex w-full flex-1 flex-col gap-[22px] rounded-[22px] bg-pqInner p-[34px_32px] shadow-pqE1 ring-1 ring-inset ring-pqLine mobile:p-[24px_20px]">
      <div className="mb-[2px] flex items-center gap-[16px]">
        <h2 className="flex-1 font-display text-[21px] font-[600] tracking-[-0.02em]">
          {t('billing_payment_details', 'Payment details')}
        </h2>
      </div>
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
          <span className="font-[500] leading-[1.5] text-pqMuted">{display}</span>
        </div>
      </div>
    </div>
  );
};

export const FirstBillingComponent = () => {
  const { stripeClient, onboardingVideoUrl } = useVariables();
  const user = useUser();
  const dub = useDubClickId();
  const [stripe, setStripe] = useState<null | Promise<Stripe>>(null);
  // The entry tier. STANDARD is retired and no longer listed, so defaulting to
  // it would open the paywall with nothing selected.
  const [tier, setTier] = useState('CREATOR');
  const [period, setPeriod] = useState('MONTHLY');
  // Owner: open with Lifetime selected when the founding window is available
  // (radio was empty before). Subscription stays available via the plan grid.
  const [checkoutMode, setCheckoutMode] = useState<'subscription' | 'lifetime'>(
    'lifetime'
  );
  const fetch = useFetch();
  const modals = useModals();
  const t = useT();
  const { mobile, tablet, desktop } = useViewport();
  // Stack + H1 scale follow design 760 / 1180, not Tailwind tablet≤1300.
  const stackCheckout = mobile || tablet;
  const [datafast_visitor_id] = useCookie('datafast_visitor_id', '');
  const [datafast_session_id] = useCookie('datafast_session_id', '');

  useEffect(() => {
    if (stripeClient) {
      setStripe(loadStripe(stripeClient));
    }
  }, [stripeClient]);

  // Preselect whatever the visitor picked on the marketing site. UtmSaver
  // stashed it before registration redirected them here; read it after mount so
  // the server render stays deterministic. A marketing plan pick also leaves
  // Lifetime mode so the stashed tier is actually selected.
  useEffect(() => {
    const selectedPlan = localStorage.getItem('selectedPlan');
    // A plan stashed by the marketing site before registration. Ignore it if it
    // names a tier that is no longer for sale.
    if (
      selectedPlan &&
      pricing[selectedPlan] &&
      !pricing[selectedPlan].retired
    ) {
      setTier(selectedPlan);
      setCheckoutMode('subscription');
    }

    const selectedPeriod = localStorage.getItem('selectedPeriod');
    if (selectedPeriod === 'MONTHLY' || selectedPeriod === 'YEARLY') {
      setPeriod(selectedPeriod);
    }
  }, []);

  const loadCheckout = useCallback(async () => {
    const res = await fetch('/billing/embedded', {
      method: 'POST',
      body: JSON.stringify({
        billing: tier,
        period: period,
        ...(datafast_visitor_id && datafast_session_id
          ? { datafast_visitor_id, datafast_session_id }
          : {}),
        ...(dub ? { dub } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    // Surface API failures to SWR's error path so Payment details shows the
    // CheckoutEmbedNotice instead of a silent empty / stuck loading shell.
    if (!res.ok) {
      const message =
        typeof json?.message === 'string'
          ? json.message
          : 'Could not load checkout';
      throw new Error(message);
    }
    return json;
  }, [tier, period, datafast_visitor_id, datafast_session_id, dub, fetch]);

  const showYouTube = () => {
    modals.openModal({
      title: 'Grow Fast With PostQueen (Play the video)',
      children: (
        <iframe
          className="h-full aspect-video min-w-[800px]"
          src={onboardingVideoUrl}
          title="Tutorial"
          allow="autoplay"
          allowFullScreen
        />
      ),
    });
  };

  const { data, isLoading, error: embedFetchError } = useSWR(
    `/billing-${tier}-${period}`,
    loadCheckout,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
    }
  );

  const price = useMemo(
    () =>
      Object.entries(pricing).filter(
        ([key, value]) => key !== 'FREE' && !value.retired
      ),
    []
  );

  // Founding deal only while the 24h window is open, or while the org is
  // still on trial (`isTrailing`) — same rule as Main Billing's retention
  // offer. Closed window + no trial → no lifetime CTA/mode (plan cards only).
  const canBuyLifetime =
    !user?.isLifetime &&
    (!!user?.isTrailing || lifetimeWindow(user?.createdAt).open);
  const activeMode =
    canBuyLifetime && checkoutMode === 'lifetime' ? 'lifetime' : 'subscription';
  // Stripe Embedded mounts its own pay bar; when it cannot (loading / error /
  // blocked / lifetime), the parent owns the fixed bar so it never disappears.
  const embedChromeLive =
    activeMode === 'subscription' &&
    !!stripe &&
    !!data?.client_secret &&
    !isLoading &&
    !embedFetchError &&
    !data?.blocked;

  const trialEndedLabel = useMemo(() => {
    const endsAt = trialWindow(user?.createdAt).endsAt;
    return endsAt ? newDayjs(endsAt).format('D MMM, YYYY') : null;
  }, [user?.createdAt]);

  const JoinOver = () => {
    return (
      <div className="flex flex-col gap-[22px]">
        <h1
          className={clsx(
            // Design pwH1 is 34/42/54 — owner asked for more presence twice
            // (2026-08-06): 38/48/60 then 42/52/64.
            'font-display font-[800] leading-[1.05] tracking-[-0.035em] whitespace-pre-line text-balance',
            mobile && 'text-[42px]',
            tablet && 'text-[52px]',
            desktop && 'text-[64px]'
          )}
        >
          {/* Doc 03 asks for a different headline once somebody has subscribed
              before — its `ended` state, "Pick up where you left off". This
              screen said "Grow your social presence" to everybody, including a
              lapsed subscriber who has already grown one.

              `allowTrial` is the signal already available and already correct:
              it gates the three trial checkmarks below, so a lapsed account
              rightly does not see a trial it cannot have. The headline simply
              never followed it. */}
          {user?.allowTrial ? (
            // The checkout prototype leads with the offer, not the product:
            // "Your first 7 days are free". It is the one line that answers
            // what somebody looking at a card form wants to know.
            <>
              {t('billing_your_first', 'Your first')}{' '}
              <span className="text-pqBrand">
                {t('billing_days_are_free', '{{n}} days are free', {
                  n: TRIAL_DAYS,
                })}
              </span>
            </>
          ) : (
            // Design `pwHeadA` / `pwHeadB`: "Pick up" + brand "where you left
            // off" — no trailing "with PostQueen" on the lapsed paywall.
            <>
              {t('billing_pick_up', 'Pick up')}{' '}
              <span className="text-pqBrand">
                {t('billing_where_you_left_off', 'where you left off')}
              </span>
            </>
          )}
        </h1>

        <p className="max-w-[52ch] text-[21px] leading-[1.5] text-pqMuted">
          {user?.allowTrial
            ? t(
                'billing_trial_hero_sub',
                'Add a card to unlock every channel, the AI editor and analytics. Nothing is charged until your trial ends.'
              )
            : t(
                'billing_lapsed_hero_sub',
                'Your channels are still connected and every draft, scheduled post and report is untouched. Pick a plan and the queue starts moving again.'
              )}
        </p>

        {!!onboardingVideoUrl && (
          <div className="flex" onClick={showYouTube}>
            <div className="cursor-pointer flex gap-[10px] items-center underline hover:font-[700]">
              <div>
                <SafeImage
                  className="text-[12px]"
                  src="/icons/platforms/youtube.svg"
                  width={22.5}
                  height={16}
                  alt="YouTube"
                />
              </div>
              <div>
                {t(
                  'billing_see_the_power',
                  'See the power of PostQueen (click here)'
                )}
              </div>
            </div>
          </div>
        )}

        {!!user?.allowTrial && (
          <div className="mt-[2px] flex flex-nowrap mobile:flex-col gap-x-[22px] gap-y-[10px] text-[17px] font-[500]">
            <div className="flex items-center gap-[9px] whitespace-nowrap">
              <TrustCheck />
              <div>{t('billing_no_risk_trial', '100% no-risk free trial')}</div>
            </div>
            <div className="flex items-center gap-[9px] whitespace-nowrap">
              <TrustCheck />
              <div>
                {t('billing_pay_nothing_7_days', 'Pay nothing for 7 days')}
              </div>
            </div>
            <div className="flex items-center gap-[9px] whitespace-nowrap">
              <TrustCheck />
              <div>
                {t('billing_cancel_anytime', 'Cancel anytime, from settings')}
              </div>
            </div>
          </div>
        )}

        {!user?.allowTrial && (
          <div
            data-lapsed-banner="1"
            className="mt-[6px] flex items-center gap-[11px] rounded-[14px] bg-pqAmberSoft p-[14px_17px] text-[15.5px] text-pqText ring-1 ring-inset ring-pqAmberLine"
          >
            {/* Prototype: 18×18 stroke warn circle — not a filled disc. */}
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              aria-hidden="true"
              className="shrink-0 text-pqWarn"
            >
              <path
                d="M12 8v4.5M12 16.2h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {/* Title only (pwLapsedTitle). pwLapsedBody exists in Vals but is
                not in the prototype template — do not render it. Trial date
                from trialWindow(createdAt); missing createdAt → dateless. */}
            <span className="min-w-0 flex-1 font-[700] leading-[1.4]">
              {trialEndedLabel
                ? t(
                    'billing_trial_ended_on',
                    'Your trial ended on {{date}}.',
                    { date: trialEndedLabel }
                  )
                : t(
                    'billing_subscription_ended',
                    'Your subscription ended.'
                  )}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      // A FREE tier replaces the whole shell with this screen on every route,
      // so a screenshot of /media is a screenshot of the paywall. The tool
      // reports that now instead of counting it as coverage — the same reason
      // it reports redirects.
      data-pq-paywall="1"
      className="blurMe flex min-h-0 flex-1 flex-col overflow-y-auto bg-pqBg pb-[132px] mobile:pb-[190px]"
    >
      <div className="sticky top-0 z-40 shrink-0 border-b border-pqLine bg-pqInner">
        <div
          className={clsx(
            CHECKOUT_MAX,
            'flex h-[68px] items-center gap-[14px]',
            mobile
              ? 'px-[16px]'
              : tablet
              ? 'px-[28px]'
              : 'px-[40px]'
          )}
        >
        {/* 34px tile + 19px wordmark + version chip, the checkout header's own
            scale. Version reads NEXT_PUBLIC_APP_VERSION — same source as the
            app rail — not a marketing placeholder. */}
        <div className="flex min-w-0 items-center gap-[6px]">
          <PostQueenLogo
            wordmark
            tileClassName="size-[34px]"
            glyphClassName="size-[19px]"
            wordClassName="text-[19px]"
          />
          <span className="shrink-0 text-[12.5px] tabular-nums text-pqSoft">
            {appVersionLabel}
          </span>
        </div>
        {/* The design names the screen in its own header — the only thing
            telling somebody mid-signup where they are. Hidden on phones, where
            the logo already fills the row. */}
        <div className="flex min-w-0 flex-1 items-center gap-[14px] mobile:hidden">
          <div className="mx-[4px] h-[20px] w-[1px] shrink-0 bg-pqLine" />
          <div
            data-checkout-label="1"
            className="text-[15px] font-[600] text-pqMuted"
          >
            {t('billing_checkout', 'Checkout')}
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-[2px] text-pqMuted">
          {/* Checkout Help: docs / support / report a bug — no Setup tour or
              locked shortcuts (nothing to tour on the paywall). Report a bug
              lives here; the extra Sentry icon below was a duplicate. */}
          <HelpMenu surface="checkout" />
          <div className="flex h-[36px] cursor-pointer items-center rounded-[10px] px-[12px] text-[14.5px] font-[500] transition-colors hover:bg-pqHover hover:text-pqText">
            <DeveloperIconComponent />
          </div>
          <div className="mx-[8px] h-[20px] w-[1px] shrink-0 bg-pqLine mobile:hidden" />
          <div className="flex h-[36px] items-center rounded-[10px] px-[8px] transition-colors hover:bg-pqHover">
            <LanguageComponent />
          </div>
          <div className="grid h-[36px] w-[36px] place-items-center rounded-[10px] transition-colors hover:bg-pqHover hover:text-pqText">
            <ModeComponent />
          </div>
          <div className="flex h-[36px] items-center rounded-[10px] px-[8px] empty:hidden">
            <OrganizationSelector />
          </div>
          {/*<NotificationComponent />*/}
          {user?.tier.current === 'FREE' && (
            <>
              <div className="mx-[8px] h-[20px] w-[1px] shrink-0 bg-pqLine mobile:hidden" />
              <div className="grid h-[36px] w-[36px] place-items-center rounded-[10px] transition-colors hover:bg-pqHover hover:text-pqText">
                <LogoutComponent
                  isIcon={true}
                  confirmMessage={t(
                    'checkout_not_finished_logout',
                    'Your checkout is not finished — the plan you picked will not be saved.'
                  )}
                />
              </div>
            </>
          )}
        </div>
        </div>
      </div>
      <div
        className={clsx(
          CHECKOUT_MAX,
          'flex flex-1 items-start gap-[56px] pb-[40px]',
          // Left: hero + payment + FAQ. Right: Lifetime + plans + order summary.
          // Reverse on phone so plans stay first.
          stackCheckout ? 'flex-col-reverse items-stretch gap-[28px]' : 'flex-row',
          mobile
            ? 'px-[16px] pt-[24px]'
            : tablet
            ? 'px-[28px] pt-[36px]'
            : 'px-[40px] pt-[48px]'
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-[28px]">
          <JoinOver />
          {data?.blocked ? (
            <div className="rounded-[20px] p-[24px] text-[16px] font-[500] ring-[1.5px] ring-inset ring-pqBorder">
              {t(
                'billing_other_account_subscribed',
                'Another account with this email already has an active subscription. Please log off and sign in to that account to manage your subscription.'
              )}
            </div>
          ) : embedFetchError ? (
            <CheckoutEmbedNotice
              message={
                embedFetchError instanceof Error && embedFetchError.message
                  ? embedFetchError.message
                  : t(
                      'billing_checkout_load_failed',
                      'Could not load checkout. Please refresh the page or try again in a moment.'
                    )
              }
            />
          ) : isLoading || !stripe ? (
            <LoadingComponent />
          ) : data?.client_secret ? (
            <EmbeddedBilling
              stripe={stripe}
              secret={data.client_secret}
              showCoupon
              autoApplyCoupon={data.auto_apply_coupon}
              suppressCheckoutChrome={activeMode === 'lifetime'}
              fallbackTier={tier}
              fallbackPeriod={period}
              fallbackAllowTrial={!!user?.allowTrial}
            />
          ) : (
            <CheckoutEmbedNotice
              message={
                typeof data?.message === 'string'
                  ? data.message
                  : t(
                      'billing_checkout_unavailable',
                      'Checkout could not be started. If you already have a subscription, open Billing from settings instead.'
                    )
              }
            />
          )}
          {/* FAQ under payment on the left. */}
          <FAQComponent scale="checkout" />
        </div>
        <div
          className={clsx(
            'flex shrink-0 flex-col gap-[20px]',
            stackCheckout ? 'w-full' : 'sticky top-[84px] w-[min(520px,42%)]'
          )}
        >
          {canBuyLifetime && (
            <LifetimeOfferCard
              selected={activeMode === 'lifetime'}
              onSelect={() => setCheckoutMode('lifetime')}
            />
          )}
          <div className="flex flex-col rounded-[22px] bg-pqInner shadow-pqE1 ring-1 ring-inset ring-pqLine">
            <div className="flex flex-col gap-[18px] p-[24px_26px_22px]">
              <div className="flex w-full items-center justify-between gap-[14px]">
                <div className="min-w-0 font-display text-[21px] font-[600] tracking-[-0.02em]">
                  {t('billing_choose_plan', 'Choose a plan')}
                </div>
                <BillingPeriodToggle
                  period={period === 'YEARLY' ? 'YEARLY' : 'MONTHLY'}
                  monthsFreeN={monthsFree(tier)}
                  onChange={(next) => {
                    setCheckoutMode('subscription');
                    setPeriod(next);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-[11px]">
                {price.map(([key, value]) => {
                  const selected =
                    activeMode === 'subscription' && key === tier;
                  return (
                    <div
                      onClick={() => {
                        setCheckoutMode('subscription');
                        setTier(key);
                      }}
                      key={key}
                      className={clsx(
                        'relative flex cursor-pointer select-none flex-col gap-[8px] rounded-[16px] p-[16px_18px]',
                        selected
                          ? 'bg-pqBrandSoft ring-[1.5px] ring-inset ring-pqBrand'
                          : 'ring-1 ring-inset ring-pqBorder'
                      )}
                    >
                      <div className="flex items-center gap-[9px]">
                        <CheckoutRadio selected={selected} />
                        <span
                          className={clsx(
                            'flex-1 text-[15px] font-[600]',
                            selected ? 'text-pqText' : 'text-pqMuted'
                          )}
                        >
                          {tierLabel(key)}
                        </span>
                        {/* Design puts Popular on PRO. Hidden while the
                            founding deal steers checkout — flip
                            SHOW_PRO_POPULAR_BADGE when that deal retires. */}
                        {key === 'PRO' && SHOW_PRO_POPULAR_BADGE && (
                          <span
                            data-plan-popular="1"
                            className="flex h-[19px] items-center rounded-full bg-pqBrand px-[8px] text-[9.5px] font-[800] uppercase tracking-[0.05em] text-pqOnBrand"
                          >
                            {t('billing_popular', 'Popular')}
                          </span>
                        )}
                      </div>
                      {/* Both periods quote a monthly figure — yearly quotes
                          the effective per-month price, and the order summary
                          carries the billed total. */}
                      <div className="flex items-baseline gap-[4px] ps-[29px]">
                        <span className="font-display text-[26px] font-[600] tracking-[-0.025em] text-pqText">
                          $
                          {period === 'MONTHLY'
                            ? value.month_price
                            : effectiveMonthly(key)}
                        </span>
                        <span className="text-[13px] text-pqMuted">
                          {t('billing_per_month_short', '/mo')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* The design shows this only under PRO — the plan the lifetime
                  deal replaces — and only while the founding-member window is
                  open. Founding always grants Pro. */}
              {tier === 'PRO' &&
                canBuyLifetime &&
                activeMode === 'subscription' && (
                  <button
                    type="button"
                    data-lifetime-upsell="1"
                    onClick={() => setCheckoutMode('lifetime')}
                    className="flex w-full items-center gap-[14px] rounded-[14px] p-[13px_16px] text-start ring-1 ring-inset ring-pqLtOutline transition-colors hover:bg-pqLtChipBg"
                  >
                    <span className="min-w-0 flex-1 text-[14.5px] font-[500] text-pqMuted">
                      {t('billing_or_pay', 'Or pay')}{' '}
                      <span className="font-[700] text-pqLtAmber">
                        ${LIFETIME_PRICE}
                      </span>{' '}
                      {t(
                        'billing_once_and_keep_forever',
                        'once and keep {{tier}} forever',
                        { tier: 'Pro' }
                      )}
                    </span>
                    <span className="shrink-0 text-[13px] font-[700] text-pqLtAmber">
                      {t('billing_switch', 'Switch')}
                    </span>
                  </button>
                )}
              {/* Yearly nudge when Lifetime is not the selected mode. Hidden
                  under PRO while the founding lifetime upsell is also shown —
                  two Switch rows stacked is noise. */}
              {period === 'MONTHLY' &&
                activeMode === 'subscription' &&
                !(tier === 'PRO' && canBuyLifetime) && (
                <div
                  data-yearly-switch="1"
                  className="flex flex-wrap items-center gap-[10px] rounded-[14px] bg-pqOkSoft p-[13px_16px] text-[14.5px] text-pqOk"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    className="shrink-0"
                  >
                    <path
                      d="M7 17 17 7M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="min-w-0 flex-1">
                    {t(
                      'billing_switch_to_yearly',
                      'Switch to yearly and get {{n}} months free',
                      { n: monthsFree(tier) }
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPeriod('YEARLY')}
                    className="font-[600] underline underline-offset-2 hover:no-underline"
                  >
                    {t('billing_switch', 'Switch')}
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[13px] border-t border-pqLine p-[22px_26px_24px]">
              <div className="text-[14px] font-[600] text-pqMuted">
                {t('billing_included_in', 'Included in {{plan}}', {
                  plan: tierLabel(tier),
                })}
              </div>
              <BillingFeatures tier={tier} />
            </div>
          </div>
          {/* Order summary bottom-right (portals from EmbeddedBilling). */}
          {activeMode === 'lifetime' ? (
            <LifetimeOrderSummary />
          ) : isLoading ||
            !data?.client_secret ||
            embedFetchError ||
            data?.blocked ? (
            <OrderSummaryFallbackCard
              tier={tier}
              period={period}
              allowTrial={!!user?.allowTrial}
            />
          ) : (
            <div id="pq-order-summary" className="flex flex-col empty:hidden" />
          )}
        </div>
      </div>
      {activeMode === 'lifetime' && <LifetimePayBar />}
      {activeMode === 'subscription' && !embedChromeLive && !data?.blocked && (
        <SubmitBarFallback
          tier={tier}
          period={period}
          allowTrial={!!user?.allowTrial}
          pending={isLoading || !stripe}
        />
      )}
    </div>
  );
};

type FeatureItem = {
  key: string;
  defaultValue: string;
  prefix?: string | number;
};

export const BillingFeatures: FC<{
  tier: string;
  /**
   * `brand` is the plan card's footer (brand tick tiles); `lifetime` is the
   * founding-member card (amber tick tiles on the lt text colours).
   */
  tone?: 'brand' | 'lifetime';
}> = ({ tier, tone = 'brand' }) => {
  const t = useT();
  const features = useMemo(() => {
    const currentPricing = pricing[tier];
    const channelsOr = currentPricing.channel;
    const list: FeatureItem[] = [];

    // AGENCY carries 1,000,000 channels, which is how "unlimited" is stored.
    // The Billing screen already reads it that way; this list did not, so the
    // checkout offered "1000000 channels" — the one number on the screen that
    // makes the product look broken. Same key as the other screen, so the two
    // cannot drift apart again.
    if (channelsOr > 10000) {
      list.push({
        key: 'plan_unlimited_channels',
        defaultValue: 'Unlimited channels',
      });
    } else {
      list.push({
        key: channelsOr === 1 ? 'billing_channel' : 'billing_channels',
        defaultValue: channelsOr === 1 ? 'channel' : 'channels',
        prefix: channelsOr,
      });
    }

    list.push({
      key: 'billing_posts_per_month',
      defaultValue: 'posts per month',
      prefix:
        currentPricing.posts_per_month > 10000
          ? 'unlimited'
          : currentPricing.posts_per_month,
    });

    if (currentPricing.team_members) {
      list.push({
        key: 'billing_unlimited_team_members',
        defaultValue: 'Unlimited team members',
      });
    }
    if (currentPricing?.ai) {
      list.push({
        key: 'billing_ai_auto_complete',
        defaultValue: 'AI auto-complete',
      });
      list.push({ key: 'billing_ai_copilots', defaultValue: 'AI copilots' });
      // `billing_ai_autocomplete` — "AI Autocomplete" — used to be pushed here,
      // one line below "AI auto-complete". The same feature spelled twice, on
      // the checkout screen, in every plan. Its twin in main.billing.component
      // was removed with it; the key stays in the catalogues, unused, because
      // deleting a translation key is not this migration's business.
    }
    list.push({
      key: 'billing_advanced_picture_editor',
      defaultValue: 'Advanced Picture Editor',
    });
    if (currentPricing?.image_generator) {
      list.push({
        key: 'billing_ai_images_per_month',
        defaultValue: 'AI Images per month',
        prefix: currentPricing?.image_generation_count,
      });
    }
    if (currentPricing?.generate_videos) {
      list.push({
        key: 'billing_ai_videos_per_month',
        defaultValue: 'AI Videos per month',
        prefix: currentPricing?.generate_videos,
      });
    }
    return list;
  }, [tier]);

  const renderFeature = (feature: FeatureItem) => {
    const translatedText = t(feature.key, feature.defaultValue);
    if (feature.prefix === 'unlimited') {
      return `${t('billing_unlimited', 'Unlimited')} ${translatedText}`;
    }
    if (feature.prefix !== undefined) {
      return `${feature.prefix} ${translatedText}`;
    }
    return translatedText;
  };

  return (
    <div className="grid grid-cols-2 gap-x-[18px] gap-y-[10px] mobile:grid-cols-1">
      {features.map((feature) => {
        // The one row the design lets glow — carrying `pq-loop` so
        // prefers-reduced-motion can switch the loop off (see global.scss).
        const unlimited = feature.key === 'plan_unlimited_channels';
        return (
          <div
            key={feature.key}
            className={clsx(
              'flex min-w-0 items-center gap-[9px] font-[600]',
              tone === 'lifetime'
                ? 'text-[13.5px] text-pqLtText'
                : 'text-[14px] text-pqText',
              unlimited && 'animate-pqUnlim pq-loop'
            )}
          >
            <span
              className={clsx(
                'grid size-[17px] shrink-0 place-items-center rounded-[5px]',
                tone === 'lifetime' ? 'bg-pqLtTick' : 'bg-pqBrand'
              )}
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                aria-hidden="true"
                className={
                  tone === 'lifetime' ? 'text-pqLtTickFg' : 'text-pqOnBrand'
                }
              >
                <path
                  d="m5 12.5 4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>{renderFeature(feature)}</div>
          </div>
        );
      })}
    </div>
  );
};
