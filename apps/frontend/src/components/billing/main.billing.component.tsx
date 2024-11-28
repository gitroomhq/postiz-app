'use client';

import { Slider } from '@gitroom/react/form/slider';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Subscription } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';
import ReactLoading from 'react-loading';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useToaster } from '@gitroom/react/toaster/toaster';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useSWRConfig } from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import interClass from '@gitroom/react/helpers/inter.font';
import { useRouter } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useModals } from '@mantine/modals';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Textarea } from '@gitroom/react/form/textarea';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import { Tiers } from './types';
import Features from './features.component';
import Prorate from './prorate.component';


export const MainBillingComponent: FC<{
  sub?: Subscription;
}> = (props) => {
  const { sub } = props;
  const { isGeneral } = useVariables();
  const { mutate } = useSWRConfig();
  const fetch = useFetch();
  const toast = useToaster();
  const user = useUser();
  const modal = useModals();
  const router = useRouter();
  const utm = useUtmUrl();

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

  const moveToCheckout = useCallback(
    (billing: 'STANDARD' | 'PRO' | 'FREE') => async () => {
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
            `Are you sure you want to cancel your subscription? ${messages.join(
              ', '
            )}`,
            'Yes, cancel',
            'Cancel Subscription'
          ))
        ) {
          const info = await new Promise((res) => {
            modal.openModal({
              title: '',
              withCloseButton: false,
              classNames: {
                modal: 'bg-transparent text-textColor',
              },
              children: <Info proceed={(e) => res(e)} />,
              size: 'auto',
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

          setSubscription((subs) => ({ ...subs!, cancelAt: cancel_at }));
          if (cancel_at)
            toast.show('Subscription set to canceled successfully');
          if (!cancel_at) toast.show('Subscription reactivated successfully');

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
      const { url, portal } = await (
        await fetch('/billing/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            period: monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY',
            utm,
            billing,
          }),
        })
      ).json();

      if (url) {
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
        toast.show('Subscription updated successfully');
      }

      setLoading(false);
    },
    [monthlyOrYearly, subscription, user, utm]
  );

  if (user?.isLifetime) {
    router.replace('/billing/lifetime');
    return null;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-row">
        <div className="flex-1 text-[20px]">Plans</div>
        <div className="flex items-center gap-[16px]">
          <div>MONTHLY</div>
          <div>
            <Slider value={monthlyOrYearly} onChange={setMonthlyOrYearly} />
          </div>
          <div>YEARLY</div>
        </div>
      </div>
      <div className="flex gap-[16px]">
        {Object.entries(pricing)
          .filter((f) => !isGeneral || f[0] !== 'FREE')
          .map(([name, values]) => (
            <div
              key={name}
              className="flex-1 bg-sixth border border-customColor6 rounded-[4px] p-[24px] gap-[16px] flex flex-col"
            >
              <div className="text-[18px]">{name}</div>
              <div className="text-[38px] flex gap-[2px] items-center">
                <div>
                  $
                  {monthlyOrYearly === 'on'
                    ? values.year_price
                    : values.month_price}
                </div>
                <div className={`text-[14px] ${interClass} text-customColor18`}>
                  {monthlyOrYearly === 'on' ? '/year' : '/month'}
                </div>
              </div>
              <div className="text-[14px] flex gap-[10px]">
                {currentPackage === name.toUpperCase() &&
                subscription?.cancelAt ? (
                  <div className="gap-[3px] flex flex-col">
                    <div>
                      <Button
                        onClick={moveToCheckout('FREE')}
                        loading={loading}
                      >
                        Reactivate subscription
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
                    onClick={moveToCheckout(
                      name.toUpperCase() as 'STANDARD' | 'PRO'
                    )}
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
                      user?.tier === 'FREE' || user?.tier?.current === 'FREE'
                      ? 'Start 7 days free trial'
                      : 'Purchase'}
                  </Button>
                )}
                {subscription &&
                  currentPackage !== name.toUpperCase() &&
                  name !== 'FREE' &&
                  !!name && (
                    <Prorate
                      period={monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY'}
                      pack={name.toUpperCase() as 'STANDARD' | 'PRO'}
                    />
                  )}
              </div>
              <Features
                pack={name.toUpperCase() as 'FREE' | 'STANDARD' | 'PRO'}
              />
            </div>
          ))}
      </div>
      {!!subscription?.id && (
        <div className="flex justify-center mt-[20px] gap-[10px]">
          <Button onClick={updatePayment}>Update Payment Method</Button>
          {isGeneral && !subscription?.cancelAt && (
            <Button
              className="bg-red-500"
              loading={loading}
              onClick={moveToCheckout('FREE')}
            >
              Cancel subscription
            </Button>
          )}
        </div>
      )}
      {subscription?.cancelAt && isGeneral && (
        <div className="text-center">
          Your subscription will be cancel at{' '}
          {dayjs(subscription.cancelAt).local().format('D MMM, YYYY')}
          <br />
          You will never be charged again
        </div>
      )}
      <FAQComponent />
    </div>
  );
};
