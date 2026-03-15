'use client';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
type Inputs = {
  password: string;
  repeatPassword: string;
  token: string;
};
export function ForgotReturn({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const t = useT();
  const [state, setState] = useState(false);
  const resolver = useMemo(() => {
    return classValidatorResolver(ForgotReturnPasswordDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      token,
    },
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    const { reset } = await (
      await fetchData('/auth/forgot-return', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
        }),
      })
    ).json();
    setState(true);
    if (!reset) {
      form.setError('password', {
        type: 'manual',
        message: t('password_reset_link_expired', 'Your password reset link has expired. Please try again.'),
      });
      return false;
    }
    setLoading(false);
  };
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <h1 className="mb-4 cursor-pointer text-start text-[40px] font-[700] tracking-[-0.04em] text-white">
            {t('forgot_password_1', 'Forgot Password')}
          </h1>
          <p className="mb-6 text-[15px] text-textColor/58">
            {t(
              'forgot_return_subtitle',
              'Choose a new password to get back into your workspace.'
            )}
          </p>
        </div>
        {!state ? (
          <>
            <div className="space-y-4 text-textColor">
              <Input
                label="New Password"
                translationKey="label_new_password"
                {...form.register('password')}
                type="password"
                placeholder={t('label_password', 'Password')}
              />
              <Input
                label="Repeat Password"
                translationKey="label_repeat_password"
                {...form.register('repeatPassword')}
                type="password"
                placeholder={t('label_repeat_password', 'Repeat Password')}
              />
            </div>
            <div className="text-center mt-6">
              <div className="w-full flex">
                <Button type="submit" className="flex-1 rounded-[12px] !h-[52px]" loading={loading}>
                  {t('change_password', 'Change Password')}
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
                'we_successfully_reset_your_password_you_can_now_login_with_your',
                'We successfully reset your password. You can now login with your'
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
  );
}
