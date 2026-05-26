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
  const form = useForm<Inputs>({
    resolver,
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    await fetchData('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: 'LOCAL',
      }),
    });
    setState(true);
    setLoading(false);
  };
  return (
    <div className="flex flex-1 flex-col">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <h1 className="text-[40px] text-start mb-[16px] cursor-pointer font-lambo uppercase leading-[1.15] text-white">
              {t('forgot_password_1', 'Forgot Password')}
            </h1>
          </div>
          {!state ? (
            <>
              <div className="space-y-4 text-textColor">
                <Input
                  label="Email"
                  translationKey="label_email"
                  {...form.register('email')}
                  type="email"
                  placeholder={t('email_address', 'Email Address')}
                />
              </div>
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button type="submit" className="flex-1 !h-[52px]" loading={loading}>
                    {t(
                      'send_password_reset_email',
                      'Send Password Reset Email'
                    )}
                  </Button>
                </div>
                <p className="mt-[16px] text-[14px] text-lamboAsh">
                  <Link href="/auth/login" className="text-white underline hover:text-lamboGold transition-colors cursor-pointer">
                    {t('go_back_to_login', 'Go back to login')}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-start mt-[24px] text-[16px] leading-[1.56] text-[#c8c8c8]">
                {t(
                  'we_have_send_you_an_email_with_a_link_to_reset_your_password',
                  'We have send you an email with a link to reset your password.'
                )}
              </div>
              <p className="mt-[16px] text-[14px] text-lamboAsh">
                <Link href="/auth/login" className="text-white underline hover:text-lamboGold transition-colors cursor-pointer">
                  {t('go_back_to_login', 'Go back to login')}
                </Link>
              </p>
            </>
          )}
        </form>
      </FormProvider>
    </div>
  );
}
