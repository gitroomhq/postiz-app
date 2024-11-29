'use client';

import { Slider } from '@gitroom/react/form/slider';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Subscription } from '@prisma/client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import dayjs from 'dayjs';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useSWRConfig } from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useModals } from '@mantine/modals';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import PricingPlans from "@gitroom/frontend/components/billing/pricing.component";
import { useMoveToCheckout } from '@gitroom/frontend/components/billing/move-checkout';


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

    if ( (period === 'YEARLY' && monthlyOrYearly === 'off') || (period === 'MONTHLY' && monthlyOrYearly === 'on')) {
      return '';
    }

    return subscription?.subscriptionTier;
  }, [subscription, initialChannels, monthlyOrYearly, period]);

  const moveToCheckout = useMoveToCheckout(
      subscription,
      setSubscription,
      setLoading,
      monthlyOrYearly,
      utm,
      user,
      mutate
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
          <PricingPlans
              monthlyOrYearly={monthlyOrYearly}
              currentPackage={currentPackage}
              subscription={subscription}
              loading={loading}
              moveToCheckout={moveToCheckout}
          />
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
