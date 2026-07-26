'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import WalletProvider from '@gitroom/frontend/components/auth/providers/wallet.provider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  AuthShell,
  AuthStep,
} from '@gitroom/frontend/components/auth/auth-shell';
import { OtpEmailStep } from '@gitroom/frontend/components/auth/otp-email-step';
type Inputs = {
  email: string;
  password: string;
  providerToken: '';
  provider: 'LOCAL';
};
export function Login() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [notActivated, setNotActivated] = useState(false);
  const [step, setStep] = useState<AuthStep>('method');
  const { billingEnabled, passwordlessLogin } = useVariables();
  const resolver = useMemo(() => {
    return classValidatorResolver(LoginUserDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      providerToken: '',
      provider: 'LOCAL',
    },
  });
  const fetchData = useFetch();
  // The sign-up cross-link lives in the auth chrome (top right), so the form
  // itself carries no footer.
  const subtitle = t(
    'sign_in_subtitle',
    'Welcome back. Sign in to get to your calendar.'
  );
  if (passwordlessLogin) {
    return (
      <div className="flex-1 flex">
        <AuthShell
          title={t('sign_in', 'Sign In')}
          subtitle={subtitle}
          step={step}
          onContinueEmail={() => setStep('email')}
          onBack={() => setStep('method')}
          extraProviders={billingEnabled ? <WalletProvider /> : undefined}
          emailStep={<OtpEmailStep submitLabel={t('sign_in_1', 'Sign in')} />}
        />
      </div>
    );
  }
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    setNotActivated(false);
    const login = await fetchData('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: 'LOCAL',
      }),
    });
    if (login.status === 400) {
      const errorMessage = await login.text();
      if (errorMessage === 'User is not activated') {
        setNotActivated(true);
      } else {
        form.setError('email', {
          message: errorMessage,
        });
      }
      setLoading(false);
    }
  };
  return (
    <FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        <AuthShell
          title={t('sign_in', 'Sign In')}
          subtitle={subtitle}
          step={step}
          onContinueEmail={() => setStep('email')}
          onBack={() => setStep('method')}
          extraProviders={billingEnabled ? <WalletProvider /> : undefined}
          emailStep={
            <div className="flex flex-col gap-[12px]">
              <div className="text-textColor">
                <Input
                  label="Email"
                  translationKey="label_email"
                  {...form.register('email')}
                  type="email"
                  autoFocus
                  placeholder={t('email_address', 'Email Address')}
                />
                <Input
                  label="Password"
                  translationKey="label_password"
                  {...form.register('password')}
                  autoComplete="off"
                  type="password"
                  placeholder={t('label_password', 'Password')}
                />
              </div>
              {notActivated && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-[10px] p-4 mb-4">
                  <p className="text-amber-500 text-sm mb-2">
                    {t(
                      'account_not_activated',
                      'Your account is not activated yet. Please check your email for the activation link.'
                    )}
                  </p>
                  <Link
                    href="/auth/activate"
                    className="text-amber-500 underline hover:font-bold text-sm"
                  >
                    {t('resend_activation_email', 'Resend Activation Email')}
                  </Link>
                </div>
              )}
              <div className="w-full flex mt-[12px]">
                <Button
                  type="submit"
                  className="flex-1 rounded-[10px] !h-[52px]"
                  loading={loading}
                >
                  {t('sign_in_1', 'Sign in')}
                </Button>
              </div>
              <p className="text-center text-sm mt-[8px]">
                <Link
                  href="/auth/forgot"
                  className="underline hover:font-bold cursor-pointer text-textItemBlur"
                >
                  {t('forgot_password', 'Forgot password')}
                </Link>
              </p>
            </div>
          }
        />
      </form>
    </FormProvider>
  );
}
