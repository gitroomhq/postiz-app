'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot.password.dto';

type Inputs = {
  email: string;
};

export function Forgot() {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState(false);

  const resolver = useMemo(() => {
    return classValidatorResolver(ForgotPasswordDto);
  }, []);

  const form = useForm<Inputs>({
    resolver,
  });

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
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <h1 className="text-3xl font-bold text-left mb-4 cursor-pointer">
            Forgot Password
          </h1>
        </div>
        {!state ? (
          <>
            <div className="space-y-4 text-textColor">
              <Input
                label="Email"
                {...form.register('email')}
                type="email"
                placeholder="Email Address"
              />
            </div>
            <div className="text-center mt-6">
              <div className="w-full flex">
                <Button type="submit" className="flex-1" loading={loading}>
                  Send Password Reset Email
                </Button>
              </div>
              <p className="mt-4 text-sm">
                <Link href="/auth/login" className="underline cursor-pointer">
                  {' '}
                  Go back to login
                </Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-left mt-6">
              We have send you an email with a link to reset your password.
            </div>
            <p className="mt-4 text-sm">
              <Link href="/auth/login" className="underline cursor-pointer">
                {' '}
                Go back to login
              </Link>
            </p>
          </>
        )}
      </form>
    </FormProvider>
  );
}
