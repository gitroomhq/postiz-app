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
        <div className="flex flex-col flex-1">
          <div>
            <h1 className="cursor-pointer text-start text-[40px] font-[700] tracking-[-0.04em] text-white">
              {t('sign_in', 'Sign In')}
            </h1>
            <p className="mt-[8px] text-[15px] text-textColor/58">
              {t(
                'auth_login_subtitle',
                'Access your workspace, calendar, and connected channels.'
              )}
            </p>
          </div>
          <div className="mb-[12px] mt-[28px] text-[12px] font-[600] uppercase tracking-[0.08em] text-textColor/55">
            {t('continue_with', 'Continue With')}
          </div>
          <div className="flex flex-col">
            {isGeneral && genericOauth ? (
              <OauthProvider />
            ) : !isGeneral ? (
              <GithubProvider />
            ) : (
              <div className="gap-[8px] flex">
                <GoogleProvider />
                {!!neynarClientId && <FarcasterProvider />}
                {billingEnabled && <WalletProvider />}
              </div>
            )}
            <div className="h-[20px] mb-[24px] mt-[24px] relative">
              <div className="absolute top-[50%] h-[1px] w-full -translate-y-[50%] bg-white/10" />
              <div
                className={`absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex`}
              >
                <div className="rounded-full border border-white/8 bg-[rgba(15,23,42,0.92)] px-[16px] py-[4px] text-[11px] font-[700] uppercase tracking-[0.08em] text-textColor/52">
                  {t('or', 'or')}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-[12px]">
              <div className="text-textColor">
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
                <div className="mb-4 rounded-[16px] border border-amber-400/20 bg-amber-500/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="mb-2 text-sm text-amber-300">
                    {t(
                      'account_not_activated',
                      'Your account is not activated yet. Please check your email for the activation link.'
                    )}
                  </p>
                  <Link
                    href="/auth/activate"
                    className="text-sm text-amber-200 underline underline-offset-4 hover:text-amber-100"
                  >
                    {t('resend_activation_email', 'Resend Activation Email')}
                  </Link>
                </div>
              )}
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button
                    type="submit"
                    className="flex-1 rounded-[12px] !h-[52px]"
                    loading={loading}
                  >
                    {t('sign_in_1', 'Sign in')}
                  </Button>
                </div>
                <p className="mt-4 text-sm text-textColor/66">
                  {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                  <Link href="/auth" className="underline underline-offset-4 cursor-pointer text-textColor hover:text-[#38bdf8]">
                    {t('sign_up', 'Sign Up')}
                  </Link>
                </p>
                <p className="mt-4 text-sm">
                  <Link
                    href="/auth/forgot"
                    className="cursor-pointer underline underline-offset-4 text-textColor/66 hover:text-[#38bdf8]"
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
