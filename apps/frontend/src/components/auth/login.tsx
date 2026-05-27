'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { FarcasterProvider } from '@gitroom/frontend/components/auth/providers/farcaster.provider';
import WalletProvider from '@gitroom/frontend/components/auth/providers/wallet.provider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

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
  const { isGeneral, neynarClientId, billingEnabled, genericOauth } =
    useVariables();
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
        <div className="flex flex-col flex-1 glass rounded-2xl p-8">
          <h1 className="text-section text-start mb-2 text-fg">
            {t('sign_in', 'Sign In')}
          </h1>
          <p className="text-body-sm text-fgMuted mb-8">
            Welcome back. Glad to see you again.
          </p>

          <div className="text-micro uppercase text-fgSubtle mb-3">
            {t('continue_with', 'Continue With')}
          </div>
          <div className="flex flex-col">
            {isGeneral && genericOauth ? (
              <OauthProvider />
            ) : !isGeneral ? (
              <GithubProvider />
            ) : (
              <div className="gap-2 flex">
                <GoogleProvider />
                {!!neynarClientId && <FarcasterProvider />}
                {billingEnabled && <WalletProvider />}
              </div>
            )}

            <div className="h-5 mt-8 mb-6 relative">
              <div className="absolute w-full h-px bg-borderGlass top-1/2 -translate-y-1/2" />
              <div className="absolute z-[1] justify-center items-center w-full start-0 top-0 flex">
                <div className="text-micro uppercase text-fgSubtle px-3 bg-canvas rounded-full">
                  {t('or', 'or')}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="text-textColor flex flex-col gap-4">
                <Input
                  label="Email"
                  translationKey="label_email"
                  {...form.register('email')}
                  type="email"
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
                <div className="rounded-xl p-4 bg-brand/10 border border-brand/30">
                  <p className="text-brand text-body-sm mb-2">
                    {t(
                      'account_not_activated',
                      'Your account is not activated yet. Please check your email for the activation link.'
                    )}
                  </p>
                  <Link
                    href="/auth/activate"
                    className="text-label text-brand underline hover:text-brand-light transition-colors"
                  >
                    {t('resend_activation_email', 'Resend Activation Email')}
                  </Link>
                </div>
              )}

              <div className="text-center mt-2">
                <div className="w-full flex">
                  <Button type="submit" className="flex-1 !h-[48px]" loading={loading}>
                    {t('sign_in_1', 'Sign in')}
                  </Button>
                </div>
                <p className="mt-6 text-body-sm text-fgMuted">
                  {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                  <Link
                    href="/auth"
                    className="text-fg font-medium hover:text-brand transition-colors"
                  >
                    {t('sign_up', 'Sign Up')}
                  </Link>
                </p>
                <p className="mt-3 text-body-sm">
                  <Link
                    href="/auth/forgot"
                    className="text-fgMuted hover:text-brand transition-colors"
                  >
                    {t('forgot_password', 'Forgot password')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
