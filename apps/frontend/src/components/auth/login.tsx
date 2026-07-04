'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { AuthButton, AuthInput } from '@gitroom/frontend/components/auth/auth-ui';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { useVariables } from '@gitroom/react/helpers/variable.context';
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
  const { isGeneral, genericOauth } = useVariables();
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
            <h1 className="text-[26px] font-[800] -tracking-[0.8px] text-start cursor-pointer">
              {t('sign_in', 'Sign In')}
            </h1>
          </div>
          <div className="text-[12px] mt-[16px] mb-[8px] text-[var(--voc-text-secondary)]">
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
              </div>
            )}
            <div className="h-[16px] mb-[12px] mt-[12px] relative">
              <div className="absolute w-full h-[1px] bg-[var(--voc-border-soft)] top-[50%] -translate-y-[50%]" />
              <div
                className={`absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex`}
              >
                <div className="px-[16px] bg-[var(--voc-bg-app)] text-[var(--voc-text-tertiary)] text-[12px] font-[700] uppercase tracking-[0.05em]">
                  {t('or', 'or')}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-[10px]">
              <div className="flex flex-col gap-[8px]">
                <AuthInput
                  label={t('email_address', 'Email Address')}
                  name="email"
                  type="email"
                  placeholder={t('email_address', 'Email Address')}
                />
                <AuthInput
                  label={t('label_password', 'Password')}
                  name="password"
                  autoComplete="off"
                  type="password"
                  placeholder={t('label_password', 'Password')}
                />
              </div>
              {notActivated && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-[var(--voc-radius-md)] p-4 mb-4">
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
              <div className="text-center mt-[4px]">
                <div className="w-full flex">
                  <AuthButton type="submit" loading={loading}>
                    {t('sign_in_1', 'Sign in')}
                  </AuthButton>
                </div>
                <p className="mt-[10px] text-[12px] text-[var(--voc-text-secondary)]">
                  {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                  <Link
                    href="/auth"
                    className="text-[var(--voc-text-primary)] underline cursor-pointer"
                  >
                    {t('sign_up', 'Sign Up')}
                  </Link>
                  &nbsp;·&nbsp;
                  <Link
                    href="/auth/forgot"
                    className="text-[var(--voc-text-secondary)] underline hover:text-[var(--voc-text-primary)] cursor-pointer"
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
