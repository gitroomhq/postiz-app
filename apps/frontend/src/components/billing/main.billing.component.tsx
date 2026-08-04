'use client';

import { Slider } from '@gitroom/react/form/slider';
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
  PaidTier,
  pricing,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useSWRConfig } from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';

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
      <div className="pt-[12px]">
        <ReactLoading type="spin" color="#fff" width={20} height={20} />
      </div>
    );
  }
  if (price === false) {
    return null;
  }
  return (
    <div className="text-[12px] flex pt-[12px]">
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
    const list: string[] = [];

    // The same "a very large number means unlimited" reading the posts line has
    // always used. AGENCY's channel count joined it when unlimited was decided,
    // so neither needs a tier named here.
    list.push(
      channelsOr > 10000
        ? t('plan_unlimited_channels', 'Unlimited channels')
        : channelsOr === 1
        ? t('plan_one_channel', '1 channel')
        : t('plan_n_channels', '{{count}} channels', { count: channelsOr })
    );
    list.push(
      currentPricing.posts_per_month > 10000
        ? t('plan_unlimited_posts', 'Unlimited posts per month')
        : t('plan_n_posts', '{{count}} posts per month', {
            count: currentPricing.posts_per_month,
          })
    );
    if (currentPricing.team_members) {
      list.push(t('plan_unlimited_team', 'Unlimited team members'));
    }
    if (currentPricing?.ai) {
      // `AI Autocomplete` used to be pushed here too, one line below
      // `AI auto-complete` — the same feature spelled twice, and every card
      // listed it twice.
      list.push(t('plan_ai_autocomplete', 'AI auto-complete'));
      list.push(t('plan_ai_copilots', 'AI copilots'));
    }
    list.push(t('plan_picture_editor', 'Advanced Picture Editor'));
    if (currentPricing?.image_generator) {
      list.push(
        t('plan_n_ai_images', '{{count}} AI Images per month', {
          count: currentPricing?.image_generation_count,
        })
      );
    }
    if (currentPricing?.generate_videos) {
      list.push(
        t('plan_n_ai_videos', '{{count}} AI Videos per month', {
          count: currentPricing?.generate_videos,
        })
      );
    }
    return list;
  }, [pack, t]);
  return (
    <div className="flex flex-col gap-[10px] justify-center text-[16px] text-pqMuted">
      {features.map((feature) => (
        <div key={feature} data-plan-feature="1" className="flex gap-[20px]">
          <div className="text-pqOk">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M16.2806 9.21937C16.3504 9.28903 16.4057 9.37175 16.4434 9.46279C16.4812 9.55384 16.5006 9.65144 16.5006 9.75C16.5006 9.84856 16.4812 9.94616 16.4434 10.0372C16.4057 10.1283 16.3504 10.211 16.2806 10.2806L11.0306 15.5306C10.961 15.6004 10.8783 15.6557 10.7872 15.6934C10.6962 15.7312 10.5986 15.7506 10.5 15.7506C10.4014 15.7506 10.3038 15.7312 10.2128 15.6934C10.1218 15.6557 10.039 15.6004 9.96938 15.5306L7.71938 13.2806C7.57865 13.1399 7.49959 12.949 7.49959 12.75C7.49959 12.551 7.57865 12.3601 7.71938 12.2194C7.86011 12.0786 8.05098 11.9996 8.25 11.9996C8.44903 11.9996 8.6399 12.0786 8.78063 12.2194L10.5 13.9397L15.2194 9.21937C15.289 9.14964 15.3718 9.09432 15.4628 9.05658C15.5538 9.01884 15.6514 8.99941 15.75 8.99941C15.8486 8.99941 15.9462 9.01884 16.0372 9.05658C16.1283 9.09432 16.211 9.14964 16.2806 9.21937ZM21.75 12C21.75 13.9284 21.1782 15.8134 20.1068 17.4168C19.0355 19.0202 17.5127 20.2699 15.7312 21.0078C13.9496 21.7458 11.9892 21.9389 10.0979 21.5627C8.20656 21.1865 6.46928 20.2579 5.10571 18.8943C3.74215 17.5307 2.81355 15.7934 2.43735 13.9021C2.06114 12.0108 2.25422 10.0504 2.99218 8.26884C3.73013 6.48726 4.97982 4.96451 6.58319 3.89317C8.18657 2.82183 10.0716 2.25 12 2.25C14.585 2.25273 17.0634 3.28084 18.8913 5.10872C20.7192 6.93661 21.7473 9.41498 21.75 12ZM20.25 12C20.25 10.3683 19.7661 8.77325 18.8596 7.41655C17.9531 6.05984 16.6646 5.00242 15.1571 4.37799C13.6497 3.75357 11.9909 3.59019 10.3905 3.90852C8.79017 4.22685 7.32016 5.01259 6.16637 6.16637C5.01259 7.32015 4.22685 8.79016 3.90853 10.3905C3.5902 11.9908 3.75358 13.6496 4.378 15.1571C5.00242 16.6646 6.05984 17.9531 7.41655 18.8596C8.77326 19.7661 10.3683 20.25 12 20.25C14.1873 20.2475 16.2843 19.3775 17.8309 17.8309C19.3775 16.2843 20.2475 14.1873 20.25 12Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>{feature}</div>
        </div>
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
        <Button onClick={() => resolve(false)} className="!bg-red-800">
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
    <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px]">
      <div>
        {t(
          'would_you_mind_shortly_tell_us_what_we_could_have_done_better',
          'Would you mind shortly tell us what we could have done better?'
        )}
      </div>
      <div>
        <Textarea
          className="bg-newBgColorInner"
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
  const router = useRouter();
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
                    modal: 'bg-transparent text-textColor',
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
                  modal: 'bg-transparent text-textColor',
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
  if (user?.isLifetime) {
    router.replace('/');
    return null;
  }
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-row">
        <div className="flex-1 text-[20px]">{t('plans', 'Plans')}</div>
        <div className="flex items-center gap-[16px]">
          <div>{t('monthly', 'MONTHLY')}</div>
          <div>
            <Slider value={monthlyOrYearly} onChange={setMonthlyOrYearly} />
          </div>
          <div>{t('yearly', 'YEARLY')}</div>
        </div>
      </div>

      {finishTrial && <FinishTrial close={() => setFinishTrial(false)} />}

      {/* A renewal Stripe could not charge. Stripe retries on its own schedule,
          so this says what is true — nothing is cancelled — rather than
          threatening. The design puts `payFailShow` in this position, above the
          plan grid and below the trial banner. */}
      {!!paymentFailed && !subscription?.cancelAt && (
        <div
          data-payment-failed="1"
          className="flex flex-wrap items-center gap-[14px] rounded-pqLg bg-gradient-to-r from-pqLtAmber/15 to-transparent p-[14px_16px] outline outline-1 -outline-offset-1 outline-pqLtAmber/30"
        >
          <div className="grid size-[38px] shrink-0 place-items-center rounded-pqMd bg-pqLtAmber/15 text-pqLtAmber">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <path
                d="M12 8v5M12 16.5h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="text-[14.5px] font-[600] -tracking-[0.01em] text-pqText">
              {t('payment_failed_title', 'We could not charge your card')}
            </div>
            <div className="mt-[3px] text-[12.5px] text-pqMuted">
              {t(
                'payment_failed_body',
                'Update your payment method and we will try again. Nothing is cancelled yet.'
              )}
            </div>
          </div>
          <Button onClick={updatePayment} className="!h-[38px]">
            {t('update_payment_method', 'Update payment method')}
          </Button>
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
          className="flex flex-wrap items-center gap-[14px] rounded-pqLg bg-gradient-to-r from-pqOkSoft to-transparent p-[14px_16px] outline outline-1 -outline-offset-1 outline-pqOk/25"
        >
          <div className="grid size-[38px] shrink-0 place-items-center rounded-pqMd bg-pqOkSoft text-pqOk">
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

      <div className="flex gap-[16px] [@media(max-width:1024px)]:flex-col [@media(max-width:1024px)]:text-center">
        {Object.entries(pricing)
          .filter((f) => (!isGeneral || f[0] !== 'FREE') && !f[1].retired)
          .map(([name, values]) => (
            <div
              key={name}
              data-plan-card={name}
              className="flex-1 bg-sixth border border-pqLine rounded-[4px] p-[24px] gap-[16px] flex flex-col [@media(max-width:1024px)]:items-center"
            >
              <div className="text-[18px]">{name}</div>
              <div className="text-[38px] flex gap-[2px] items-center">
                <div>
                  $
                  {monthlyOrYearly === 'on'
                    ? values.year_price
                    : values.month_price}
                </div>
                <div className={`text-[14px] text-pqMuted`}>
                  {monthlyOrYearly === 'on' ? '/year' : '/month'}
                </div>
              </div>
              <div className="text-[14px] flex gap-[10px]">
                {currentPackage === name.toUpperCase() &&
                subscription?.cancelAt ? (
                  <div className="gap-[3px] flex flex-col">
                    <div>
                      <Button
                        onClick={moveToCheckout('FREE', true)}
                        loading={loading}
                      >
                        {t(
                          'reactivate_subscription',
                          'Reactivate subscription'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    loading={loading}
                    disabled={
                      (!!subscription?.cancelAt &&
                        name.toUpperCase() === 'FREE') ||
                      currentPackage === name.toUpperCase()
                    }
                    className={clsx(
                      subscription &&
                        name.toUpperCase() === 'FREE' &&
                        '!bg-red-500'
                    )}
                    onClick={moveToCheckout(name.toUpperCase() as PaidTier)}
                  >
                    {currentPackage === name.toUpperCase()
                      ? 'Current Plan'
                      : name.toUpperCase() === 'FREE'
                      ? subscription?.cancelAt
                        ? `Downgrade on ${dayjs
                            .utc(subscription?.cancelAt)
                            .local()
                            .format('D MMM, YYYY')}`
                        : 'Cancel subscription'
                      : // @ts-ignore
                      (user?.tier === 'FREE' ||
                          user?.tier?.current === 'FREE') &&
                        user.allowTrial
                      ? t('start_7_days_free_trial', 'Start 7 days free trial')
                      : 'Purchase'}
                  </Button>
                )}
                {subscription &&
                  currentPackage !== name.toUpperCase() &&
                  name !== 'FREE' &&
                  !!name && (
                    <Prorate
                      period={monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY'}
                      pack={name.toUpperCase() as PaidTier}
                    />
                  )}
              </div>
              <Features pack={name.toUpperCase() as AnyTier} />
            </div>
          ))}
      </div>
      {!!subscription?.id && (
        <div className="flex justify-center mt-[20px] gap-[10px]">
          <Button onClick={updatePayment}>
            {t(
              'update_payment_method_invoices_history',
              'Update Payment Method / Invoices History'
            )}
          </Button>
          {isGeneral && !subscription?.cancelAt && (
            <Button
              className="bg-red-500"
              loading={loading}
              onClick={moveToCheckout('FREE')}
            >
              {t('cancel_subscription_1', 'Cancel subscription')}
            </Button>
          )}
        </div>
      )}
      {subscription?.cancelAt && isGeneral && (
        <div className="text-center">
          {t(
            'your_subscription_will_be_canceled_at',
            'Your subscription will be canceled at'
          )}{' '}
          {newDayjs(subscription.cancelAt).local().format('D MMM, YYYY')}
          <br />
          {t(
            'you_will_never_be_charged_again',
            'You will never be charged again'
          )}
        </div>
      )}
      <FAQComponent />
      <div className="flex justify-center mt-[20px]">
        <LogoutComponent />
      </div>
    </div>
  );
};
