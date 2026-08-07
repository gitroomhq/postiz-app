'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import clsx from 'clsx';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import dynamic from 'next/dynamic';
import { WalletUiProvider } from '@gitroom/frontend/components/auth/providers/placeholder/wallet.ui.provider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
import {
  AuthShell,
  AuthStep,
} from '@gitroom/frontend/components/auth/auth-shell';
import { OtpEmailStep } from '@gitroom/frontend/components/auth/otp-email-step';
const WalletProvider = dynamic(
  () => import('@gitroom/frontend/components/auth/providers/wallet.provider'),
  {
    ssr: false,
    loading: () => <WalletUiProvider />,
  }
);
type Inputs = {
  email: string;
  password: string;
  company: string;
  providerToken: string;
  provider: string;
};
export function Register() {
  const getQuery = useSearchParams();
  const fetch = useFetch();
  const [provider] = useState(getQuery?.get('provider')?.toUpperCase());
  const [code, setCode] = useState(getQuery?.get('code') || '');
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (provider && code) {
      load();
    }
  }, []);
  const load = useCallback(async () => {
    const { token } = await (
      await fetch(`/auth/oauth/${provider?.toUpperCase() || 'LOCAL'}/exists`, {
        method: 'POST',
        body: JSON.stringify({
          code,
        }),
      })
    ).json();
    if (token) {
      setCode(token);
      setShow(true);
    }
  }, [provider, code]);
  if (!code && !provider) {
    return <RegisterAfter token="" provider="LOCAL" />;
  }
  if (!show) {
    return <LoadingComponent />;
  }
  return (
    <RegisterAfter token={code} provider={provider?.toUpperCase() || 'LOCAL'} />
  );
}
function getHelpfulReasonForRegistrationFailure(httpCode: number) {
  switch (httpCode) {
    case 400:
      return 'Email already exists';
    case 404:
      return 'Your browser got a 404 when trying to contact the API, the most likely reasons for this are the NEXT_PUBLIC_BACKEND_URL is set incorrectly, or the backend is not running.';
  }
  return 'Unhandled error: ' + httpCode;
}
export function RegisterAfter({
  token,
  provider,
}: {
  token: string;
  provider: string;
}) {
  const t = useT();
  const { billingEnabled, passwordlessLogin, legalUrl } = useVariables();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('method');
  const router = useRouter();
  const fireEvents = useFireEvents();
  const track = useTrack();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id');
  const isAfterProvider = useMemo(() => {
    return !!token && !!provider;
  }, [token, provider]);
  const resolver = useMemo(() => {
    return classValidatorResolver(CreateOrgUserDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      providerToken: token,
      provider: provider,
    },
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    await fetchData('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        datafast_visitor_id,
      }),
    })
      .then(async (response) => {
        setLoading(false);
        if (response.status === 200) {
          fireEvents('register');
          return track(TrackEnum.CompleteRegistration).then(() => {
            if (response.headers.get('activate') === 'true') {
              router.push('/auth/activate');
            } else {
              router.push('/auth/login');
            }
          });
        } else {
          form.setError('email', {
            message: await response.text(),
          });
        }
      })
      .catch((e) => {
        form.setError('email', {
          message:
            'General error: ' +
            e.toString() +
            '. Please check your browser console.',
        });
      });
  };
  // The fields + submit shared by the email step and the after-OAuth path
  // (which only needs Company). email/password render only when not returning
  // from a provider round-trip.
  const emailFields = (
    <div className="flex flex-col gap-[12px]">
      <div className="text-textColor">
        {!isAfterProvider && (
          <>
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
          </>
        )}
        <Input
          label="Organization"
          translationKey="label_organization"
          {...form.register('company')}
          autoComplete="off"
          type="text"
          placeholder={t('label_organization', 'Organization')}
        />
      </div>
      {/* Only claim the user agreed to terms when this deployment actually
          publishes them. Without LEGAL_URL these links resolved to pages the
          app does not serve, so self-hosted signups pointed at a 404 while
          still asserting agreement. */}
      {!!legalUrl && (
      <div className={clsx('text-[12px] text-textItemBlur')}>
        {t(
          'by_registering_you_agree_to_our',
          'By registering you agree to our'
        )}
        &nbsp;
        <a
          href={`${legalUrl}/terms-of-service`}
          className="underline hover:font-bold text-newTextColor"
          rel="nofollow"
        >
          {t('terms_of_service', 'Terms of Service')}
        </a>
        &nbsp;
        {t('and', 'and')}&nbsp;
        <a
          href={`${legalUrl}/privacy-policy`}
          rel="nofollow"
          className="underline hover:font-bold text-newTextColor"
        >
          {t('privacy_policy', 'Privacy Policy')}
        </a>
        &nbsp;
      </div>
      )}
      <div className="w-full flex mt-[12px]">
        <Button
          type="submit"
          className="flex-1 rounded-[10px] !h-[52px]"
          loading={loading}
        >
          {t('create_account', 'Create Account')}
        </Button>
      </div>
    </div>
  );

  // The sign-in cross-link lives in the auth chrome (top right), so the form
  // itself carries no footer.
  const subtitle = t(
    'sign_up_subtitle',
    'Create your account and connect your first channel.'
  );

  if (!isAfterProvider && passwordlessLogin) {
    return (
      <div className="flex-1 flex">
        <AuthShell
          title={t('sign_up', 'Sign Up')}
          subtitle={subtitle}
          step={step}
          onContinueEmail={() => setStep('email')}
          onBack={() => setStep('method')}
          extraProviders={billingEnabled ? <WalletProvider /> : undefined}
          emailStep={
            <OtpEmailStep submitLabel={t('create_account', 'Create Account')} />
          }
        />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        {isAfterProvider ? (
          // Returning from an OAuth round-trip: no provider choice, just the
          // remaining Company field.
          <div className="flex flex-col flex-1">
            <h1 className="text-[40px] font-[600] -tracking-[0.8px] font-display">
              {t('sign_up', 'Sign Up')}
            </h1>
            <p className="mt-[10px] text-[15px] text-textItemBlur">
              {subtitle}
            </p>
            <div className="min-h-[320px] flex flex-col mt-[28px]">
              {emailFields}
            </div>
          </div>
        ) : (
          <AuthShell
            title={t('sign_up', 'Sign Up')}
            subtitle={subtitle}
            step={step}
            onContinueEmail={() => setStep('email')}
            onBack={() => setStep('method')}
            extraProviders={billingEnabled ? <WalletProvider /> : undefined}
            emailStep={emailFields}
          />
        )}
      </form>
    </FormProvider>
  );
}
