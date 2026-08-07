'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Subscription } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';
import ReactLoading from '@gitroom/frontend/components/layout/loading';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useToaster } from '@gitroom/react/toaster/toaster';
import dayjs from 'dayjs';
import clsx from 'clsx';
import {
  AnyTier,
  effectiveMonthly,
  LIFETIME_GRANT_TIER,
  LIFETIME_PRICE,
  LIFETIME_RETENTION_PRICE,
  monthsFree,
  PaidTier,
  pricing,
  TRIAL_DAYS,
  tierLabel,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { BillingPeriodToggle } from '@gitroom/frontend/components/billing/billing-period-toggle';
import { useSWRConfig } from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useSearchParams } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FinishTrial } from '@gitroom/frontend/components/billing/finish.trial';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import {
  BuyLifetime,
  FeatureRow,
  FoundingMember,
  LifetimePackages,
} from '@gitroom/frontend/components/billing/lifetime.deal';
import { BillingFeatures } from '@gitroom/frontend/components/billing/first.billing.component';

export const Prorate: FC<{
  period: 'MONTHLY' | 'YEARLY';
  pack: PaidTier;
}> = (props) => {
  const { period, pack } = props;
  const t = useT();
  const fetch = useFetch();
  const [price, setPrice] = useState<number | false>(0);
  const [loading, setLoading] = useState(false);
  const calculatePrice = useDebouncedCallback(async () => {
    setLoading(true);
    setPrice(
      (
        await (
          await fetch('/billing/prorate', {
            method: 'POST',
            body: JSON.stringify({
              period,
              billing: pack,
            }),
          })
        ).json()
      ).price
    );
    setLoading(false);
  }, 500);
  useEffect(() => {
    setPrice(false);
    calculatePrice();
  }, [period, pack]);
  if (loading) {
    return (
      <div className="min-h-[17px] text-pqMuted">
        <ReactLoading type="spin" color="currentColor" width={15} height={15} />
      </div>
    );
  }
  if (price === false) {
    return <div className="min-h-[17px]" />;
  }
  return (
    <div className="flex min-h-[17px] text-[12.5px] font-[600] text-pqOk">
      {/* `toFixed(1)` rendered every amount with one decimal — "$0.0", "$49.0" —
          which is not how money is written anywhere. Whole dollars stay whole;
          anything with cents keeps two. */}
      ({t('pay_today', 'Pay Today')} $
      {(() => {
        const value = price < 0 ? 0 : price;
        return value % 1 === 0 ? String(value) : value.toFixed(2);
      })()}
      )
    </div>
  );
};
export const Features: FC<{
  pack: AnyTier;
}> = (props) => {
  const { pack } = props;
  const t = useT();
  const features = useMemo(() => {
    const currentPricing = pricing[pack];
    const channelsOr = currentPricing.channel;
    const list: Array<{ label: string; unlim?: boolean }> = [];

    // The same "a very large number means unlimited" reading the posts line has
    // always used. AGENCY's channel count joined it when unlimited was decided,
    // so neither needs a tier named here. The unlimited-channels line is the
    // one the design animates, so it is flagged rather than string-matched.
    list.push(
      channelsOr > 10000
        ? {
            label: t('plan_unlimited_channels', 'Unlimited channels'),
            unlim: true,
          }
        : channelsOr === 1
        ? { label: t('plan_one_channel', '1 channel') }
        : {
            label: t('plan_n_channels', '{{count}} channels', {
              count: channelsOr,
            }),
          }
    );
    list.push({
      label:
        currentPricing.posts_per_month > 10000
          ? t('plan_unlimited_posts', 'Unlimited posts per month')
          : t('plan_n_posts', '{{count}} posts per month', {
              count: currentPricing.posts_per_month,
            }),
    });
    if (currentPricing.team_members) {
      list.push({ label: t('plan_unlimited_team', 'Unlimited team members') });
    }
    if (currentPricing?.ai) {
      // `AI Autocomplete` used to be pushed here too, one line below
      // `AI auto-complete` — the same feature spelled twice, and every card
      // listed it twice.
      list.push({ label: t('plan_ai_autocomplete', 'AI auto-complete') });
      list.push({ label: t('plan_ai_copilots', 'AI copilots') });
    }
    list.push({ label: t('plan_picture_editor', 'Advanced Picture Editor') });
    if (currentPricing?.image_generator) {
      list.push({
        label: t('plan_n_ai_images', '{{count}} AI Images per month', {
          count: currentPricing?.image_generation_count,
        }),
      });
    }
    if (currentPricing?.generate_videos) {
      list.push({
        label: t('plan_n_ai_videos', '{{count}} AI Videos per month', {
          count: currentPricing?.generate_videos,
        }),
      });
    }
    return list;
  }, [pack, t]);
  return (
    <div className="flex flex-col gap-[9px]">
      {features.map((feature) => (
        <FeatureRow key={feature.label} {...feature} />
      ))}
    </div>
  );
};

type CancelStep = 'confirm' | 'discount' | 'feedback';
type CancelFlowResult =
  | { action: 'keep' }
  | { action: 'applied' }
  | { action: 'canceled'; feedback: string };

/**
 * Prototype `billingDlg` cancel chain: confirm → (optional retention) → feedback.
 * Lifetime trial offers $24.50 founding retention; others offer 50%×3 months.
 */
