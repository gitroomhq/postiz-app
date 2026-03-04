'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { FarcasterProvider } from '@gitroom/frontend/components/auth/providers/farcaster.provider';
import WalletProvider from '@gitroom/frontend/components/auth/providers/wallet.provider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSearchParams } from 'next/navigation';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

const USE_POSTIZ_AUTH = process.env.NEXT_PUBLIC_USE_POSTIZ_AUTH === 'true';
const STUDIO_TOOLS_URL =
  process.env.NEXT_PUBLIC_STUDIO_TOOLS_URL || 'https://studio-tools.letstok.com';
const LETSTOK_WEBSITE_URL =
  process.env.NEXT_PUBLIC_LETSTOK_WEBSITE_URL || 'https://www.letstok.com';
type Inputs = {
  email: string;
  password: string;
  providerToken: '';
  provider: 'LOCAL';
};
export function Login() {
  const t = useT();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [notActivated, setNotActivated] = useState(false);
  const provider = searchParams?.get('provider')?.toUpperCase();
  const code = searchParams?.get('code') || '';
  const [oauthProcessing, setOauthProcessing] = useState(!!(provider && code));
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
  const oauthCallbackFiredRef = useRef(false);

  const handleOAuthCallback = useCallback(async () => {
    if (!provider || !code) return;
    if (oauthCallbackFiredRef.current) return; // Prevent double execution (React Strict Mode)
    oauthCallbackFiredRef.current = true;
    setOauthProcessing(true);
    try {
      const redirectUri =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}${
              provider ? `?provider=${encodeURIComponent(provider)}` : ''
            }`
          : undefined;
      const response = await fetchData(`/auth/oauth/${provider}/exists`, {
        method: 'POST',
        body: JSON.stringify({ code, redirectUri }),
        credentials: 'include',
      });
      if (!response.ok) {
        setOauthProcessing(false);
        const err = await response.json().catch(() => ({}));
        alert(err?.message || 'Authentication failed. Please try again.');
        return;
      }
      const data = await response.json();
      if (data.login) {
        // Layout afterRequest will set cookie from auth header and reload
        window.location.href = '/';
        return;
      }
      if (data.token) {
        window.location.href = `/auth?code=${encodeURIComponent(code)}&provider=${provider}`;
        return;
      }
      setOauthProcessing(false);
      alert('Unexpected response. Please try again.');
    } catch (e) {
      setOauthProcessing(false);
      alert('Authentication failed. Please try again.');
    }
  }, [provider, code, fetchData]);

  useEffect(() => {
    if (provider && code) {
      handleOAuthCallback();
    }
  }, [provider, code, handleOAuthCallback]);

  if (oauthProcessing) {
    return (
      <div className="flex flex-col items-center gap-4">
        <LoadingComponent />
        <p className="text-sm text-gray-400">
          {t('signing_you_in', 'Signing you in...')}
        </p>
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
  const loginWithLetsTok = () => {
    window.location.href = `${STUDIO_TOOLS_URL}/login?redirect=social`;
  };

  return (
    <FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col flex-1">
          <div>
            <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start cursor-pointer">
              {t('sign_in', 'Sign In')}
            </h1>
          </div>
          <div className="text-[14px] mt-[32px] mb-[12px]">
            {t('continue_with', 'Continue With')}
          </div>
          <div className="flex flex-col">
            {!USE_POSTIZ_AUTH && (
              <>
                <Button
                  type="button"
                  className="w-full rounded-[10px] !h-[52px] mb-4"
                  onClick={loginWithLetsTok}
                >
                  {t('login_with_letstok', 'Login with LetsTok')}
                </Button>
                <p className="mt-4 text-sm text-center">
                  {t('sign_in_via_letstok', 'Sign in with your LetsTok account to access social scheduling.')}
                </p>
                <div className="h-[20px] mb-[24px] mt-[24px] relative">
                  <div className="absolute w-full h-[1px] bg-fifth top-[50%] -translate-y-[50%]" />
                  <div className="absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex">
                    <div className="px-[16px]">{t('or', 'or')}</div>
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
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-[10px] p-4 mb-4">
                      <p className="text-amber-400 text-sm mb-2">
                        {t(
                          'account_not_activated',
                          'Your account is not activated yet. Please check your email for the activation link.'
                        )}
                      </p>
                      <Link
                        href="/auth/activate"
                        className="text-amber-400 underline hover:font-bold text-sm"
                      >
                        {t('resend_activation_email', 'Resend Activation Email')}
                      </Link>
                    </div>
                  )}
                  <div className="text-center mt-6">
                    <div className="w-full flex">
                      <Button
                        type="submit"
                        className="flex-1 rounded-[10px] !h-[52px]"
                        loading={loading}
                      >
                        {t('sign_in_1', 'Sign in')}
                      </Button>
                    </div>
                    <p className="mt-4 text-sm">
                      {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                      <a href={`${LETSTOK_WEBSITE_URL}/pricing`} className="underline cursor-pointer">
                        {t('sign_up', 'Sign Up')}
                      </a>
                    </p>
                  </div>
                </div>
              </>
            )}
            {USE_POSTIZ_AUTH && (
              <>
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
                  <div className="absolute w-full h-[1px] bg-fifth top-[50%] -translate-y-[50%]" />
                  <div
                    className={`absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex`}
                  >
                    <div className="px-[16px]">{t('or', 'or')}</div>
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
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-[10px] p-4 mb-4">
                  <p className="text-amber-400 text-sm mb-2">
                    {t(
                      'account_not_activated',
                      'Your account is not activated yet. Please check your email for the activation link.'
                    )}
                  </p>
                  <Link
                    href="/auth/activate"
                    className="text-amber-400 underline hover:font-bold text-sm"
                  >
                    {t('resend_activation_email', 'Resend Activation Email')}
                  </Link>
                </div>
              )}
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button
                    type="submit"
                    className="flex-1 rounded-[10px] !h-[52px]"
                    loading={loading}
                  >
                    {t('sign_in_1', 'Sign in')}
                  </Button>
                </div>
                <p className="mt-4 text-sm">
                  {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                  <a href={`${LETSTOK_WEBSITE_URL}/pricing`} className="underline cursor-pointer">
                    {t('sign_up', 'Sign Up')}
                  </a>
                </p>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
