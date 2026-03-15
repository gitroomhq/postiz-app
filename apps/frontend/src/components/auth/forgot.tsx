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
            <h1 className="mb-4 cursor-pointer text-start text-[40px] font-[700] tracking-[-0.04em] text-white">
              {t('forgot_password_1', 'Forgot Password')}
            </h1>
            <p className="mb-6 text-[15px] text-textColor/58">
              {t(
                'forgot_password_subtitle',
                'We will send you a secure link to reset your password.'
              )}
            </p>
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
                  <Button type="submit" className="flex-1 !h-[52px] !rounded-[12px]" loading={loading}>
                    {t(
                      'send_password_reset_email',
                      'Send Password Reset Email'
                    )}
                  </Button>
                </div>
                <p className="mt-4 text-sm text-textColor/66">
                  <Link href="/auth/login" className="underline underline-offset-4 cursor-pointer hover:text-[#38bdf8]">
                    {t('go_back_to_login', 'Go back to login')}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 rounded-[16px] border border-white/8 bg-white/[0.03] p-[16px] text-start text-textColor/78">
                {t(
                  'we_have_send_you_an_email_with_a_link_to_reset_your_password',
                  'We have send you an email with a link to reset your password.'
                )}
              </div>
              <p className="mt-4 text-sm text-textColor/66">
                <Link href="/auth/login" className="underline underline-offset-4 cursor-pointer hover:text-[#38bdf8]">
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
