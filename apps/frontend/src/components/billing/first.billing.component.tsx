'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import dynamic from 'next/dynamic';
import { PostQueenLogo } from '@gitroom/frontend/components/ui/logo.component';
import {
  effectiveMonthly,
  LIFETIME_PRICE,
  lifetimeWindow,
  monthsFree,
  nextLifetimeTier,
  pricing,
  TRIAL_DAYS,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { capitalize } from 'lodash';
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

/** The design's 18px green circle-check, used by the hero's trust row. */
const TrustCheck = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
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

/**
 * The founding-member card in the checkout's right column, with the
 * "OR SUBSCRIBE" divider under it — they exist together or not at all.
 *
 * The countdown is the same clock /billing/lifetime draws: `lifetimeWindow()`
 * from pricing.ts, derived from `User.createdAt` and enforced by the purchase
 * route, so the card cannot advertise an offer the server would refuse. The
 * ticking lives in this component so the once-a-second re-render never touches
 * the Stripe form.
 *
 * Two deliberate deviations from the prototype, both because the repo is
 * authoritative on behaviour:
 * - The prototype makes this card a fourth selectable plan that checks out
 *   through the same pay bar. The repo's lifetime purchase is its own Stripe
 *   session behind /billing/lifetime, so the card navigates there instead of
 *   inventing a second checkout path.
 * - The prototype promises "Everything in Pro" and a "7-day free trial first".
 *   The repo's ladder sells the *next* tier up (FREE buys CREATOR), and the
 *   lifetime session is `mode: 'payment'` — money moves immediately, no trial.
 *   The card names the real tier and the real terms.
 */
const LifetimeOfferCard: FC = () => {
  const t = useT();
  const user = useUser();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const window_ = useMemo(
    () => lifetimeWindow(user?.createdAt),
    [user?.createdAt, now]
  );

  if (!window_.open) return null;

  const target = nextLifetimeTier(user?.tier?.current);
  const targetPlan = pricing[target];
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
        onClick={() => router.push('/billing/lifetime')}
        className="flex cursor-pointer select-none flex-col gap-[16px] rounded-[22px] bg-pqLtCardOff p-[20px_24px] shadow-pq ring-1 ring-inset ring-pqBorder"
      >
        <div className="flex flex-wrap items-center gap-[11px]">
          {/* The prototype's radio dot. It never fills here: picking lifetime
              happens on /billing/lifetime, not in this pay flow. */}
          <span className="size-[20px] shrink-0 rounded-full ring-[1.5px] ring-inset ring-pqBorder" />
          <span className="grid h-[21px] place-items-center rounded-full bg-pqLtSolid px-[10px] text-[10px] font-[800] uppercase tracking-[0.05em] text-pqLtSolidFg">
            {t('billing_become_founding_member', 'Become a founding member')}
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
                'billing_lifetime_everything_in',
                'Everything in {{tier}} — yours forever.',
                { tier: capitalize(target) }
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-[7px]">
            <span className="text-[14px] text-pqLtDimmer line-through">
              ${targetPlan.year_price}
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
        <BillingFeatures tier={target} tone="lifetime" />
        <div className="flex flex-wrap items-center gap-[12px] border-t border-pqLtLine pt-[15px]">
          {user?.allowTrial ? (
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
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-pqLtAmber"
              >
                <path
                  d="M12 8v4.5M12 16.2h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[12.5px] font-[700] uppercase tracking-[0.02em] text-pqLtAmber">
                {t('billing_last_chance', 'Last chance')}
              </span>
            </span>
          )}
          <span className="flex-1" />
          {/* The prototype says "7-day free trial first" here. The repo's
              lifetime session takes the payment immediately, so this line
              states the real terms instead. */}
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

export const FirstBillingComponent = () => {
  const { stripeClient, onboardingVideoUrl } = useVariables();
  const user = useUser();
  const dub = useDubClickId();
  const router = useRouter();
  const [stripe, setStripe] = useState<null | Promise<Stripe>>(null);
  // The entry tier. STANDARD is retired and no longer listed, so defaulting to
  // it would open the paywall with nothing selected.
  const [tier, setTier] = useState('CREATOR');
  const [period, setPeriod] = useState('MONTHLY');
  const fetch = useFetch();
  const modals = useModals();
  const t = useT();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id', '');
  const [datafast_session_id] = useCookie('datafast_session_id', '');

  useEffect(() => {
    setStripe(loadStripe(stripeClient));
  }, []);

  // Preselect whatever the visitor picked on the marketing site. UtmSaver
  // stashed it before registration redirected them here; read it after mount so
  // the server render stays deterministic.
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
    }

    const selectedPeriod = localStorage.getItem('selectedPeriod');
    if (selectedPeriod === 'MONTHLY' || selectedPeriod === 'YEARLY') {
      setPeriod(selectedPeriod);
    }
  }, []);

  const loadCheckout = useCallback(async () => {
    return (
      await fetch('/billing/embedded', {
        method: 'POST',
        body: JSON.stringify({
          billing: tier,
          period: period,
          ...(datafast_visitor_id && datafast_session_id
            ? { datafast_visitor_id, datafast_session_id }
            : {}),
          ...(dub ? { dub } : {}),
        }),
      })
    ).json();
  }, [tier, period]);

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

  const { data, isLoading } = useSWR(
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

  // Whether the founding-member offer is still open, read once per render.
  // The card itself ticks every second and hides the moment the window
  // closes; the divider and upsell that accompany it read this snapshot, so
  // they leave on the next render rather than dragging a 1s interval through
  // the whole checkout (and the Stripe form with it).
  const lifetimeOpen = useMemo(
    () => lifetimeWindow(user?.createdAt).open,
    [user?.createdAt]
  );

  const JoinOver = () => {
    return (
      <div className="flex flex-col gap-[18px]">
        <h1 className="font-display text-[54px] font-[800] leading-[1.06] tracking-[-0.035em] tablet:text-[42px] mobile:!text-[34px] whitespace-pre-line text-balance">
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
            <>
              {t('billing_pick_up_where', 'Pick up where you')}{' '}
              <span className="text-pqBrand">
                {t('billing_left_off_highlight', 'left off')}
              </span>{' '}
              {t('billing_with_postqueen_again', 'with PostQueen')}
            </>
          )}
        </h1>

        <p className="max-w-[50ch] text-[17px] leading-[1.5] text-pqMuted">
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
          <div className="mt-[2px] flex flex-nowrap mobile:flex-col gap-x-[22px] gap-y-[10px] text-[14.5px] font-[500]">
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
          <div className="mt-[6px] flex items-center gap-[11px] rounded-[14px] bg-pqAmberSoft p-[13px_16px] text-[14.5px] text-pqText ring-1 ring-inset ring-pqAmberLine">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
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
            {/* The design writes "Your subscription ended on {date}". No date
                is written for that: the subscription row is hard-deleted in
                this state, so nothing on the client knows when — hence the
                dateless sentence rather than an invented day. */}
            <span className="flex-1 font-[600]">
              {t('billing_subscription_ended', 'Your subscription ended.')}
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
      className="blurMe flex flex-1 flex-col bg-pqBg pb-[132px] mobile:pb-[190px]"
    >
      <div className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center gap-[14px] border-b border-pqLine bg-pqInner px-[40px] tablet:px-[32px] mobile:!px-[16px]">
        {/* 34px tile + 19px wordmark, the checkout header's own scale. The
            design also shows a `v3.1.7` chip here; the repo surfaces no real
            application version, and a made-up one is worse than none. */}
        <PostQueenLogo
          wordmark
          tileClassName="size-[34px]"
          glyphClassName="size-[19px]"
          wordClassName="text-[19px]"
        />
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
          {/* The design's checkout header carries Help. It is the same menu
              the app uses, not a second one — documentation, support and bug
              report are the same three places from here. */}
          <HelpMenu />
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
          {/* Not in the design's header — the repo's Sentry feedback entry,
              kept as a quiet icon button in the design's idiom. */}
          <div className="grid h-[36px] w-[36px] place-items-center rounded-[10px] transition-colors empty:hidden hover:bg-pqHover hover:text-pqText">
            <AttachToFeedbackIcon />
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
      <div className="flex flex-1 flex-row items-start gap-[56px] px-[40px] pb-[40px] pt-[56px] tablet:flex-col-reverse tablet:items-stretch tablet:px-[32px] tablet:pt-[40px] mobile:!px-[16px] mobile:!pt-[24px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[40px]">
          <JoinOver />
          {data?.blocked ? (
            <div className="rounded-[20px] p-[24px] text-[16px] font-[500] ring-[1.5px] ring-inset ring-pqBorder">
              {t(
                'billing_other_account_subscribed',
                'Another account with this email already has an active subscription. Please log off and sign in to that account to manage your subscription.'
              )}
            </div>
          ) : !isLoading && data && stripe ? (
            <EmbeddedBilling
              stripe={stripe}
              secret={data.client_secret}
              showCoupon={period === 'MONTHLY'}
              autoApplyCoupon={data.auto_apply_coupon}
            />
          ) : (
            <LoadingComponent />
          )}
          {/* The design keeps the FAQ in the left column, under the payment
              card, on every breakpoint. */}
          <FAQComponent scale="checkout" />
        </div>
        <div className="flex w-[520px] shrink-0 flex-col gap-[20px] tablet:w-full">
          <LifetimeOfferCard />
          <div className="flex flex-col rounded-[22px] bg-pqInner shadow-pqE1 ring-1 ring-inset ring-pqLine">
            <div className="flex flex-col gap-[18px] p-[24px_26px_22px]">
              <div className="flex flex-wrap items-center gap-[14px]">
                <div className="min-w-[120px] flex-1 font-display text-[19px] font-[600] tracking-[-0.02em]">
                  {t('billing_choose_plan', 'Choose a plan')}
                </div>
                <div className="flex shrink-0 select-none items-center gap-[4px] rounded-full bg-pqSettings p-[4px]">
                  <div
                    className={clsx(
                      'flex h-[32px] cursor-pointer items-center justify-center rounded-full px-[16px] text-[13px] font-[600]',
                      period === 'MONTHLY'
                        ? 'bg-pqInner text-pqText'
                        : 'text-pqMuted'
                    )}
                    onClick={() => setPeriod('MONTHLY')}
                  >
                    {t('billing_monthly', 'Monthly')}
                  </div>
                  <div
                    className={clsx(
                      'flex h-[32px] cursor-pointer items-center justify-center gap-[8px] rounded-full pe-[10px] ps-[16px] text-[13px] font-[600]',
                      period === 'YEARLY'
                        ? 'bg-pqInner text-pqText'
                        : 'text-pqMuted'
                    )}
                    onClick={() => setPeriod('YEARLY')}
                  >
                    <div>{t('billing_yearly', 'Yearly')}</div>
                    {/* Was a hardcoded "20% Off", true of the old prices and an
                        understatement of every current one. Derived, and exact:
                        the design's pill quotes the figure for the plan that is
                        actually selected. */}
                    <div className="flex h-[21px] items-center whitespace-nowrap rounded-full bg-pqOkSoft px-[8px] text-[11px] font-[700] text-pqOk">
                      {t('billing_months_free', '{{n}} months free', {
                        n: monthsFree(tier),
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-[11px]">
                {price.map(([key, value]) => {
                  const selected = key === tier;
                  return (
                    <div
                      onClick={() => setTier(key)}
                      key={key}
                      className={clsx(
                        'relative flex cursor-pointer select-none flex-col gap-[7px] rounded-[14px] p-[14px_16px]',
                        selected
                          ? 'bg-pqBrandSoft ring-[1.5px] ring-inset ring-pqBrand'
                          : 'ring-1 ring-inset ring-pqBorder'
                      )}
                    >
                      <div className="flex items-center gap-[9px]">
                        <span
                          className={clsx(
                            'grid size-[18px] shrink-0 place-items-center rounded-full',
                            selected
                              ? 'bg-pqBrand'
                              : 'ring-[1.5px] ring-inset ring-pqBorder'
                          )}
                        >
                          {selected && (
                            <svg
                              viewBox="0 0 24 24"
                              width="11"
                              height="11"
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
                        <span
                          className={clsx(
                            'flex-1 text-[14.5px] font-[600]',
                            selected ? 'text-pqText' : 'text-pqMuted'
                          )}
                        >
                          {capitalize(key)}
                        </span>
                        {/* The design puts this on one plan and names it there:
                            `badgeDisplay: key === 'PRO' ? 'flex' : 'none'`. It
                            is the only steer the checkout gives, so it is not
                            decoration. */}
                        {key === 'PRO' && (
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
                      <div className="flex items-baseline gap-[4px] ps-[27px]">
                        <span className="font-display text-[24px] font-[600] tracking-[-0.025em] text-pqText">
                          $
                          {period === 'MONTHLY'
                            ? value.month_price
                            : effectiveMonthly(key)}
                        </span>
                        <span className="text-[12.5px] text-pqMuted">
                          {t('billing_per_month_short', '/mo')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* The design shows this only under PRO — the plan the lifetime
                  deal replaces — and only while the founding-member window is
                  open. The tier named is the one the ladder actually grants. */}
              {tier === 'PRO' && lifetimeOpen && (
                <button
                  type="button"
                  data-lifetime-upsell="1"
                  onClick={() => router.push('/billing/lifetime')}
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
                      { tier: capitalize(nextLifetimeTier(user?.tier?.current)) }
                    )}
                  </span>
                  <span className="shrink-0 text-[13px] font-[700] text-pqLtAmber">
                    {t('billing_switch', 'Switch')}
                  </span>
                </button>
              )}
              {/* The design computes this line but never renders it — its slot
                  is taken by the lifetime upsell. It stays (the exact figure
                  for the selected plan is worth a strip, not only a badge) and
                  fills that same slot once the lifetime offer has closed. */}
              {period === 'MONTHLY' && !lifetimeOpen && (
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
                  plan: capitalize(tier),
                })}
              </div>
              <BillingFeatures tier={tier} />
            </div>
          </div>
          {/* Where the order summary lands. It has to render inside the Stripe
              CheckoutProvider (it reads checkout state), which lives in the
              left column's form — so embedded.billing portals it here, the
              same slot idiom as new-layout/header-slot.tsx. */}
          <div id="pq-order-summary" className="flex flex-col empty:hidden" />
        </div>
      </div>
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
    <div className="grid grid-cols-2 mobile:grid-cols-1 gap-y-[10px] gap-x-[14px]">
      {features.map((feature) => {
        // The one row the design lets glow — carrying `pq-loop` so
        // prefers-reduced-motion can switch the loop off (see global.scss).
        const unlimited = feature.key === 'plan_unlimited_channels';
        return (
          <div
            key={feature.key}
            className={clsx(
              'flex items-center gap-[9px] font-[600]',
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
