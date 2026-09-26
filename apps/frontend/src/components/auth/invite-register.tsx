'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';

// postmonster: closed access (PRD 6) - registration form for /auth/register?invite=TOKEN
type Inputs = {
  email: string;
  password: string;
  company: string;
  providerToken: string;
  provider: string;
  inviteToken: string;
};

export const InviteRegister = ({ token }: { token: string }) => {
  const t = useT();
  const fetch = useFetch();
  const router = useRouter();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [saving, setSaving] = useState(false);

  const resolver = useMemo(() => classValidatorResolver(CreateOrgUserDto), []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      email: '',
      password: '',
      company: '',
      providerToken: '',
      provider: 'LOCAL',
      inviteToken: token,
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setInviteError('');
    try {
      const response = await fetch(
        `/public/access-invites/${encodeURIComponent(token)}`
      );
      if (!response.ok) {
        setInviteError(
          t(
            'invite_invalid',
            'This invite link is invalid or has expired. Ask us to resend it, or request access below.'
          )
        );
        return;
      }
      const { email } = await response.json();
      setInviteEmail(email);
      form.setValue('email', email);
    } catch (e) {
      setInviteError(
        t('invite_check_failed', 'Could not check this invite link. Try again.')
      );
    } finally {
      setLoading(false);
    }
  }, [token, fetch, form, t]);

  useEffect(() => {
    load();
  }, []);

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setSaving(true);
    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          email: inviteEmail,
          inviteToken: token,
          datafast_visitor_id,
        }),
      });
      if (response.status === 200) {
        if (response.headers.get('activate') === 'true') {
          router.push('/auth/activate');
        } else {
          router.push('/auth/login');
        }
        return;
      }
      form.setError('password', {
        message: await response.text(),
      });
    } catch (e: any) {
      form.setError('password', {
        message:
          'General error: ' +
          e.toString() +
          '. Please check your browser console.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingComponent />;
  }

  if (inviteError) {
    return (
      <div className="flex flex-col flex-1 gap-[16px]">
        <h1 className="text-[28px] font-[500] -tracking-[0.6px] text-start">
          {t('invite_problem_title', 'This invite link is not valid')}
        </h1>
        <div className="text-[14px] opacity-80">{inviteError}</div>
        <a
          href="https://postmonster.xyz/request-access"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex"
        >
          <Button type="button" className="flex-1 rounded-[10px] !h-[52px]">
            {t('request_access', 'Request access')}
          </Button>
        </a>
        <p className="mt-2 text-sm">
          {t('already_have_an_account', 'Already Have An Account?')}&nbsp;
          <Link href="/auth/login" className="underline cursor-pointer">
            {t('sign_in', 'Sign In')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col flex-1">
          <div>
            <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start">
              {t('set_up_account', 'Set up your account')}
            </h1>
          </div>
          <div className="text-[14px] mt-[32px] mb-[12px] opacity-80">
            {t(
              'invite_form_hint',
              'Your early access invite is ready. Pick a password and a workspace name to get started.'
            )}
          </div>
          <div className="flex flex-col gap-[12px]">
            <div className="text-textColor">
              <Input
                label="Email"
                translationKey="label_email"
                {...form.register('email')}
                type="email"
                readOnly
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
              <Input
                label="Company"
                translationKey="label_company"
                {...form.register('company')}
                autoComplete="off"
                type="text"
                placeholder={t('label_company', 'Company')}
              />
            </div>
            <div className="text-[12px]">
              {t(
                'by_registering_you_agree_to_our',
                'By registering you agree to our'
              )}
              &nbsp;
              <a
                href={`https://postmonster.xyz/terms`}
                className="underline hover:font-bold"
                rel="nofollow"
              >
                {t('terms_of_service', 'Terms of Service')}
              </a>
              &nbsp;
              {t('and', 'and')}&nbsp;
              <a
                href={`https://postmonster.xyz/privacy`}
                rel="nofollow"
                className="underline hover:font-bold"
              >
                {t('privacy_policy', 'Privacy Policy')}
              </a>
              &nbsp;
            </div>
            <div className="text-center mt-6">
              <div className="w-full flex">
                <Button
                  type="submit"
                  className="flex-1 rounded-[10px] !h-[52px]"
                  loading={saving}
                >
                  {t('create_account', 'Create Account')}
                </Button>
              </div>
              <p className="mt-4 text-sm">
                {t('already_have_an_account', 'Already Have An Account?')}&nbsp;
                <Link href="/auth/login" className="underline cursor-pointer">
                  {t('sign_in', 'Sign In')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
