'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ChangePasswordDto } from '@gitroom/nestjs-libraries/dtos/settings/change.password.dto';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
type Inputs = {
    oldPassword: string;
    password: string;
    repeatPassword: string;
};

export const ChangePassword = () => {
    const [loading, setLoading] = useState(false);
    const t = useT();
    const toaster = useToaster();
    const [state, setState] = useState(false);
    const resolver = useMemo(() => {
        return classValidatorResolver(ChangePasswordDto);
    }, []);
    const form = useForm<Inputs>({
        resolver,
        mode: 'onChange',
    });
    const fetchData = useFetch();
    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        setLoading(true);
        
        const response = await fetchData('/settings/change-password', {
            method: 'POST',
            body: JSON.stringify({
                ...data,
            }),
        });
        const change = await response.json();
        console.log(change);
        if (!change) {
            form.setError('password', {
                type: 'manual',
                message: t('password_change_failed', 'Your password change has failed. Please try again.'),
            });
            toaster.show('Password change failed', 'warning');
            setLoading(false);
            return false;
        }
        setState(true);
        setLoading(false);
    };
    return (
    <div className="flex flex-col">
        <h3 className="text-[20px]">{t('change_password', 'Change Password')}</h3>
        <FormProvider {...form}>
            <form>
                {!state ? (
                <>
                    <div className="space-y-4 text-textColor">
                    <Input
                        label="Old Password"
                        translationKey="label_old_password"
                        {...form.register('oldPassword')}
                        type="password"
                        placeholder={t('label_old_password', 'Password')}
                    />
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
                        <Button className="flex-1" loading={loading} onClick={form.handleSubmit(onSubmit)}>
                            {t('change_password', 'Change Password')}
                        </Button>
                    </div>
                    </div>
                </>
                ) : (
                <>
                    <div className="text-start mt-6">
                    {t(
                        'we_successfully_changed_your_password',
                        'We successfully changed your password'
                    )}
                    </div>
                </>
                )}
            </form>
        </FormProvider>
    </div>
  );
};
