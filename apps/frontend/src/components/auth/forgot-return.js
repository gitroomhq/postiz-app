'use client';
import { __awaiter } from "tslib";
import { useForm, FormProvider } from 'react-hook-form';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import Link from 'next/link';
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { Input } from "../../../../../libraries/react-shared-libraries/src/form/input";
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotReturnPasswordDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/forgot-return.password.dto";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export function ForgotReturn({ token }) {
    const [loading, setLoading] = useState(false);
    const t = useT();
    const [state, setState] = useState(false);
    const resolver = useMemo(() => {
        return classValidatorResolver(ForgotReturnPasswordDto);
    }, []);
    const form = useForm({
        resolver,
        mode: 'onChange',
        defaultValues: {
            token,
        },
    });
    const fetchData = useFetch();
    const onSubmit = (data) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        const { reset } = yield (yield fetchData('/auth/forgot-return', {
            method: 'POST',
            body: JSON.stringify(Object.assign({}, data)),
        })).json();
        setState(true);
        if (!reset) {
            form.setError('password', {
                type: 'manual',
                message: t('password_reset_link_expired', 'Your password reset link has expired. Please try again.'),
            });
            return false;
        }
        setLoading(false);
    });
    return (<FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <h1 className="text-3xl font-bold text-start mb-4 cursor-pointer">
            {t('forgot_password_1', 'Forgot Password')}
          </h1>
        </div>
        {!state ? (<>
            <div className="space-y-4 text-textColor">
              <Input label="New Password" translationKey="label_new_password" {...form.register('password')} type="password" placeholder={t('label_password', 'Password')}/>
              <Input label="Repeat Password" translationKey="label_repeat_password" {...form.register('repeatPassword')} type="password" placeholder={t('label_repeat_password', 'Repeat Password')}/>
            </div>
            <div className="text-center mt-6">
              <div className="w-full flex">
                <Button type="submit" className="flex-1" loading={loading}>
                  {t('change_password', 'Change Password')}
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
              {t('we_successfully_reset_your_password_you_can_now_login_with_your', 'We successfully reset your password. You can now login with your')}
            </div>
            <p className="mt-4 text-sm">
              <Link href="/auth/login" className="underline cursor-pointer">
                {t('go_back_to_login', 'Go back to login')}
              </Link>
            </p>
          </>)}
      </form>
    </FormProvider>);
}
//# sourceMappingURL=forgot-return.js.map