'use client';

import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ResendInputs = {
  email: string;
};

type ResendStatus = 'idle' | 'sent';

const COOLDOWN_SECONDS = 60;

export function Activate() {
  const t = useT();
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ResendStatus>('idle');
  const [cooldown, setCooldown] = useState(0);
  const form = useForm<ResendInputs>();

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // "Send Again" only appears once the cooldown has already run out, so
  // re-arming it here made the user wait a second 60 seconds having sent
  // nothing. The submit itself sets the cooldown when a mail actually goes out.
  const resetToForm = useCallback(() => {
    setStatus('idle');
    setCooldown(0);
  }, []);

  const onSubmit: SubmitHandler<ResendInputs> = async (data) => {
    setLoading(true);
    try {
      const response = await fetch('/auth/resend-activation', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        setStatus('sent');
        setCooldown(COOLDOWN_SECONDS);
      } else {
        form.setError('email', {
          message: t('failed_to_resend', 'Failed to resend activation email'),
        });
      }
    } catch (e) {
      form.setError('email', {
        message: t('error_occurred', 'An error occurred. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <h1 className="text-[32px] font-[600] -tracking-[0.8px] font-display lg:text-[40px]">
        {t('activate_your_account', 'Activate your account')}
      </h1>
      <p className="mt-[10px] text-[15px] text-textItemBlur">
        {t('thank_you_for_registering', 'Thank you for registering!')}{' '}
        {t(
          'please_check_your_email_to_activate_your_account',
          'Please check your email to activate your account.',
        )}
      </p>

      <div className="mt-8 border-t border-fifth pt-6">
        <h2 className="text-lg font-semibold mb-4">
          {t('didnt_receive_email', "Didn't receive the email?")}
        </h2>
        {status === 'sent' ? (
          <div className="flex flex-col gap-4">
            <div className="text-green-400">
              {t(
                'activation_email_sent',
                'Activation email has been sent! Please check your inbox.',
              )}
            </div>
            {cooldown > 0 ? (
              <p className="text-sm text-textColor">
                {t('resend_available_in', 'You can resend in')} {cooldown}s
              </p>
            ) : (
              <Button
                onClick={resetToForm}
                className="rounded-[10px] !h-[52px]"
              >
                {t('send_again', 'Send Again')}
              </Button>
            )}
          </div>
        ) : (
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <Input
                label={t('label_email', 'Email')}
                translationKey="label_email"
                {...form.register('email', { required: true })}
                type="email"
                placeholder={t('email_address', 'Email Address')}
              />
              <Button
                type="submit"
                className="rounded-[10px] !h-[52px]"
                loading={loading}
                disabled={cooldown > 0}
              >
                {cooldown > 0
                  ? `${t('resend_available_in', 'You can resend in')} ${cooldown}s`
                  : t('resend_activation_email', 'Resend Activation Email')}
              </Button>
            </form>
          </FormProvider>
        )}
        <p className="mt-[20px] text-center text-[14px] text-textItemBlur">
          {t('already_activated', 'Already activated?')}{' '}
          <Link
            href="/auth/login"
            className="font-[500] text-newTextColor underline hover:font-bold"
          >
            {t('sign_in', 'Sign In')}
          </Link>
        </p>
      </div>
    </div>
  );
}
