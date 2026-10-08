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
import { capitalize } from 'lodash';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useBillingFeatures } from '@gitroom/frontend/components/billing/first.billing.component';
import { BillingHistory } from '@gitroom/frontend/components/billing/billing.history.component';
import { useSWRConfig } from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';

type SubscriptionWithPlatform = Subscription & {
  platform?: 'web' | 'mobile';
};

export const Prorate: FC<{
  period: 'MONTHLY' | 'YEARLY';
  pack: 'STANDARD' | 'PRO';
}> = (props) => {
  const { period, pack } = props;
  const t = useT();
  const fetch = useFetch();
  const [price, setPrice] = useState<number | false>(false);
  const calculatePrice = useDebouncedCallback(async () => {
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
  }, 500);
  useEffect(() => {
    setPrice(false);
    calculatePrice();
  }, [period, pack]);
  // nothing is shown while the preview loads, the price is missing when it fails
  if (typeof price !== 'number') {
    return null;
  }
  return (
    <div className="animate-fadeIn">
      {t('pay_today', 'Pay Today')} ${Math.max(price, 0).toFixed(2)}
    </div>
  );
};

type PlanAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant: 'primary' | 'simple' | 'current' | 'danger';
};

const planButton = {
  primary: 'bg-btnPrimary text-white hover:bg-[#5023b8]',
  simple: 'bg-btnSimple text-btnText hover:opacity-80',
  current: 'bg-newBgLineColor text-textItemBlur',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const PlanCard: FC<{
  name: string;
  price: number;
  yearly: boolean;
  current: boolean;
  action: PlanAction;
  loading: boolean;
  disabled: boolean;
  note?: React.ReactNode;
}> = (props) => {
  const { name, price, yearly, current, action, loading, disabled, note } =
    props;
  const t = useT();
  const features = useBillingFeatures(name);

  return (
    <div
      className={clsx(
        'relative flex flex-col gap-[20px] rounded-[12px] border p-[24px] mobile:p-[20px]',
        current
          ? 'border-transparent bg-gradient-to-b from-seventh to-btnPrimary text-white shadow-lg shadow-purple-500/25'
          : 'border-newTableBorder bg-newBgColorInner shadow-previewShadow'
      )}
    >
      {[
        'top-[10px] start-[10px]',
        'top-[10px] end-[10px]',
        'bottom-[10px] start-[10px]',
        'bottom-[10px] end-[10px]',
      ].map((position) => (
        <span
          key={position}
          className={clsx(
            'absolute w-[8px] h-[8px] rounded-full border pointer-events-none',
            position,
            current
              ? 'border-white/25 bg-white/10'
              : 'border-newTableBorder bg-newBgColor'
          )}
        />
      ))}
      <div className="flex items-center justify-between gap-[8px] min-h-[26px]">
        <div className="text-[18px] font-[600]">{capitalize(name)}</div>
        {current && (
          <div className="flex items-center gap-[6px] h-[26px] px-[10px] rounded-full bg-white/15 text-[12px] font-[600] uppercase whitespace-nowrap">
            <span className="w-[6px] h-[6px] rounded-full bg-[#32D583]" />
            {t('active', 'Active')}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-[6px]">
        <div className="text-[40px] leading-[48px] font-[600] tracking-tight">
          ${price}
        </div>
        <div
          className={clsx(
            'text-[14px]',
            current ? 'text-white/70' : 'text-textItemBlur'
          )}
        >
          {yearly
            ? t('billing_per_year', '/ year')
            : t('billing_per_month', '/ month')}
        </div>
      </div>
      <div className="relative flex flex-col mb-[8px]">
        <button
          type="button"
          onClick={action.onClick}
          disabled={disabled}
          className={clsx(
            'h-[44px] px-[16px] rounded-[8px] text-[15px] font-[600] flex items-center justify-center transition-all',
            current
              ? action.variant === 'current'
                ? 'bg-white/15 text-white'
                : 'bg-white text-btnPrimary hover:bg-white/90'
              : planButton[action.variant],
            disabled ? 'cursor-default' : 'cursor-pointer',
            disabled && action.variant !== 'current' && 'opacity-50'
          )}
        >
          {loading ? (
            <ReactLoading
              type="spin"
              color="currentColor"
              width={18}
              height={18}
            />
          ) : (
            action.label
          )}
        </button>
        {!!note && (
          <div
            className={clsx(
              'absolute top-full inset-x-0 h-[28px] flex items-center justify-center text-[12px]',
              current ? 'text-white/70' : 'text-textItemBlur'
            )}
          >
            {note}
          </div>
        )}
      </div>
      <div
        className={clsx(
          'h-[1px]',
          current ? 'bg-white/15' : 'bg-newTableBorder'
        )}
      />
      <div className="flex flex-col gap-[12px] text-[14px] leading-[20px]">
        {features.map((feature) => (
          <div
            key={feature.key}
            className={clsx(
              'flex gap-[10px]',
              current ? 'text-white' : 'text-newTextColor/90'
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className={clsx(
                'shrink-0',
                current ? 'text-white/75' : 'text-[#8b5cf6]'
              )}
            >
              <circle
                cx="10"
                cy="10"
                r="7.75"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M7 10.25L9 12.25L13 8.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>{feature.label}</div>
          </div>
        ))}
      </div>
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
export const MainBillingComponent: FC<{
  sub?: SubscriptionWithPlatform;
}> = (props) => {
  const { sub } = props;
  const { isGeneral } = useVariables();
  const { mutate } = useSWRConfig();
  const fetch = useFetch();
  const toast = useToaster();
  const user = useUser();
  const dub = useDubClickId();
  const events = useFireEvents();
  const modal = useModals();
  const router = useRouter();
  const utm = useUtmUrl();
  const track = useTrack();
  const t = useT();
  const queryParams = useSearchParams();
  const [finishTrial, setFinishTrial] = useState(
    !!queryParams.get('finishTrial')
  );

  const [subscription, setSubscription] = useState<SubscriptionWithPlatform | undefined>(
    sub
  );
  const [loading, setLoading] = useState<boolean>(false);
  // which button started the request, so only that one shows a spinner
  const [clicked, setClicked] = useState('');
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
  const moveToCheckout = useCallback(
    (billing: 'STANDARD' | 'PRO' | 'FREE', reactivate = false) =>
      async () => {
        if (reactivate) {
          setLoading(true);
          const { cancel_at } = await (
            await fetch('/billing/cancel', {
              method: 'POST',
            })
          ).json();
          setSubscription((subs) => ({
            ...subs!,
            cancelAt: cancel_at,
          }));

          toast.show(
            cancel_at
              ? 'Your subscription was already active, so it is now set to cancel. Click Reactivate subscription again to keep it.'
              : 'Subscription reactivated successfully'
          );
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

            events('cancel_subscription');
            setLoading(true);
            const { cancel_at } = await (
              await fetch('/billing/cancel', {
                method: 'POST',
              })
            ).json();
            setSubscription((subs) => ({
              ...subs!,
              cancelAt: cancel_at,
            }));
            toast.show(
              cancel_at
                ? 'Subscription set to canceled successfully'
                : 'Your subscription was already set to cancel, so it has been reactivated. Click Cancel subscription again to cancel it.'
            );
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
            await deleteDialog(
              'We could not charge your credit card, please update your payment method',
              'Update',
              'Payment Method Required'
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
          mutate('/billing/invoices');
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
  if (subscription?.platform && subscription.platform !== 'web') {
    return (
      <div className="flex flex-col gap-[16px]">
        <div className="text-[20px]">{t('plans', 'Plans')}</div>
        <div className="flex flex-col items-center gap-[8px] rounded-[8px] bg-newBgColorInner p-[24px] text-center">
          <div className="text-[18px]">
            {t('subscription_managed_by', 'Your subscription is managed by')}{' '}
            <span className="capitalize">{subscription.provider}</span>
          </div>
          <div className="text-[14px] opacity-70">
            {t(
              'subscription_manage_on_platform',
              'Please go to {{platform}} to manage it',
              { platform: subscription.platform }
            )}
          </div>
        </div>
        <FAQComponent />
        <div className="flex justify-center mt-[20px]">
          <LogoutComponent />
        </div>
      </div>
    );
  }
  const yearly = monthlyOrYearly === 'on';
  const tiers = Object.keys(pricing);
  const currentTier = subscription?.subscriptionTier || 'FREE';
  const plans = tiers.filter((name) => !isGeneral || name !== 'FREE');

  const planAction = (name: string): PlanAction => {
    if (currentPackage === name && subscription?.cancelAt) {
      return {
        label: t('reactivate_subscription', 'Reactivate subscription'),
        onClick: moveToCheckout('FREE', true),
        variant: 'primary',
      };
    }
    if (currentPackage === name) {
      return {
        label: t('billing_current_plan', 'Current Plan'),
        disabled: true,
        variant: 'current',
      };
    }
    if (name === 'FREE') {
      return {
        label: subscription?.cancelAt
          ? t('billing_downgrade_on', 'Downgrade on {{date}}', {
              date: dayjs
                .utc(subscription.cancelAt)
                .local()
                .format('D MMM, YYYY'),
            })
          : t('cancel_subscription_1', 'Cancel subscription'),
        onClick: moveToCheckout('FREE'),
        disabled: !!subscription?.cancelAt,
        variant: 'danger',
      };
    }
    const direction = tiers.indexOf(name) - tiers.indexOf(currentTier);
    return {
      label: !subscription
        ? user?.tier?.current === 'FREE' && user.allowTrial
          ? t('start_7_days_free_trial', 'Start 7 days free trial')
          : t('billing_purchase', 'Purchase')
        : direction > 0
        ? t('billing_upgrade', 'Upgrade')
        : direction < 0
        ? t('billing_downgrade', 'Downgrade')
        : yearly
        ? t('billing_switch_to_yearly', 'Switch to yearly')
        : t('billing_switch_to_monthly', 'Switch to monthly'),
      onClick: moveToCheckout(name as 'STANDARD' | 'PRO'),
      variant: !!subscription && direction < 0 ? 'simple' : 'primary',
    };
  };

  return (
    <div className="flex flex-col gap-[24px]">
      {finishTrial && <FinishTrial close={() => setFinishTrial(false)} />}
      <div className="flex items-center gap-[16px] mobile:flex-col mobile:items-stretch">
        <div className="flex-1 flex flex-col gap-[4px]">
          <div className="text-[20px] font-[600]">
            {t('billing_and_subscription', 'Billing & Subscription')}
          </div>
          <div className="text-[14px] text-textItemBlur">
            {t(
              'billing_and_subscription_description',
              'Keep track of your subscription, update your payment method and download your invoices'
            )}
          </div>
        </div>
        <div className="flex p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500] select-none">
          <div
            onClick={() => setMonthlyOrYearly('off')}
            className={clsx(
              'h-[34px] px-[16px] rounded-[6px] flex items-center justify-center mobile:flex-1',
              !yearly ? 'bg-boxFocused text-textItemFocused' : 'cursor-pointer'
            )}
          >
            {t('billing_monthly', 'Monthly')}
          </div>
          <div
            onClick={() => setMonthlyOrYearly('on')}
            className={clsx(
              'h-[34px] px-[16px] rounded-[6px] flex items-center justify-center gap-[8px] mobile:flex-1',
              yearly ? 'bg-boxFocused text-textItemFocused' : 'cursor-pointer'
            )}
          >
            {t('billing_yearly', 'Yearly')}
            <div className="bg-[#AA0FA4] text-white text-[12px] px-[6px] rounded-[4px]">
              {t('billing_20_percent_off', '20% Off')}
            </div>
          </div>
        </div>
      </div>
      {subscription?.cancelAt && isGeneral && (
        <div className="flex items-center gap-[12px] rounded-[12px] border border-[#FFAC30]/30 bg-[#FFAC30]/10 px-[16px] py-[12px] text-[14px]">
          <div className="w-[8px] h-[8px] rounded-full bg-[#FFAC30] shrink-0" />
          <div>
            {t(
              'your_subscription_will_be_canceled_at',
              'Your subscription will be canceled at'
            )}{' '}
            <bdi className="font-[600]">
              {newDayjs(subscription.cancelAt).local().format('D MMM, YYYY')}
            </bdi>
            {'. '}
            {t(
              'you_will_never_be_charged_again',
              'You will never be charged again'
            )}
          </div>
        </div>
      )}
      <div
        className={clsx(
          'grid gap-[16px] tablet:grid-cols-2 mobile:!grid-cols-1',
          plans.length > 4 ? 'grid-cols-5' : 'grid-cols-4'
        )}
      >
        {plans.map((name) => {
          const action = planAction(name);
          return (
            <PlanCard
              key={name}
              name={name}
              price={
                yearly ? pricing[name].year_price : pricing[name].month_price
              }
              yearly={yearly}
              current={currentPackage === name}
              action={{
                ...action,
                onClick: () => {
                  setClicked(name);
                  action.onClick?.();
                },
              }}
              loading={loading && clicked === name}
              disabled={!!action.disabled || loading}
              note={
                !!subscription &&
                currentPackage !== name &&
                name !== 'FREE' && (
                  <Prorate
                    period={yearly ? 'YEARLY' : 'MONTHLY'}
                    pack={name as 'STANDARD' | 'PRO'}
                  />
                )
              }
            />
          );
        })}
      </div>
      {!!subscription?.id && (
        <div className="flex items-center gap-[16px] rounded-[12px] border border-newTableBorder bg-newBgColorInner shadow-previewShadow px-[24px] py-[20px] mobile:flex-col mobile:items-stretch mobile:p-[16px]">
          <div className="w-[48px] h-[48px] rounded-full bg-[#612bd3]/10 text-[#612bd3] flex items-center justify-center shrink-0 mobile:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20M6 15h4" />
            </svg>
          </div>
          <div className="flex-1 flex flex-col gap-[4px]">
            <div className="text-[16px] font-[600]">
              {t('billing_payment_method', 'Payment method')}
            </div>
            <div className="text-[14px] text-textItemBlur">
              {t(
                'billing_payment_method_description',
                'Update your card, billing address and tax details in the secure billing portal'
              )}
            </div>
          </div>
          <div className="flex items-center gap-[8px] mobile:flex-col-reverse mobile:items-stretch">
            {isGeneral && !subscription?.cancelAt && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setClicked('CANCEL');
                  moveToCheckout('FREE')();
                }}
                className="h-[44px] px-[16px] rounded-[8px] border border-red-500/40 text-red-500 text-[14px] font-[500] flex items-center justify-center hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {loading && clicked === 'CANCEL' ? (
                  <ReactLoading
                    type="spin"
                    color="currentColor"
                    width={18}
                    height={18}
                  />
                ) : (
                  t('cancel_subscription_1', 'Cancel subscription')
                )}
              </button>
            )}
            <button
              type="button"
              onClick={updatePayment}
              className="h-[44px] px-[16px] rounded-[8px] bg-btnSimple text-btnText text-[14px] font-[500] hover:opacity-80 transition-opacity"
            >
              {t('billing_update_payment_method', 'Update payment method')}
            </button>
          </div>
        </div>
      )}
      {!!subscription?.id && <BillingHistory />}
      <FAQComponent />
      <div className="flex justify-center mt-[20px]">
        <LogoutComponent />
      </div>
    </div>
  );
};
