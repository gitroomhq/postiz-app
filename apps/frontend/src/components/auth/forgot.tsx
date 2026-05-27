'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot.password.dto';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type Inputs = {
  email: string;
};

export function Forgot() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState(false);
  const resolver = useMemo(() => {
    return classValidatorResolver(ForgotPasswordDto);
  }, []);
  const form = useForm<Inputs>({ resolver });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    await fetchData('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ ...data, provider: 'LOCAL' }),
    });
    setState(true);
    setLoading(false);
  };
  return (
    <div className="flex flex-1 flex-col">
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="glass rounded-2xl p-8"
        >
          <h1 className="text-section text-start mb-2 text-fg">
            {t('forgot_password_1', 'Forgot Password')}
          </h1>
          {!state ? (
            <>
              <p className="text-body-sm text-fgMuted mb-8">
                We&rsquo;ll email you a reset link.
              </p>
              <div className="flex flex-col gap-4 text-textColor">
                <Input
                  label="Email"
                  translationKey="label_email"
                  {...form.register('email')}
                  type="email"
                  placeholder={t('email_address', 'Email Address')}
                />
              </div>
              <div className="text-center mt-8">
                <div className="w-full flex">
                  <Button type="submit" className="flex-1 !h-[48px]" loading={loading}>
                    {t('send_password_reset_email', 'Send Password Reset Email')}
                  </Button>
                </div>
                <p className="mt-6 text-body-sm text-fgMuted">
                  <Link
                    href="/auth/login"
                    className="text-fg hover:text-brand transition-colors"
                  >
                    ← {t('go_back_to_login', 'Go back to login')}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl p-4 mt-4 glass-subtle border border-borderGlass">
                <p className="text-body-sm text-fg">
                  {t(
                    'we_have_send_you_an_email_with_a_link_to_reset_your_password',
                    'We have sent you an email with a link to reset your password.'
                  )}
                </p>
              </div>
              <p className="mt-6 text-body-sm text-fgMuted">
                <Link
                  href="/auth/login"
                  className="text-fg hover:text-brand transition-colors"
                >
                  ← {t('go_back_to_login', 'Go back to login')}
                </Link>
              </p>
            </>
          )}
        </form>
      </FormProvider>
    </div>
  );
}
