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
    const response = await fetchData('/auth/forgot-return', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
      }),
    });
    const { reset } = response?.ok
      ? await response.json().catch(() => ({}) as any)
      : ({} as any);

    // `setState(true)` used to run BEFORE this check, which swapped the form
    // out for the "we successfully reset your password" branch. The error was
    // then attached to a `password` input that no longer existed, so an expired
    // link told the user the reset had worked and they could not log in.
    if (!reset) {
      setLoading(false);
      form.setError('password', {
        type: 'manual',
        message: t(
          'password_reset_link_expired',
          'Your password reset link has expired. Please try again.',
        ),
      });
      return false;
    }

    setState(true);
    setLoading(false);
  };
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col"
      >
        <h1 className="text-[32px] font-[600] -tracking-[0.8px] font-display lg:text-[40px]">
          {t('forgot_password_1', 'Forgot password')}
        </h1>
        <p className="mt-[10px] text-[15px] text-textItemBlur">
          {t(
            'choose_a_new_password',
            'Choose a new password for your account.',
          )}
        </p>
        {!state ? (
          <>
            <div className="mt-[28px] space-y-4 text-textColor">
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
            <div className="w-full flex mt-[24px]">
              <Button
                type="submit"
                className="flex-1 rounded-[10px] !h-[52px]"
                loading={loading}
              >
                {t('change_password', 'Change password')}
              </Button>
            </div>
            <p className="mt-[20px] text-center text-[14px] text-textItemBlur">
              <Link
                href="/auth/login"
                className="font-[500] text-newTextColor underline hover:font-bold"
              >
                {t('go_back_to_login', 'Back to sign in')}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-[28px] text-[15px] text-textItemBlur">
              {t(
                'we_successfully_reset_your_password_you_can_now_login_with_your',
                'Your password is updated. You can sign in with it now.',
              )}
            </p>
            <p className="mt-[20px] text-center text-[14px] text-textItemBlur">
              <Link
                href="/auth/login"
                className="font-[500] text-newTextColor underline hover:font-bold"
              >
                {t('go_back_to_login', 'Back to sign in')}
              </Link>
            </p>
          </>
        )}
      </form>
    </FormProvider>
  );
}
