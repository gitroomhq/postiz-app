'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  LIFETIME_PRICE,
  lifetimeWindow,
  monthsFree,
  nextLifetimeTier,
  PaidTier,
  pricing,
  TRIAL_DAYS,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useSWRConfig } from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useSearchParams } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Textarea } from '@gitroom/react/form/textarea';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FinishTrial } from '@gitroom/frontend/components/billing/finish.trial';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import {
  FeatureRow,
  FoundingMember,
  LifetimePackages,
} from '@gitroom/frontend/components/billing/lifetime.deal';

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

const Accept: FC<{ resolve: (res: boolean) => void }> = ({ resolve }) => {
  const [loading, setLoading] = useState(false);
  const fetch = useFetch();
  const toaster = useToaster();

  const apply = useCallback(async () => {
    setLoading(true);
    await fetch('/billing/apply-discount', {
      method: 'POST',
    });

    resolve(true);
    toaster.show('50% discount applied successfully');
  }, []);

  return (
    <div>
      <div className="mb-[20px]">
        Would you accept 50% discount for 3 months instead? 🙏🏻
      </div>
      <div className="flex gap-[10px]">
        <Button loading={loading} onClick={apply}>
          Apply 50% discount for 3 months
        </Button>
        <Button onClick={() => resolve(false)} variant="danger">
          Cancel my subscription
        </Button>
      </div>
    </div>
  );
};
const Info: FC<{
  proceed: (feedback: string) => void;
}> = (props) => {
  const [feedback, setFeedback] = useState('');
  const modal = useModals();
  const events = useFireEvents();
  const cancel = useCallback(() => {
    props.proceed(feedback);
    events('cancel_subscription');
    modal.closeAll();
  }, [modal, feedback]);

  const t = useT();

  return (
    <div className="relative flex gap-[20px] flex-col flex-1">
      <div>
        {t(
          'would_you_mind_shortly_tell_us_what_we_could_have_done_better',
          'Would you mind shortly tell us what we could have done better?'
        )}
      </div>
      <div>
        <Textarea
          className="bg-pqInner"
          label={'Feedback'}
          name="feedback"
          disableForm={true}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </div>
      <div>
        <Button disabled={feedback.length < 20} onClick={cancel}>
          {feedback.length < 20
            ? t('please_add_at_least', 'Please add at least 20 chars')
            : t('cancel_subscription', 'Cancel Subscription')}
        </Button>
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
  const lifetimePaid = !!user?.isLifetime && !user?.isTrailing;
  // The founding-member offer window — the same shared helper the checkout
  // route enforces, so the upsell never advertises a deal the backend refuses.
  const ltWindow = useMemo(
    () => lifetimeWindow(user?.createdAt),
    [user?.createdAt]
  );
  // What the founding-member purchase would actually grant this account. The
  // ladder is shared with the redemption and checkout endpoints; the design's
  // strip hardcodes PRO, but naming the granted tier keeps the promise honest.
  const ltUpsellTier = useMemo(
    () => nextLifetimeTier(subscription?.subscriptionTier),
    [subscription]
  );
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
    if (subscription.cancelAt) {
      return t(
        'plan_meta_access_until',
        'PostQueen {{tier}} · access until {{date}}',
        {
          tier,
          date: newDayjs(subscription.cancelAt).local().format('D MMM, YYYY'),
        }
      );
    }
    if (user?.isLifetime && user?.isTrailing) {
      return t(
        'plan_meta_founding_trial',
        'PostQueen {{tier}} · founding-member trial',
        { tier }
      );
    }
    if (user?.isTrailing) {
      return t('plan_meta_trial', 'PostQueen {{tier}} · free trial', { tier });
    }
    return t('plan_meta_current', 'PostQueen {{tier}}', { tier });
  }, [subscription, user, t]);
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
          if (
            subscription?.cancelAt ||
            (await deleteDialog(
              `Are you sure you want to cancel your subscription?
              ${messages.join(', ')}`,
              'Yes, cancel',
              'Cancel Subscription'
            ))
          ) {
            const checkDiscount = await (
              await fetch('/billing/check-discount')
            ).json();
            if (checkDiscount.offerCoupon) {
              const info = await new Promise((res) => {
                modal.openModal({
                  title: 'Before you cancel',
                  withCloseButton: true,
                  classNames: {
                    modal: 'bg-transparent text-pqText',
                  },
                  children: <Accept resolve={res} />,
                });
              });

              modal.closeAll();

              if (info) {
                return;
              }
            }

            const info = await new Promise((res) => {
              modal.openModal({
                title: t(
                  'we_are_sorry_to_see_you_go',
                  'We are sorry to see you go :('
                ),
                withCloseButton: true,
                classNames: {
                  modal: 'bg-transparent text-pqText',
                },
                children: <Info proceed={(e) => res(e)} />,
              });
            });

            setLoading(true);
            const { cancel_at } = await (
              await fetch('/billing/cancel', {
                method: 'POST',
                body: JSON.stringify({
                  feedback: info,
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
          }
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
    [monthlyOrYearly, subscription, user, utm]
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

      {finishTrial && <FinishTrial close={() => setFinishTrial(false)} />}

      {/* The founding-member upsell, for trial users only — and only while the
          24-hour window the checkout route enforces is still open, so the strip
          never sells a deal the backend would refuse with a 410. Price and tier
          come from pricing.ts, the same constants the charge reads. */}
      {!user?.isLifetime && user?.isTrailing && ltWindow.open && (
        <div
          data-lifetime-upsell="1"
          className="flex flex-wrap items-center gap-[18px] rounded-[16px] bg-gradient-to-r from-pqLtSoft to-transparent p-[16px_18px] outline outline-1 -outline-offset-1 outline-pqLtOutline"
        >
          <span className="grid size-[38px] shrink-0 place-items-center rounded-[12px] bg-pqLtChipBg text-pqLtAmber">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
              <path d="M3 8.5 7.2 12 12 4.5 16.8 12 21 8.5l-1.7 9.7a1 1 0 0 1-1 .8H5.7a1 1 0 0 1-1-.8L3 8.5Z" />
            </svg>
          </span>
          <div className="min-w-[260px] flex-1">
            <div className="flex flex-wrap items-center gap-[9px]">
              <span className="text-[15.5px] font-[600] -tracking-[0.01em] text-pqText">
                {t('lt_upsell_title', 'Lifetime access & updates')}
              </span>
              <span className="grid h-[19px] place-items-center rounded-full bg-pqLtSolid px-[8px] text-[9px] font-[800] uppercase tracking-[0.05em] text-pqLtSolidFg">
                {t('lt_upsell_badge', 'Become a founding member')}
              </span>
            </div>
            <div className="mt-[4px] text-[12.5px] text-pqMuted">
              {t(
                'lt_upsell_sub',
                'Everything in {{tier}} · no renewal, ever · all future updates',
                { tier: ltUpsellTier }
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-[6px]">
            <span className="text-[13px] text-pqSoft line-through">
              {t('lt_upsell_compare', '${{price}}/yr', {
                price: pricing[ltUpsellTier].year_price,
              })}
            </span>
            <span className="font-display text-[26px] font-[700] leading-none -tracking-[0.02em] text-pqLtAmber">
              ${LIFETIME_PRICE}
            </span>
            <span className="text-[12px] text-pqSoft">
              {t('lt_once', 'once')}
            </span>
          </div>
          <Link
            href="/billing/lifetime"
            className="grid h-[38px] shrink-0 place-items-center whitespace-nowrap rounded-[10px] bg-pqLtSolid px-[17px] text-[13px] font-[700] text-pqLtSolidFg transition-all hover:brightness-105"
          >
            {t('lt_upsell_cta', 'Switch to lifetime')}
          </Link>
        </div>
      )}

      {/* A renewal Stripe could not charge. Stripe retries on its own schedule,
          so this says what is true — nothing is cancelled — rather than
          threatening. The design puts `payFailShow` in this position, above the
          trial banner and below the lifetime upsell. */}
      {!!paymentFailed && !subscription?.cancelAt && (
        <div
          data-payment-failed="1"
          className="flex flex-wrap items-center gap-[14px] rounded-[16px] bg-gradient-to-r from-pqWarnSoft to-transparent p-[14px_16px] outline outline-1 -outline-offset-1 outline-pqWarnLine"
        >
          <div className="grid size-[38px] shrink-0 place-items-center rounded-[12px] bg-pqWarnSoft text-pqWarn">
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
              {t(
                'payment_failed_body',
                'Update your payment method and we will try again. Nothing is cancelled yet.'
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={updatePayment}
            className="h-[36px] whitespace-nowrap rounded-[10px] bg-pqWarn px-[16px] text-[13px] font-[600] text-white transition-all hover:brightness-105"
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
        !paymentFailed && (
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
        <div className="mt-[12px] flex flex-wrap items-center gap-[12px] border-t border-pqLine pt-[22px]">
          <div className="min-w-[240px] flex-1">
            <div data-plan-meta="1" className="text-[13px] text-pqMuted">
              {planMeta}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-[4px] rounded-full bg-pqSettings p-[4px]">
            <button
              type="button"
              onClick={() => setMonthlyOrYearly('off')}
              className={clsx(
                'h-[34px] rounded-full px-[18px] text-[13px] font-[600] transition-colors',
                monthlyOrYearly === 'off'
                  ? 'bg-pqInner text-pqText shadow-pqE2'
                  : 'bg-transparent text-pqMuted'
              )}
            >
              {t('billing_monthly', 'Monthly')}
            </button>
            <button
              type="button"
              onClick={() => setMonthlyOrYearly('on')}
              className={clsx(
                'flex h-[34px] items-center gap-[8px] rounded-full ps-[18px] pe-[12px] text-[13px] font-[600] transition-colors',
                monthlyOrYearly === 'on'
                  ? 'bg-pqInner text-pqText shadow-pqE2'
                  : 'bg-transparent text-pqMuted'
              )}
            >
              {t('billing_yearly', 'Yearly')}
              <span className="grid h-[22px] place-items-center rounded-full bg-pqOkSoft px-[9px] text-[11px] font-[700] tracking-[0.01em] text-pqOk">
                {t('billing_months_free', '{{n}} months free', {
                  n: monthsFree(subscription?.subscriptionTier || 'PRO'),
                })}
              </span>
            </button>
          </div>
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
                        ltOn
                          ? 'text-pqLtAmber'
                          : on
                          ? 'text-pqText'
                          : 'text-pqSoft'
                      )}
                    >
                      {name}
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
                      {currentPackage === name.toUpperCase()
                        ? t('current_plan', 'Current Plan')
                        : name.toUpperCase() === 'FREE'
                        ? subscription?.cancelAt
                          ? t('downgrade_on', 'Downgrade on {{date}}', {
                              date: dayjs
                                .utc(subscription?.cancelAt)
                                .local()
                                .format('D MMM, YYYY'),
                            })
                          : t('cancel_subscription_1', 'Cancel subscription')
                        : // @ts-ignore
                        (user?.tier === 'FREE' ||
                            user?.tier?.current === 'FREE') &&
                          user.allowTrial
                        ? t(
                            'start_7_days_free_trial',
                            'Start 7 days free trial'
                          )
                        : t('purchase', 'Purchase')}
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
