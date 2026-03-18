'use client';
import { __awaiter } from "tslib";
import { useForm, FormProvider } from 'react-hook-form';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import Link from 'next/link';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/login.user.dto";
import { GithubProvider } from "./providers/github.provider";
import { OauthProvider } from "./providers/oauth.provider";
import { GoogleProvider } from "./providers/google.provider";
import { useVariables } from "../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import { FarcasterProvider } from "./providers/farcaster.provider";
import WalletProvider from "./providers/wallet.provider";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export function Login() {
    const t = useT();
    const [loading, setLoading] = useState(false);
    const [notActivated, setNotActivated] = useState(false);
    const { isGeneral, neynarClientId, billingEnabled, genericOauth } = useVariables();
    const resolver = useMemo(() => {
        return classValidatorResolver(LoginUserDto);
    }, []);
    const form = useForm({
        resolver,
        defaultValues: {
            providerToken: '',
            provider: 'LOCAL',
        },
    });
    const fetchData = useFetch();
    const onSubmit = (data) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        setNotActivated(false);
        const login = yield fetchData('/auth/login', {
            method: 'POST',
            body: JSON.stringify(Object.assign(Object.assign({}, data), { provider: 'LOCAL' })),
        });
        if (login.status === 400) {
            const errorMessage = yield login.text();
            if (errorMessage === 'User is not activated') {
                setNotActivated(true);
            }
            else {
                form.setError('email', {
                    message: errorMessage,
                });
            }
            setLoading(false);
        }
    });
    return (<FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col flex-1">
          <div>
            <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start cursor-pointer">
              {t('sign_in', 'Sign In')}
            </h1>
          </div>
          <div className="text-[14px] mt-[32px] mb-[12px]">
            {t('continue_with', 'Continue With')}
          </div>
          <div className="flex flex-col">
            {isGeneral && genericOauth ? (<OauthProvider />) : !isGeneral ? (<GithubProvider />) : (<div className="gap-[8px] flex">
                <GoogleProvider />
                {!!neynarClientId && <FarcasterProvider />}
                {billingEnabled && <WalletProvider />}
              </div>)}
            <div className="h-[20px] mb-[24px] mt-[24px] relative">
              <div className="absolute w-full h-[1px] bg-fifth top-[50%] -translate-y-[50%]"/>
              <div className={`absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex`}>
                <div className="px-[16px]">{t('or', 'or')}</div>
              </div>
            </div>
            <div className="flex flex-col gap-[12px]">
              <div className="text-textColor">
                <Input label="Email" translationKey="label_email" {...form.register('email')} type="email" placeholder={t('email_address', 'Email Address')}/>
                <Input label="Password" translationKey="label_password" {...form.register('password')} autoComplete="off" type="password" placeholder={t('label_password', 'Password')}/>
              </div>
              {notActivated && (<div className="bg-amber-500/10 border border-amber-500/30 rounded-[10px] p-4 mb-4">
                  <p className="text-amber-400 text-sm mb-2">
                    {t('account_not_activated', 'Your account is not activated yet. Please check your email for the activation link.')}
                  </p>
                  <Link href="/auth/activate" className="text-amber-400 underline hover:font-bold text-sm">
                    {t('resend_activation_email', 'Resend Activation Email')}
                  </Link>
                </div>)}
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button type="submit" className="flex-1 rounded-[10px] !h-[52px]" loading={loading}>
                    {t('sign_in_1', 'Sign in')}
                  </Button>
                </div>
                <p className="mt-4 text-sm">
                  {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                  <Link href="/auth" className="underline cursor-pointer">
                    {t('sign_up', 'Sign Up')}
                  </Link>
                </p>
                <p className="mt-4 text-sm">
                  <Link href="/auth/forgot" className="underline hover:font-bold cursor-pointer">
                    {t('forgot_password', 'Forgot password')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>);
}
//# sourceMappingURL=login.js.map