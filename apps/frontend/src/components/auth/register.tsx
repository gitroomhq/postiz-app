'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import interClass from '@gitroom/react/helpers/inter.font';
import clsx from 'clsx';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { FarcasterProvider } from '@gitroom/frontend/components/auth/providers/farcaster.provider';
import dynamic from 'next/dynamic';
import { WalletUiProvider } from '@gitroom/frontend/components/auth/providers/placeholder/wallet.ui.provider';
const WalletProvider = dynamic(
  () => import('@gitroom/frontend/components/auth/providers/wallet.provider'),
  { ssr: false, loading: () => <WalletUiProvider /> }
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
        body: JSON.stringify({ code }),
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
  const { isGeneral, genericOauth, neynarClientId, billingEnabled } =
    useVariables();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const fireEvents = useFireEvents();
  const track = useTrack();

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
      body: JSON.stringify({ ...data }),
    })
      .then((response) => {
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
            message: getHelpfulReasonForRegistrationFailure(response.status),
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

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <h1 className="text-3xl font-bold text-left mb-4 cursor-pointer">
            Sign Up
          </h1>
        </div>
        {!isAfterProvider &&
          (!isGeneral ? (
            <GithubProvider />
          ) : (
            <div className="gap-[5px] flex flex-col">
              {genericOauth && isGeneral ? (
                <OauthProvider />
              ) : (
                <GoogleProvider />
              )}
              {!!neynarClientId && <FarcasterProvider />}
              {billingEnabled && <WalletProvider />}
            </div>
          ))}
        {!isAfterProvider && (
          <div className="h-[20px] mb-[24px] mt-[24px] relative">
            <div className="absolute w-full h-[1px] bg-fifth top-[50%] -translate-y-[50%]" />
            <div
              className={`absolute z-[1] ${interClass} justify-center items-center w-full left-0 top-0 flex`}
            >
              <div className="bg-customColor15 px-[16px]">OR</div>
            </div>
          </div>
        )}
        <div className="text-textColor">
          {!isAfterProvider && (
            <>
              <Input
                label="Email"
                {...form.register('email')}
                type="email"
                placeholder="Email Address"
              />
              <Input
                label="Password"
                {...form.register('password')}
                autoComplete="off"
                type="password"
                placeholder="Password"
              />
            </>
          )}
          <Input
            label="Company"
            {...form.register('company')}
            autoComplete="off"
            type="text"
            placeholder="Company"
          />
        </div>
        <div className={clsx('text-[12px]', interClass)}>
          By registering you agree to our{' '}
          <a
            href={`https://publica.do/terminos`}
            className="underline hover:font-bold"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href={`https://publica.do/privacidad`}
            className="underline hover:font-bold"
          >
            Privacy Policy
          </a>
        </div>
        <div className="text-center mt-6">
          <div className="w-full flex">
            <Button
              type="submit"
              className="flex-1 rounded-[4px]"
              loading={loading}
            >
              Create Account
            </Button>
          </div>
          <p className="mt-4 text-sm">
            Already Have An Account?{' '}
            <Link href="/auth/login" className="underline  cursor-pointer">
              {' '}
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </FormProvider>
  );
}
