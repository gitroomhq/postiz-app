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
    <div className="flex flex-col w-full pt-[48px] billing-form flex-1 tablet:pt-0">
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
        <h4 className="mb-[32px] text-[24px] font-[700]">
          {checkout.type === 'loading'
            ? ''
            : t('billing_billing_address', 'Billing Address')}
        </h4>
        <BillingAddressElement />
      </div>
      <div>
        <h4 className="mt-[40px] mb-[32px] text-[24px] font-[700]">
          {checkout.type === 'loading' ? '' : t('billing_payment', 'Payment')}
        </h4>
        <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
        {checkout.type === 'loading' ? null : (
          <div className="mt-[24px] text-[16px] font-[600] flex gap-[4px] items-center">
            <div>
              {t(
                'billing_powered_by_stripe',
                'Secure payments processed by'
              )}
            </div>
            <svg
              className="mt-[4px]"
              xmlns="http://www.w3.org/2000/svg"
              width="47"
              height="20"
              viewBox="0 0 47 20"
              fill="none"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M45.9725 11.0075H39.7596C39.906 12.4952 40.9929 12.9731 42.2262 12.9731C43.4904 12.9731 44.5079 12.6879 45.3481 12.2408V14.8C44.2819 15.4135 43.0618 15.7078 41.8331 15.6479C38.7421 15.6479 36.5683 13.7208 36.5683 9.88208C36.5683 6.65229 38.4106 4.08542 41.4246 4.08542C44.4463 4.08542 46.0187 6.61375 46.0187 9.86667C46.0187 10.175 45.9879 10.8379 45.9725 11.0075ZM41.4092 6.67542C40.6152 6.67542 39.7365 7.23812 39.7365 8.66417H43.0125C43.0125 7.23812 42.1877 6.67542 41.4092 6.67542ZM31.5656 15.6479C30.4556 15.6479 29.7773 15.1854 29.3302 14.8462L29.3148 18.4152L26.139 19.0858V4.29354H29.0373L29.099 5.07979C29.7712 4.44215 30.6622 4.0863 31.5887 4.08542C33.8242 4.08542 35.9208 6.08958 35.9208 9.78958C35.9208 13.821 33.8396 15.6479 31.5656 15.6479ZM30.8333 6.89896C30.101 6.89896 29.6462 7.16104 29.3148 7.52333L29.3302 12.2408C29.6385 12.58 30.0856 12.8421 30.8333 12.8421C32.005 12.8421 32.7912 11.5702 32.7912 9.85896C32.7912 8.20167 31.9896 6.89896 30.8333 6.89896ZM21.7683 4.29354H24.9519V15.4244H21.7683V4.29354ZM21.7683 0.670625L24.9519 0V2.59L21.7683 3.26833V0.678333V0.670625ZM18.4383 7.87792V15.4244H15.2625V4.29354H18.1146L18.2071 5.23396C18.9779 3.86958 20.5735 4.14708 20.9975 4.29354V7.215C20.5967 7.08396 19.2323 6.88354 18.4383 7.87792ZM11.8477 11.5162C11.8477 13.3894 13.8519 12.8112 14.2527 12.6417V15.2317C13.8287 15.4629 13.0656 15.6479 12.025 15.6479C11.5913 15.6606 11.1595 15.5849 10.756 15.4254C10.3525 15.2659 9.98559 15.026 9.6777 14.7203C9.36981 14.4146 9.12733 14.0494 8.96502 13.647C8.8027 13.2446 8.72395 12.8134 8.73354 12.3796L8.74125 2.22771L11.84 1.56479V4.29354H14.2604V7.01458H11.8477V11.524V11.5162ZM8.06292 12.0558C8.06292 14.3452 6.28229 15.6479 3.64604 15.6479C2.46306 15.647 1.29288 15.403 0.208125 14.931V11.9017C1.27188 12.4798 2.59771 12.9115 3.64604 12.9115C4.35521 12.9115 4.82542 12.7265 4.82542 12.1406C4.82542 10.6144 0 11.1848 0 7.66979C0 5.42667 1.7575 4.08542 4.33208 4.08542C5.38042 4.08542 6.42875 4.23958 7.48479 4.66354V7.65438C6.50888 7.14076 5.42694 6.86103 4.32438 6.83729C3.66146 6.83729 3.21438 7.03 3.21438 7.53104C3.21438 8.95708 8.06292 8.27875 8.06292 12.0635V12.0558Z"
                fill="#635BFF"
              />
            </svg>
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
    <div className="animate-fadeIn h-[92px] mobile:h-auto fixed bottom-0 w-full px-[12px] pb-[12px] left-0 bg-newBgColor z-[100]">
      <div className="w-full h-full border-t border-newColColor bg-newBgColorInner px-[80px] tablet:px-[33px] mobile:!px-[16px] flex mobile:flex-col gap-[32px] mobile:gap-[16px] justify-end items-center font-[400] text-[14px] text-[#A3A3A3] mobile:py-[16px]">
        {checkout.checkout.recurring?.trial?.trialEnd ? (
          <div>
            {t('billing_your_7_day_trial_is', 'Your 7-day trial is')}{' '}
            <span className="text-textColor font-[600]">
              {t('billing_100_percent_free', '100% free')}
            </span>{' '}
            {t('billing_ending', 'ending')}{' '}
            <br className="hidden mobile:block" />
            <span className="text-textColor font-[600]">
              {dayjs(
                checkout.checkout.recurring?.trial?.trialEnd * 1000
              ).format('MMMM D, YYYY')}{' '}
              —{' '}
            </span>
            <span className="text-textColor font-[600]">
              {t('billing_cancel_anytime_short', 'Cancel anytime.')}
            </span>
          </div>
        ) : null}
        <div>
          <Button
            className="h-[42px] rounded-[10px] mobile:w-full"
            type="submit"
            loading={loading}
          >
            {checkout.checkout.recurring?.trial?.trialEnd
              ? t(
                  'billing_pay_0_start_trial',
                  'Pay $0 Today - Start your free trial!'
                )
              : t('billing_pay_now', 'Pay Now')}
          </Button>
        </div>
      </div>
    </div>
  );
};
