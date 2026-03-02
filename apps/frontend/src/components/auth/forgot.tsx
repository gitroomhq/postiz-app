'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot.password.dto';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';
type Inputs = {
  email: string;
};
export function Forgot() {
  const t = useT();
  const router = useRouter();
  const { desktopMode } = useVariables();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<false | 'sent' | 'no-email'>(false);
  const resolver = useMemo(() => {
    return classValidatorResolver(ForgotPasswordDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    const resp = await fetchData('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: 'LOCAL',
      }),
    });
    const result = await resp.json().catch(() => ({}));
    setLoading(false);
    if (result.resetUrl) {
      // Desktop mode: redirect directly to reset form — no email needed
      router.push(result.resetUrl);
      return;
    }
    if (result.noEmail) {
      setState('no-email');
      return;
    }
    setState('sent');
  };
  return (
    <div className="flex flex-1 flex-col">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <h1 className="text-3xl font-bold text-start mb-4 cursor-pointer">
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
                  <Button type="submit" className="flex-1 !h-[52px] !rounded-[10px]" loading={loading}>
                    {t(
                      'send_password_reset_email',
                      'Send Password Reset Email'
                    )}
                  </Button>
                </div>
                <p className="mt-4 text-sm">
                  <Link href="/auth/login" className="underline cursor-pointer">
                    {t('go_back_to_login', 'Go back to login')}
                  </Link>
                </p>
              </div>
            </>
          ) : state === 'no-email' ? (
            <>
              <div className="text-start mt-6">
                {desktopMode
                  ? t(
                      'email_not_configured_reset_desktop',
                      'Email is not configured. To reset your password, add EMAIL_PROVIDER settings to ~/Library/Application Support/Postiz/postiz.env and restart the app.'
                    )
                  : t(
                      'email_not_configured_reset',
                      'Email is not configured on this server. To enable password reset emails, add EMAIL_PROVIDER settings to the server .env file and restart the server.'
                    )}
              </div>
              <p className="mt-4 text-sm">
                <Link href="/auth/login" className="underline cursor-pointer">
                  {t('go_back_to_login', 'Go back to login')}
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-start mt-6">
                {t(
                  'we_have_send_you_an_email_with_a_link_to_reset_your_password',
                  'We have send you an email with a link to reset your password.'
                )}
              </div>
              <p className="mt-4 text-sm">
                <Link href="/auth/login" className="underline cursor-pointer">
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
