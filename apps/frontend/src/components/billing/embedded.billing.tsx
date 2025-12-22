'use client';

import { Stripe } from '@stripe/stripe-js';

import { FC, useEffect, useState } from 'react';
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
import Image from 'next/image';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const EmbeddedBilling: FC<{
  stripe: Promise<Stripe>;
  secret: string;
}> = ({ stripe, secret }) => {
  const [saveSecret, setSaveSecret] = useState(secret);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useCookie('mode', 'dark');

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

  if (saveSecret !== secret || loading) {
    return null;
  }

  return (
    <div className="flex flex-col w-full pt-[24px] billing-form flex-1">
      <CheckoutProvider
        stripe={stripe}
        options={{
          clientSecret: secret,
          elementsOptions: {
            appearance: {
              variables: {
                colorText: mode === 'dark' ? '#ffffff' : '#0e0e0e',
                borderRadius: '8px',
                colorBackground: mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
              },
              rules: {
                '.Label': {
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                },
                '.Input': {
                  height: '44px',
                  backgroundColor: mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
                },
              },
            },
          },
        }}
      >
        <FormWrapper />
      </CheckoutProvider>
    </div>
  );
};

const FormWrapper = () => {
  const checkoutState = useCheckout();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);

  if (checkoutState.type === 'loading' || checkoutState.type === 'error') {
    return null;
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
      <StripeInputs />
      <SubmitBar loading={loading} />
    </form>
  );
};

const StripeInputs = () => {
  const checkout = useCheckout();
  const t = useT();
  return (
    <>
      <div>
        <h4 className="mb-[8px] text-[24px]">
          {checkout.type === 'loading' ? '' : t('billing_billing_address', 'Billing Address')}
        </h4>
        <BillingAddressElement />
      </div>
      <div>
        <h4 className="mt-[20px] mb-[8px] text-[24px]">
          {checkout.type === 'loading' ? '' : t('billing_payment', 'Payment')}
        </h4>
        <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
        {checkout.type === 'loading' ? null : (
          <div className="mt-[24px] flex gap-[10px]">
            <div>{t('billing_powered_by_stripe', 'Secure payments processed by Stripe')}</div>
            <Image src="/stripe.svg" alt="Stripe" width={20} height={20} />
          </div>
        )}
      </div>
    </>
  );
};

const SubmitBar: FC<{ loading: boolean }> = ({ loading }) => {
  const checkout = useCheckout();
  const t = useT();
  if (checkout.type === 'loading' || checkout.type === 'error') {
    return null;
  }

  return (
    <div className="animate-fadeIn h-[92px] fixed bottom-0 w-full px-[12px] pb-[12px] left-0 bg-newBgColor z-[100]">
      <div className="w-full h-full border-t border-newColColor bg-newBgColorInner px-[80px] flex gap-[32px] justify-end items-center font-[400] text-[14px] text-[#A3A3A3]">
        {checkout.checkout.recurring?.trial?.trialEnd ? (
          <div>
            {t('billing_your_7_day_trial_is', 'Your 7-day trial is')}{' '}
            <span className="text-textColor font-[600]">{t('billing_100_percent_free', '100% free')}</span> {t('billing_ending', 'ending')}{' '}
            <span className="text-textColor font-[600]">
              {dayjs(
                checkout.checkout.recurring?.trial?.trialEnd * 1000
              ).format('MMMM D, YYYY')}{' '}
              —{' '}
            </span>
            <span className="text-textColor font-[600]">{t('billing_cancel_anytime_short', 'Cancel anytime.')}</span>
          </div>
        ) : null}
        <div>
          <Button
            className="h-[42px] rounded-[10px]"
            type="submit"
            loading={loading}
          >
            {checkout.checkout.recurring?.trial?.trialEnd
              ? t('billing_pay_0_start_trial', 'Pay $0 Today - Start your free trial!')
              : t('billing_pay_now', 'Pay Now')}
          </Button>
        </div>
      </div>
    </div>
  );
};
