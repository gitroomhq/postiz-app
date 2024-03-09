'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';

type Inputs = {
  email: string;
  password: string;
  company: string;
  providerToken: '';
  provider: 'LOCAL';
};

export function Register() {
  const [loading, setLoading] = useState(false);
  const resolver = useMemo(() => {
    return classValidatorResolver(CreateOrgUserDto);
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
    const register = await fetchData('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, provider: 'LOCAL' }),
    });
    if (register.status === 400) {
      form.setError('email', {
        message: 'Email already exists',
      });

      setLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <h1 className="text-3xl font-bold text-left mb-4 cursor-pointer">
            Create An Account
          </h1>
        </div>
        <div className="space-y-4 text-white">
          <Input
            label="Email"
            {...form.register('email')}
            type="email"
            placeholder="Email Addres"
          />
          <Input
            label="Password"
            {...form.register('password')}
            autoComplete="off"
            type="password"
            placeholder="Password"
          />
          <Input
            label="Company"
            {...form.register('company')}
            autoComplete="off"
            type="text"
            placeholder="Company"
          />
        </div>
        <div className="text-center mt-6">
          <div className="w-full flex">
            <Button type="submit" className="flex-1" loading={loading}>
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
