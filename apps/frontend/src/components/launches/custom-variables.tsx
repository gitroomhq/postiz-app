'use client';

import {useModals} from '@mantine/modals';
import React, {FC, useCallback, useMemo} from 'react';
import {Input} from '@gitroom/react/form/input';
import {FieldValues, FormProvider, useForm} from 'react-hook-form';
import {Button} from '@gitroom/react/form/button';
import {TopTitle} from '@gitroom/frontend/components/launches/helpers/top.title.component';
import {object, string} from 'yup';
import {yupResolver} from '@hookform/resolvers/yup';
import CloseIcon from "@gitroom/frontend/components/icons/close";

const CustomVariables: FC<{
    variables: Array<{
        key: string;
        label: string;
        defaultValue?: string;
        validation: string;
        type: 'text' | 'password';
    }>;
    identifier: string;
    gotoUrl(url: string): void;
}> = (props) => {
    const {gotoUrl, identifier, variables} = props;
    const modals = useModals();
    const schema = useMemo(() => {
        return object({
            ...variables.reduce((aIcc, item) => {
                const splitter = item.validation.split('/');
                const regex = new RegExp(
                    splitter.slice(1, -1).join('/'),
                    splitter.pop()
                );
                return {
                    ...aIcc,
                    [item.key]: string()
                        .matches(regex, `${item.label} is invalid`)
                        .required(),
                };
            }, {}),
        });
    }, [variables]);

    const methods = useForm({
        mode: 'onChange',
        resolver: yupResolver(schema),
        values: variables.reduce(
            (acc, item) => ({
                ...acc,
                ...(item.defaultValue ? {[item.key]: item.defaultValue} : {}),
            }),
            {}
        ),
    });

    const submit = useCallback(
        async (data: FieldValues) => {
            gotoUrl(
                `/integrations/social/${identifier}?state=nostate&code=${Buffer.from(
                    JSON.stringify(data)
                ).toString('base64')}`
            );
        },
        [variables]
    );

    return (
        <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative">
            <TopTitle title={`Custom URL`}/>
            <button
                onClick={modals.closeAll}
                className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
                type="button"
            >
                <CloseIcon/>
            </button>
            <FormProvider {...methods}>
                <form
                    className="gap-[8px] flex flex-col pt-[10px]"
                    onSubmit={methods.handleSubmit(submit)}
                >
                    {variables.map((variable) => (
                        <div key={variable.key}>
                            <Input
                                label={variable.label}
                                name={variable.key}
                                type={variable.type == 'text' ? 'text' : 'password'}
                            />
                        </div>
                    ))}
                    <div>
                        <Button type="submit">Connect</Button>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
};

export default CustomVariables;