const BillingCancelDialog: FC<{
  showTeamNote: boolean;
  offerDiscount: boolean;
  offerLifetimeRetention: boolean;
  isLifetimeTrial: boolean;
  onDone: (result: CancelFlowResult) => void;
}> = ({
  showTeamNote,
  offerDiscount,
  offerLifetimeRetention,
  isLifetimeTrial,
  onDone,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const events = useFireEvents();
  const [step, setStep] = useState<CancelStep>('confirm');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const showRetentionStep = offerLifetimeRetention || offerDiscount;

  const finishKeep = useCallback(() => onDone({ action: 'keep' }), [onDone]);

  const applyDiscount = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/billing/apply-discount', { method: 'POST' });
      toaster.show(
        t('discount_applied_successfully', '50% discount applied successfully')
      );
      onDone({ action: 'applied' });
    } finally {
      setLoading(false);
    }
  }, [fetch, onDone, t, toaster]);

  const applyLifetimeRetention = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (
        await fetch('/billing/apply-lifetime-retention', { method: 'POST' })
      ).json();
      if (!res?.ok) {
        toaster.show(
          t(
            'lifetime_retention_charge_failed',
            'Could not charge {{amount}}. Update your payment method and try again.',
            { amount: `$${LIFETIME_RETENTION_PRICE}` }
          ),
          'warning'
        );
        return;
      }
      toaster.show(
        t(
          'lifetime_retention_unlocked',
          'Lifetime access unlocked for {{amount}}',
          { amount: `$${LIFETIME_RETENTION_PRICE}` }
        )
      );
      onDone({ action: 'applied' });
    } finally {
      setLoading(false);
    }
  }, [fetch, onDone, t, toaster]);

  const submitCancel = useCallback(() => {
    if (feedback.length < 20) return;
    events('cancel_subscription');
    onDone({ action: 'canceled', feedback });
  }, [events, feedback, onDone]);

  const title =
    step === 'confirm'
      ? isLifetimeTrial
        ? t('cancel_founding_trial', 'Cancel founding-member trial')
        : t('cancel_subscription', 'Cancel Subscription')
      : step === 'discount'
      ? t('before_you_cancel', 'Before you cancel')
      : t('we_are_sorry_to_see_you_go', 'We are sorry to see you go :(');

  const body =
    step === 'confirm'
      ? isLifetimeTrial
        ? t(
            'cancel_founding_trial_body',
            'Cancel your founding-member trial? You will lose lifetime access and go back to the free plan.'
          )
        : t(
            'cancel_subscription_keep_access',
            'Are you sure you want to cancel your subscription? You keep access until the end of the current period.'
          )
      : step === 'discount'
      ? offerLifetimeRetention
        ? t(
            'accept_lifetime_retention_body',
            'Take 50% off and keep lifetime access for {{retention}} instead of {{full}} — one payment, never charged again.',
            {
              retention: `$${LIFETIME_RETENTION_PRICE}`,
              full: `$${LIFETIME_PRICE}`,
            }
          )
        : t(
            'accept_50_discount_3_months',
            'Would you accept 50% discount for 3 months instead? 🙏🏻'
          )
      : t(
          'would_you_mind_shortly_tell_us_what_we_could_have_done_better',
          'Would you mind shortly tell us what we could have done better?'
        );

  const iconIsBrand = step === 'discount';
  const feedbackOk = feedback.length >= 20;

  return (
    <div
      className="mx-auto flex w-full max-w-[480px] flex-col gap-[16px] rounded-[16px] bg-pqPop p-[26px] text-pqText shadow-pqE3"
      data-pq="billing-cancel-dlg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-[12px]">
        <span
          className={clsx(
            'grid size-[38px] shrink-0 place-items-center rounded-[11px]',
            iconIsBrand
              ? 'bg-pqBrandSoft text-pqBrand'
              : 'bg-pqAmberSoft text-pqAmber'
          )}
        >
          {iconIsBrand ? (
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <path
                d="M7 17 17 7M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <path
                d="M12 9v4M12 16.5h.01M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1 pt-[2px]">
          <h3 className="font-display text-[18px] font-[600] -tracking-[0.015em] text-pqText">
            {title}
          </h3>
          <div className="mt-[5px] text-[13.5px] leading-[1.6] text-pqMuted">
            {body}
          </div>
        </div>
        <button
          type="button"
          onClick={finishKeep}
          aria-label={t('close', 'Close')}
          className="grid size-[30px] shrink-0 place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
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
      </div>

      {step === 'confirm' && showTeamNote && (
        <div className="flex gap-[9px] rounded-[11px] bg-pqAmberSoft px-[14px] py-[12px] outline outline-1 -outline-offset-1 outline-pqAmberLine">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            className="mt-[1px] shrink-0 text-pqAmber"
          >
            <path
              d="M12 9v4M12 16.5h.01M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-[12.5px] leading-[1.55] text-pqText">
            {t(
              'team_members_will_be_removed',
              'Your team members will be removed from your organization.'
            )}
          </div>
        </div>
      )}

      {step === 'feedback' && (
        <div className="flex flex-col gap-[7px]">
          <label className="text-[12px] font-[600] tracking-[0.02em] text-pqMuted">
            {t('feedback', 'Feedback')}
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t(
              'feedback_placeholder_better',
              'What could we have done better?'
            )}
            className="min-h-[96px] w-full resize-y rounded-[11px] border-0 bg-pqBg p-[12px] text-[13.5px] leading-[1.6] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)]"
          />
          <div
            className={clsx(
              'text-[11.5px]',
              feedbackOk ? 'text-pqOk' : 'text-pqAmber'
            )}
          >
            {feedbackOk
              ? t('feedback_thanks', 'Thanks, this helps us improve.')
              : t(
                  'please_add_at_least_n_chars',
                  'Please add at least 20 characters — {{count}}/20',
                  { count: feedback.length }
                )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-[9px]">
        {step === 'confirm' && (
          <>
            <button
              type="button"
              onClick={finishKeep}
              className="h-[42px] rounded-[10px] bg-pqSettings px-[16px] text-[13.5px] font-[600] text-pqText transition-shadow hover:shadow-[inset_0_0_0_999px_var(--hover)]"
            >
              {t('keep_my_plan', 'Keep my plan')}
            </button>
            <button
              type="button"
              onClick={() =>
                setStep(showRetentionStep ? 'discount' : 'feedback')
              }
              className="h-[42px] rounded-[10px] bg-pqDanger px-[18px] text-[13.5px] font-[600] text-white transition-[filter] hover:brightness-110"
            >
              {t('yes_cancel', 'Yes, cancel')}
            </button>
          </>
        )}
        {step === 'discount' && (
          <>
            <button
              type="button"
              onClick={() => setStep('feedback')}
              className="h-[42px] rounded-[10px] bg-pqSettings px-[16px] text-[13.5px] font-[600] text-pqWarn transition-shadow hover:shadow-[inset_0_0_0_999px_var(--hover)]"
            >
              {t('cancel_my_subscription', 'Cancel my subscription')}
            </button>
            <Button
              loading={loading}
              onClick={
                offerLifetimeRetention ? applyLifetimeRetention : applyDiscount
              }
              className="h-[42px] rounded-[10px] px-[18px] text-[13.5px] font-[600]"
            >
              {offerLifetimeRetention
                ? t('get_lifetime_for_amount', 'Get lifetime for {{amount}}', {
                    amount: `$${LIFETIME_RETENTION_PRICE}`,
                  })
                : t(
                    'apply_50_discount_3_months',
                    'Apply 50% discount for 3 months'
                  )}
            </Button>
          </>
        )}
        {step === 'feedback' && (
          <button
            type="button"
            disabled={!feedbackOk}
            onClick={submitCancel}
            className={clsx(
              'h-[42px] rounded-[10px] bg-pqDanger px-[18px] text-[13.5px] font-[600] text-white transition-[filter] hover:brightness-110',
              !feedbackOk && 'opacity-50'
            )}
          >
            {!feedbackOk
              ? t('please_add_at_least', 'Please add at least 20 chars')
              : t('cancel_subscription', 'Cancel Subscription')}
          </button>
        )}
      </div>
    </div>
  );
};
export const MainBillingComponent: FC<{
  sub?: Subscription;
  discount?: {
    percentOff: number;
    endsAt: string | null;
    months: number | null;
  } | null;
  paymentFailed?: boolean;
}> = (props) => {
  const { sub, discount, paymentFailed } = props;
  const { isGeneral } = useVariables();
  const { mutate } = useSWRConfig();
  const fetch = useFetch();
  const toast = useToaster();
  const user = useUser();
  const dub = useDubClickId();
  const modal = useModals();
  const utm = useUtmUrl();
  const track = useTrack();
  const t = useT();
  const queryParams = useSearchParams();
  const [finishTrial, setFinishTrial] = useState(
    !!queryParams.get('finishTrial')
  );

  const [subscription, setSubscription] = useState<Subscription | undefined>(
    sub
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>(
    subscription?.period || 'MONTHLY'
  );
  const [monthlyOrYearly, setMonthlyOrYearly] = useState<'on' | 'off'>(
    period === 'MONTHLY' ? 'off' : 'on'
  );
  const [initialChannels, setInitialChannels] = useState(
    sub?.totalChannels || 1
  );
  useEffect(() => {
    if (initialChannels !== sub?.totalChannels) {
      setInitialChannels(sub?.totalChannels || 1);
    }
    if (period !== sub?.period) {
      setPeriod(sub?.period || 'MONTHLY');
      setMonthlyOrYearly(
        (sub?.period || 'MONTHLY') === 'MONTHLY' ? 'off' : 'on'
      );
    }
    setSubscription(sub);
  }, [sub]);
  const updatePayment = useCallback(async () => {
    const { portal } = await (await fetch('/billing/portal')).json();
    window.location.href = portal;
  }, []);
  const currentPackage = useMemo(() => {
    if (!subscription) {
      return 'FREE';
    }
    if (period === 'YEARLY' && monthlyOrYearly === 'off') {
      return '';
    }
    if (period === 'MONTHLY' && monthlyOrYearly === 'on') {
      return '';
    }
    return subscription?.subscriptionTier;
  }, [subscription, initialChannels, monthlyOrYearly, period]);

  // What the subscribed tier costs at the period the toggle is showing, and
  // what it costs once the retention coupon is taken off it. Only the discount
  // banner reads these; the plan cards price themselves from `pricing`.
  const currentPrice = useMemo(() => {
    const tier = pricing[subscription?.subscriptionTier!];
    if (!tier) return 0;
    return monthlyOrYearly === 'on' ? tier.year_price : tier.month_price;
  }, [subscription, monthlyOrYearly]);
  const discountedPrice = useMemo(() => {
    const off = (currentPrice * (100 - (props.discount?.percentOff || 0))) / 100;
    // Whole dollars stay whole — "$10" reads as a price, "$10.00" as a receipt.
    return off % 1 === 0 ? off : off.toFixed(2);
  }, [currentPrice, props.discount]);
  // The lifetime split. `isTrailing` is the organization's trial flag, so a
  // founding member still inside the trial sees the plan grid (with the
  // LIFETIME card variant) while a paid one sees the lifetime surface.
  // `lifetimePaymentPending` = deferred $49 still owed after the window —
  // treat as not fully paid (lock-until-paid).
  const lifetimePaid =
    !!user?.isLifetime && !user?.isTrailing && !user?.lifetimePaymentPending;
  const lifetimeUnpaid = !!user?.lifetimePaymentPending;
  // Founding purchase always grants Pro — same as First Billing and the Stripe grant.
  const ltUpsellTier = LIFETIME_GRANT_TIER;
  // What the running trial will charge when it ends: the subscribed tier at
  // the subscription's own period — not whichever period the toggle shows.
  const trialPrice = useMemo(() => {
    const tier = pricing[subscription?.subscriptionTier!];
    if (!tier) return 0;
    return subscription?.period === 'YEARLY'
      ? tier.year_price
      : tier.month_price;
  }, [subscription]);
  // The design's plan-meta line. Renewal and trial-end dates live in Stripe
  // and are not in this state, so those variants render without a date rather
  // than inventing one; `cancelAt` is local and keeps its date.
  const planMeta = useMemo(() => {
    if (!subscription?.id) {
      return t('plan_meta_free', 'PostQueen FREE · no active subscription');
    }
    const tier = subscription.subscriptionTier;
    const tierName = tierLabel(tier);
    if (subscription.cancelAt) {
      return t(
        'plan_meta_access_until',
        'PostQueen {{tier}} · access until {{date}}',
        {
          tier: tierName,
          date: newDayjs(subscription.cancelAt).local().format('D MMM, YYYY'),
        }
      );
    }
    if (user?.isLifetime && user?.isTrailing) {
      return t(
        'plan_meta_founding_trial',
        'PostQueen {{tier}} · founding-member trial',
        { tier: tierName }
      );
    }
    if (user?.isTrailing) {
      return t('plan_meta_trial', 'PostQueen {{tier}} · free trial', {
        tier: tierName,
      });
    }
    return t('plan_meta_current', 'PostQueen {{tier}}', { tier: tierName });
  }, [subscription, user, t]);
  // Prototype `pagesVals().plans` CTA matrix (~L8056): Current plan · Switch
  // to yearly/monthly · Upgrade/Downgrade to {label} · trial/Purchase for FREE.
  // Handlers stay on `moveToCheckout`; this only picks the visible label.
  const planCardCta = useCallback(
    (name: string) => {
      const target = name.toUpperCase();
      const cur = (subscription?.subscriptionTier || 'FREE').toUpperCase();
      const viewingYearly = monthlyOrYearly === 'on';
      const periodMismatch =
        !!subscription?.id && viewingYearly !== (period === 'YEARLY');

      if (currentPackage === target) {
        return t('current_plan', 'Current plan');
      }
      if (periodMismatch && target === cur) {
        return viewingYearly
          ? t('switch_to_yearly', 'Switch to yearly')
          : t('switch_to_monthly', 'Switch to monthly');
      }
      if (target === 'FREE') {
        if (subscription?.cancelAt) {
          return t('downgrade_on', 'Downgrade on {{date}}', {
            date: dayjs.utc(subscription.cancelAt).local().format('D MMM, YYYY'),
          });
        }
        return t('cancel_subscription_1', 'Cancel subscription');
      }
      if (cur === 'FREE') {
        if (user?.allowTrial) {
          return t('start_7_days_free_trial', 'Start 7 days free trial');
        }
        return t('purchase', 'Purchase');
      }

      const curPricing = pricing[cur] || pricing.PRO;
      const targetPricing = pricing[target] || pricing.PRO;
      const curPrice = viewingYearly
        ? curPricing.year_price
        : curPricing.month_price;
      const targetPrice = viewingYearly
        ? targetPricing.year_price
        : targetPricing.month_price;
      const plan = tierLabel(target);
      if (targetPrice > curPrice) {
        return t('upgrade_to_plan', 'Upgrade to {{plan}}', { plan });
      }
      return t('downgrade_to_plan', 'Downgrade to {{plan}}', { plan });
    },
    [
      subscription,
      monthlyOrYearly,
      period,
      currentPackage,
      user,
      t,
    ]
  );
  const moveToCheckout = useCallback(
    (billing: AnyTier, reactivate = false) =>
      async () => {
        if (reactivate) {
          setLoading(true);
          const { cancel_at } = await (
            await fetch('/billing/cancel', {
              method: 'POST',
              body: JSON.stringify({
                feedback: '',
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            })
          ).json();
          setSubscription((subs) => ({
            ...subs!,
            cancelAt: cancel_at,
          }));

          toast.show('Subscription reactivated successfully');
          setLoading(false);
          return;
        }

        const messages = [];
        if (
          !pricing[billing].team_members &&
          pricing[subscription?.subscriptionTier!]?.team_members
        ) {
          messages.push(
            `Your team members will be removed from your organization`
          );
        }
        if (billing === 'FREE') {
          // Already scheduled to cancel — keep the old reactivation path above;
          // this branch is only for starting a cancel. Skip if already canceling.
          if (subscription?.cancelAt) {
            return;
          }

          const isLifetimeTrial = !!user?.isLifetime && !!user?.isTrailing;
          // Prefetch eligibility so confirm → discount never flashes an empty step.
          // Lifetime trial always gets the $24.50 founding retention (never 50%×3).
          const offerLifetimeRetention = isLifetimeTrial;
          const checkDiscount = isLifetimeTrial
            ? { offerCoupon: false as const }
            : await (await fetch('/billing/check-discount')).json();
          const offerDiscount =
            !!checkDiscount.offerCoupon && !isLifetimeTrial;

          const result = await new Promise<CancelFlowResult>((res) => {
            let settled = false;
            const finish = (r: CancelFlowResult) => {
              if (settled) return;
              settled = true;
              modal.closeAll();
              res(r);
            };
            modal.openModal({
              title: '',
              removeLayout: true,
              askClose: false,
              onClose: () => finish({ action: 'keep' }),
              children: (
                <BillingCancelDialog
                  showTeamNote={messages.length > 0}
                  offerDiscount={offerDiscount}
                  offerLifetimeRetention={offerLifetimeRetention}
                  isLifetimeTrial={isLifetimeTrial}
                  onDone={finish}
                />
              ),
            });
          });

          if (result.action === 'keep') {
            return;
          }
          if (result.action === 'applied') {
            await mutate('/user/subscription');
            await mutate('/user/self');
            return;
          }

          setLoading(true);
          const { cancel_at } = await (
            await fetch('/billing/cancel', {
              method: 'POST',
              body: JSON.stringify({
                feedback: result.feedback,
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            })
          ).json();
          setSubscription((subs) => ({
            ...subs!,
            cancelAt: cancel_at,
          }));
          if (cancel_at)
            toast.show('Subscription set to canceled successfully');
          setLoading(false);
          return;
        }
        if (
          messages.length &&
          !(await deleteDialog(messages.join(', '), 'Yes, continue'))
        ) {
          return;
        }
        setLoading(true);
        const { url, portal, blocked } = await (
          await fetch('/billing/subscribe', {
            method: 'POST',
            body: JSON.stringify({
              period: monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY',
              utm,
              billing,
              ...(dub ? { dub } : {}),
            }),
          })
        ).json();
        if (blocked) {
          setLoading(false);
          await deleteDialog(
            t(
              'billing_other_account_subscribed',
              'Another account with this email already has an active subscription. Please log off and sign in to that account to manage your subscription.'
            ),
            t('ok', 'OK'),
            t('already_subscribed', 'Already subscribed')
          );
          return;
        }
        if (url) {
          await track(TrackEnum.InitiateCheckout, {
            value:
              pricing[billing][
                monthlyOrYearly === 'on' ? 'year_price' : 'month_price'
              ],
          });
          window.location.href = url;
          return;
        }
        if (portal) {
          if (
            // doc 03's payment_failed state, word for word — and untranslated
            // until now, on a dialog that only ever appears to somebody whose
            // card was just declined, in an app with fourteen languages.
            await deleteDialog(
              t(
                'billing_card_declined',
                'We could not charge your credit card, please update your payment method'
              ),
              t('update', 'Update'),
              t('billing_payment_method_required', 'Payment Method Required')
            )
          ) {
            window.open(portal);
          }
        } else {
          setPeriod(monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY');
          setSubscription((subs) => ({
            ...subs!,
            subscriptionTier: billing,
            cancelAt: null,
          }));
          mutate(
            '/user/self',
            {
              ...user,
              tier: billing,
            },
            {
              revalidate: false,
            }
          );
          toast.show('Subscription updated successfully');
        }
        setLoading(false);
      },
    [monthlyOrYearly, subscription, user, utm, modal, mutate, fetch, toast, t, dub, track]
  );
  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex flex-wrap items-center gap-[16px]">
        <div className="flex min-w-[200px] flex-1 flex-col gap-[4px]">
          <h2 className="font-display text-[26px] font-[600] -tracking-[0.02em] text-pqText">
            {t('plans', 'Plans')}
          </h2>
        </div>
      </div>

      {finishTrial && (
        <FinishTrial
          close={() => setFinishTrial(false)}
          charged={user?.isLifetime ? LIFETIME_PRICE : trialPrice}
          period={subscription?.period}
        />
      )}

      {/* Founding-member upsell — design `ltUpsellDisplay`: every active trial
          that is not already on lifetime. Not gated on the 24h signup window
          (that only closed the strip for most of a 7-day trial). Backend allows
          checkout while `isTrailing` OR within `lifetimeWindow`. */}
      {!user?.isLifetime && user?.isTrailing && (
        <div
          data-lifetime-upsell="1"
          className="flex flex-col gap-[14px] rounded-[16px] bg-pqLtCardOn p-[20px_22px] outline outline-1 -outline-offset-1 outline-pqLtOutline"
        >
          <div className="flex items-start gap-[14px]">
            <span className="grid size-[38px] shrink-0 place-items-center rounded-[12px] bg-pqLtChipBg text-pqLtAmber">
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="currentColor"
              >
                <path d="M3 8.5 7.2 12 12 4.5 16.8 12 21 8.5l-1.7 9.7a1 1 0 0 1-1 .8H5.7a1 1 0 0 1-1-.8L3 8.5Z" />
              </svg>
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-[16px] gap-y-[10px]">
              <div className="flex min-w-0 flex-col items-start gap-[8px]">
                <span className="grid h-[19px] place-items-center rounded-full bg-pqLtSolid px-[8px] text-[9px] font-[800] uppercase tracking-[0.05em] text-pqLtSolidFg">
                  {t('lt_upsell_badge', 'Become a founding member')}
                </span>
                <span className="text-[18px] font-[600] -tracking-[0.01em] text-pqText">
                  {t('lt_upsell_title', 'Lifetime access & updates')}
                </span>
                <div className="text-[14px] leading-[1.45] text-pqText">
                  {t(
                    'lt_upsell_sub_trial',
                    'Switch before your trial ends — {{tier}} for ${{price}} once.',
                    { tier: tierLabel(ltUpsellTier), price: LIFETIME_PRICE }
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-[10px]">
                <div className="flex items-baseline gap-[6px]">
                  <span className="text-[13px] text-pqLtDimmer line-through">
                    {t('lt_upsell_compare', '${{price}}/yr', {
                      price: pricing.PRO.year_price,
                    })}
                  </span>
                  <span className="font-display text-[26px] font-[700] leading-none -tracking-[0.02em] text-pqLtAmber">
                    ${LIFETIME_PRICE}
                  </span>
                  <span className="text-[12px] text-pqSoft">
                    {t('lt_once', 'once')}
                  </span>
                </div>
                <BuyLifetime label={t('lt_upsell_cta', 'Switch to lifetime')} />
              </div>
            </div>
          </div>
          <div aria-hidden className="h-px bg-pqLtLine" />
          <BillingFeatures tier={ltUpsellTier} tone="lifetime" />
        </div>
      )}

      {/* A renewal Stripe could not charge. Stripe retries on its own schedule,
          so this says what is true — nothing is cancelled — rather than
          threatening. The design puts `payFailShow` in this position, above the
          trial banner and below the lifetime upsell. Same strip for deferred
          founding $49 that failed after the trial window (lock-until-paid). */}
      {(!!paymentFailed || lifetimeUnpaid) && !subscription?.cancelAt && (
        <div
          data-payment-failed={lifetimeUnpaid ? 'lifetime' : '1'}
          className="flex flex-wrap items-center gap-[14px] rounded-[16px] bg-gradient-to-r from-pqDangerSoft to-transparent p-[14px_16px] outline outline-1 -outline-offset-1 outline-pqDangerLine"
        >
          <div className="grid size-[38px] shrink-0 place-items-center rounded-[12px] bg-pqDangerChip text-pqDanger">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <path
                d="M2.5 9.5h19M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="text-[14.5px] font-[600] -tracking-[0.01em] text-pqText">
              {t('payment_failed_title', 'We could not charge your credit card')}
            </div>
            <div className="mt-[3px] text-[12.5px] text-pqMuted">
              {lifetimeUnpaid
                ? t(
                    'lifetime_payment_pending_body',
                    'Your founding member fee could not be collected. Update your payment method and we will try again. Founding access stays locked until payment succeeds.'
                  )
                : t(
                    'payment_failed_body',
                    'Update your payment method and we will try again. Nothing is cancelled yet.'
                  )}
            </div>
          </div>
          <button
            type="button"
            onClick={updatePayment}
            className="h-[36px] whitespace-nowrap rounded-[10px] bg-pqDanger px-[16px] text-[13px] font-[600] text-pqOnBrand transition-all hover:brightness-[1.08]"
          >
            {t('update_payment_method', 'Update payment method')}
          </button>
        </div>
      )}

      {/* The running trial. The end date lives in Stripe, so the line names the
          charge — which this state does know — and not a day. The CTA opens the
          same FinishTrial flow the ?finishTrial query param does. */}
      {user?.isTrailing &&
        !!subscription?.id &&
        !subscription?.cancelAt &&
        !paymentFailed &&
        !lifetimeUnpaid && (
          <div
            data-trial-banner="1"
            className={clsx(
              'flex flex-wrap items-center gap-[10px] rounded-[11px] p-[11px_14px]',
              user?.isLifetime ? 'bg-pqLtChipBg' : 'bg-pqBrandSoft'
            )}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              className={clsx(
                'shrink-0',
                user?.isLifetime ? 'text-pqLtSolid' : 'text-pqBrand'
              )}
            >
              <path
                d="M12 7.5V12l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="min-w-[180px] flex-1 text-[13px] text-pqText">
              {user?.isLifetime
                ? t(
                    'trial_banner_founding',
                    'Your {{days}}-day founding-member trial is running — you will be charged ${{price}} once, and never again.',
                    { days: TRIAL_DAYS, price: LIFETIME_PRICE }
                  )
                : t(
                    'trial_banner_active',
                    'Your free trial is running — you will be charged ${{price}} when it ends.',
                    { price: trialPrice }
                  )}
            </div>
            <button
              type="button"
              onClick={() => setFinishTrial(true)}
              className={clsx(
                'h-[32px] rounded-[9px] px-[14px] text-[12.5px] font-[600] transition-all hover:brightness-110',
                user?.isLifetime
                  ? 'bg-pqLtSolid text-pqLtSolidFg'
                  : 'bg-pqBrand text-pqOnBrand'
              )}
            >
              {t('end_free_trial', 'End free trial')}
            </button>
          </div>
        )}

      {/* The retention offer, once it has been accepted. The design shows it as
          a green strip with the old price struck through beside the new one —
          `discountShow: !!discountUntil && !cancelAt && !subEnded && !isLifetime`
          — and hides it the moment the subscription is on its way out, which is
          what the two conditions here are. */}
      {!!discount && !subscription?.cancelAt && (
        <div
          data-discount-active="1"
          className="flex flex-wrap items-center gap-[14px] rounded-[16px] bg-gradient-to-r from-pqOkSoft to-transparent p-[14px_16px] outline outline-1 -outline-offset-1 outline-pqOkLine"
        >
          <div className="grid size-[38px] shrink-0 place-items-center rounded-[12px] bg-pqOkSoft text-pqOk">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <path
                d="M7 17 17 7M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="text-[14.5px] font-[600] -tracking-[0.01em] text-pqText">
              {t('discount_active', '{{percent}}% discount active', {
                percent: discount.percentOff,
              })}
            </div>
            <div className="mt-[3px] text-[12.5px] text-pqMuted">
              {discount.endsAt
                ? t('discount_until', 'Applied to every invoice through {{date}}.', {
                    date: dayjs
                      .utc(discount.endsAt)
                      .local()
                      .format('D MMM, YYYY'),
                  })
                : t('discount_forever', 'Applied to every invoice from now on.')}
            </div>
          </div>
          <div className="flex items-baseline gap-[8px] pe-[2px]">
            <span className="text-[14px] text-pqSoft line-through">
              ${currentPrice}
            </span>
            <span className="font-display text-[24px] font-[700] -tracking-[0.02em] text-pqOk">
              ${discountedPrice}
            </span>
            <span className="text-[12.5px] text-pqMuted">
              {monthlyOrYearly === 'on'
                ? t('billing_per_year', '/ year')
                : t('billing_per_month', '/ month')}
            </span>
          </div>
        </div>
      )}

      {/* The cancellation notice, as the design's orange strip with the
          reactivation right inside it — the same handler the plan card's
          Reactivate button runs. `cancelAt` is local state, so this is the one
          strip that may name a date. */}
      {subscription?.cancelAt && isGeneral && (
        <div
          data-cancel-notice="1"
          className="flex flex-wrap items-center gap-[14px] rounded-[16px] bg-gradient-to-r from-pqAmberSoft to-transparent p-[14px_16px] outline outline-1 -outline-offset-1 outline-pqAmberLine"
        >
          <div className="grid size-[38px] shrink-0 place-items-center rounded-[12px] bg-pqAmberSoft text-pqWarn">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <path
                d="M12 8v4.5M12 16.2h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="text-[14.5px] font-[600] -tracking-[0.01em] text-pqText">
              {t(
                'cancel_notice_title',
                'Your subscription will be canceled at {{date}}',
                {
                  date: newDayjs(subscription.cancelAt)
                    .local()
                    .format('D MMM, YYYY'),
                }
              )}
            </div>
            <div className="mt-[3px] text-[12.5px] text-pqMuted">
              {t(
                'cancel_notice_body',
                'You will never be charged again. Everything keeps working until then.'
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={moveToCheckout('FREE', true)}
            className="h-[36px] whitespace-nowrap rounded-[10px] bg-pqBrand px-[16px] text-[13px] font-[600] text-pqOnBrand shadow-[0_4px_14px_-6px_color-mix(in_srgb,var(--brand)_70%,transparent)] transition-all hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
          >
            {t('reactivate_subscription', 'Reactivate subscription')}
          </button>
        </div>
      )}

      {/* The plan-meta line and the period control, on a hairline of their own.
          A paid founding member has no period to pick and no meta beyond the
          hero below, so the whole row goes — exactly the prototype's zeroing of
          it. */}
      {!lifetimePaid && (
        <div className="mt-[12px] flex w-full items-center justify-between gap-[12px] border-t border-pqLine pt-[22px]">
          <div className="min-w-0 flex-1">
            <div data-plan-meta="1" className="text-[13px] text-pqMuted">
              {planMeta}
            </div>
          </div>
          <BillingPeriodToggle
            period={monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY'}
            monthsFreeN={monthsFree(subscription?.subscriptionTier || 'PRO')}
            onChange={(next) =>
              setMonthlyOrYearly(next === 'YEARLY' ? 'on' : 'off')
            }
          />
        </div>
      )}

      {!lifetimePaid && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-[13px]">
          {Object.entries(pricing)
            .filter((f) => (!isGeneral || f[0] !== 'FREE') && !f[1].retired)
            .map(([name, values]) => {
              const on = currentPackage === name.toUpperCase();
              // A founding member inside the trial: their tier's card wears the
              // LIFETIME dress regardless of the period toggle, the way the
              // prototype's `ltOn` ignores the period mismatch.
              const ltOn =
                !!user?.isLifetime &&
                subscription?.subscriptionTier === name.toUpperCase();
              const isAgency = name.toUpperCase() === 'AGENCY';
              return (
                <div
                  key={name}
                  data-plan-card={name}
                  className={clsx(
                    'relative flex flex-col gap-[15px] rounded-[16px] p-[20px] outline -outline-offset-1',
                    ltOn
                      ? 'bg-pqLtCardOn'
                      : isAgency
                      ? 'bg-[linear-gradient(150deg,color-mix(in_srgb,var(--brand)_16%,transparent),color-mix(in_srgb,var(--pink)_7%,transparent)_45%,var(--inner)_78%)]'
                      : 'bg-pqInner',
                    ltOn
                      ? 'outline-[1.5px] outline-pqLtLine2'
                      : on
                      ? 'outline-[1.5px] outline-pqBrand'
                      : isAgency
                      ? 'outline-1 outline-[color:color-mix(in_srgb,var(--brand)_40%,transparent)]'
                      : 'outline-1 outline-pqBorder'
                  )}
                >
                  {name.toUpperCase() === 'PRO' && !ltOn && (
                    <span className="absolute -top-[9px] end-[22px] flex h-[20px] items-center rounded-full bg-pqBrand px-[9px] text-[10px] font-[700] uppercase tracking-[0.05em] text-pqOnBrand">
                      {t('most_popular', 'Most popular')}
                    </span>
                  )}
                  {ltOn && (
                    <span className="absolute -top-[9px] end-[22px] flex h-[20px] items-center rounded-full bg-pqLtSolid px-[9px] text-[10px] font-[800] uppercase tracking-[0.05em] text-pqLtSolidFg">
                      {t('lifetime_badge', 'Lifetime')}
                    </span>
                  )}
                  <div className="flex flex-col gap-[6px]">
                    <div
                      className={clsx(
                        'text-[14px] font-[600] tracking-[0.02em]',
                        // Owner override (light contrast): non-current plan
                        // titles use --text, not --soft.
                        ltOn ? 'text-pqLtAmber' : 'text-pqText'
                      )}
                    >
                      {tierLabel(name)}
                    </div>
                    <div className="flex items-baseline gap-[5px]">
                      <span className="font-display text-[29px] font-[600] -tracking-[0.02em] text-pqText">
                        $
                        {ltOn
                          ? LIFETIME_PRICE
                          : monthlyOrYearly === 'on'
                          ? values.year_price
                          : values.month_price}
                      </span>
                      <span className="text-[13px] text-pqMuted">
                        {ltOn
                          ? t('lt_once', 'once')
                          : values.month_price === 0
                          ? ''
                          : monthlyOrYearly === 'on'
                          ? t('per_year', '/year')
                          : t('per_month', '/month')}
                      </span>
                    </div>
                    {monthlyOrYearly === 'on' &&
                      values.month_price > 0 &&
                      !ltOn && (
                        <div className="text-[12.5px] text-pqSoft">
                          {t(
                            'plan_save_line',
                            '${{monthly}}/mo · save ${{save}} a year',
                            {
                              monthly: effectiveMonthly(name),
                              save:
                                values.month_price * 12 - values.year_price,
                            }
                          )}
                        </div>
                      )}
                    {/* The design's prorate slot, above the CTA. A lifetime
                        card states the one renewal fact this client does know;
                        the current plan's renewal date lives in Stripe, so its
                        slot stays an empty spacer rather than a guess. */}
                    {ltOn ? (
                      <div className="min-h-[17px] text-[12.5px] font-[600] text-pqLtAmber">
                        {t('never_renews', 'Never renews')}
                      </div>
                    ) : subscription &&
                      currentPackage !== name.toUpperCase() &&
                      name !== 'FREE' &&
                      !!name ? (
                      <Prorate
                        period={monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY'}
                        pack={name.toUpperCase() as PaidTier}
                      />
                    ) : (
                      <div className="min-h-[17px]" />
                    )}
                  </div>
                  {ltOn ? (
                    <Button
                      disabled={true}
                      className="!h-[40px] w-full !rounded-[10px] !bg-transparent !text-[13.5px] !font-[600] !text-pqLtAmber shadow-[inset_0_0_0_1px_var(--ltLine2)] !opacity-100"
                    >
                      {t('current_plan_lifetime', 'Current plan · lifetime')}
                    </Button>
                  ) : currentPackage === name.toUpperCase() &&
                    subscription?.cancelAt ? (
                    <Button
                      onClick={moveToCheckout('FREE', true)}
                      loading={loading}
                      className="!h-[40px] w-full !rounded-[10px] !text-[13.5px] !font-[600]"
                    >
                      {t('reactivate_subscription', 'Reactivate subscription')}
                    </Button>
                  ) : (
                    <Button
                      loading={loading}
                      disabled={
                        (!!subscription?.cancelAt &&
                          name.toUpperCase() === 'FREE') ||
                        currentPackage === name.toUpperCase()
                      }
                      className={clsx(
                        '!h-[40px] w-full !rounded-[10px] !text-[13.5px] !font-[600]',
                        currentPackage === name.toUpperCase() &&
                          '!bg-transparent !text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] !opacity-100',
                        subscription &&
                          currentPackage !== name.toUpperCase() &&
                          name.toUpperCase() === 'FREE' &&
                          '!bg-transparent !text-pqWarn shadow-[inset_0_0_0_1px_var(--border)]'
                      )}
                      onClick={moveToCheckout(name.toUpperCase() as PaidTier)}
                    >
                      {planCardCta(name)}
                    </Button>
                  )}
                  <div className="h-[1px] bg-pqLine" />
                  <Features pack={name.toUpperCase() as AnyTier} />
                </div>
              );
            })}
        </div>
      )}

      {/* The lifetime surface, in place of the plan grid, once the founding
          membership is paid for. The hero and the package cards are the same
          components /billing/lifetime renders; MEMBER SINCE can only be named
          here, where the subscription row's createdAt is in state. */}
      {lifetimePaid && (
        <div className="flex flex-col gap-[20px]">
          <FoundingMember
            tier={user?.tier?.current || 'PRO'}
            trialing={false}
            memberSince={subscription?.createdAt}
          />
          <LifetimePackages />
        </div>
      )}
      {/* The design's portal/cancel card: the portal keeps its handler, and the
          cancel action becomes the ghost the design draws — same
          `moveToCheckout('FREE')` flow behind it, dialogs and all. */}
      {!!subscription?.id && (
        <div className="flex flex-wrap items-center gap-[12px] rounded-[14px] bg-pqInner p-[16px_18px] outline outline-1 -outline-offset-1 outline-pqBorder">
          <div className="min-w-[200px] flex-1">
            <div className="text-[14px] font-[600] text-pqText">
              {t('portal_row_title', 'Payment method & invoices')}
            </div>
            <div className="mt-[2px] text-[12.5px] text-pqMuted">
              {user?.isLifetime
                ? t(
                    'portal_row_sub_lifetime',
                    'Download the receipt for your founding-member payment.'
                  )
                : t(
                    'portal_row_sub',
                    'Update your card or download past invoices.'
                  )}
            </div>
          </div>
          <button
            type="button"
            onClick={updatePayment}
            className="h-[38px] rounded-[10px] bg-pqSettings px-[15px] text-[13px] font-[600] text-pqText transition-shadow hover:shadow-[inset_0_0_0_999px_var(--hover)]"
          >
            {t('open_billing_portal', 'Open billing portal')}
          </button>
          {isGeneral && !subscription?.cancelAt && !lifetimePaid && (
            <button
              type="button"
              disabled={loading}
              onClick={moveToCheckout('FREE')}
              className="h-[38px] rounded-[10px] bg-transparent px-[15px] text-[13px] font-[500] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqWarn disabled:pointer-events-none disabled:opacity-60"
            >
              {user?.isLifetime
                ? t('cancel_trial', 'Cancel trial')
                : t('cancel_subscription_1', 'Cancel subscription')}
            </button>
          )}
        </div>
      )}
      <FAQComponent />
    </div>
  );
};
