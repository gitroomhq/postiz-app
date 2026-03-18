'use client';
import { __awaiter } from "tslib";
import { useForm, FormProvider } from 'react-hook-form';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import Link from 'next/link';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotPasswordDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/forgot.password.dto";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export function Forgot() {
    const t = useT();
    const [loading, setLoading] = useState(false);
    const [state, setState] = useState(false);
    const resolver = useMemo(() => {
        return classValidatorResolver(ForgotPasswordDto);
    }, []);
    const form = useForm({
        resolver,
    });
    const fetchData = useFetch();
    const onSubmit = (data) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        yield fetchData('/auth/forgot', {
            method: 'POST',
            body: JSON.stringify(Object.assign(Object.assign({}, data), { provider: 'LOCAL' })),
        });
        setState(true);
        setLoading(false);
    });
    return (<div className="flex flex-1 flex-col">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <h1 className="text-3xl font-bold text-start mb-4 cursor-pointer">
              {t('forgot_password_1', 'Forgot Password')}
            </h1>
          </div>
          {!state ? (<>
              <div className="space-y-4 text-textColor">
                <Input label="Email" translationKey="label_email" {...form.register('email')} type="email" placeholder={t('email_address', 'Email Address')}/>
              </div>
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button type="submit" className="flex-1 !h-[52px] !rounded-[10px]" loading={loading}>
                    {t('send_password_reset_email', 'Send Password Reset Email')}
                  </Button>
                </div>
                <p className="mt-4 text-sm">
                  <Link href="/auth/login" className="underline cursor-pointer">
                    {t('go_back_to_login', 'Go back to login')}
                  </Link>
                </p>
              </div>
            </>) : (<>
              <div className="text-start mt-6">
                {t('we_have_send_you_an_email_with_a_link_to_reset_your_password', 'We have send you an email with a link to reset your password.')}
              </div>
              <p className="mt-4 text-sm">
                <Link href="/auth/login" className="underline cursor-pointer">
                  {t('go_back_to_login', 'Go back to login')}
                </Link>
              </p>
            </>)}
        </form>
      </FormProvider>
    </div>);
}
//# sourceMappingURL=forgot.js.map