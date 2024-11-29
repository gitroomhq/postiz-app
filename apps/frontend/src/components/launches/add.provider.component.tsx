'use client';

import {useModals} from '@mantine/modals';
import React, {FC, useCallback} from 'react';
import {useFetch} from '@gitroom/helpers/utils/custom.fetch';
import {classValidatorResolver} from '@hookform/resolvers/class-validator';
import {ApiKeyDto} from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import {useRouter} from 'next/navigation';
import {TopTitle} from '@gitroom/frontend/components/launches/helpers/top.title.component';
import {useVariables} from '@gitroom/react/helpers/variable.context';
import {useToaster} from '@gitroom/react/toaster/toaster';
import ApiModal from "@gitroom/frontend/components/launches/modal/api-modal";
import UrlModal from "@gitroom/frontend/components/launches/modal/url-modal";
import CloseIcon from "@gitroom/frontend/components/icons/close";
import CustomVariables from "@gitroom/frontend/components/launches/custom-variables";

const resolver = classValidatorResolver(ApiKeyDto);

export const AddProviderComponent: FC<{
    social: Array<{
        identifier: string;
        name: string;
        isExternal: boolean;
        customFields?: Array<{
            key: string;
            label: string;
            validation: string;
            type: 'text' | 'password';
        }>;
    }>;
    article: Array<{ identifier: string; name: string }>;
    update?: () => void;
}> = (props) => {
    const {update, social, article} = props;
    const {isGeneral} = useVariables();
    const toaster = useToaster();
    const router = useRouter();
    const fetch = useFetch();
    const modal = useModals();

    const fetchIntegrationUrl = async (identifier: string, externalUrl?: string) => {
        const { url, err } = await (
            await fetch(
                `/integrations/social/${identifier}${externalUrl ? `?externalUrl=${externalUrl}` : ``}`
            )
        ).json();

        if (err) {
            toaster.show('Could not connect to the platform', 'warning');
            return null;
        }
        return url;
    };

    const openUrlModal = (gotoIntegration: (externalUrl?: string) => Promise<void>) => {
        modal.closeAll();
        modal.openModal({
            title: '',
            withCloseButton: false,
            classNames: {
                modal: 'bg-transparent text-textColor',
            },
            children: <UrlModal gotoUrl={gotoIntegration} />,
        });
    };

    const openCustomVariablesModal = (
        identifier: string,
        customFields: Array<{
            key: string;
            label: string;
            validation: string;
            defaultValue?: string;
            type: 'text' | 'password';
        }>
    ) => {
        modal.closeAll();
        modal.openModal({
            title: '',
            withCloseButton: false,
            classNames: {
                modal: 'bg-transparent text-textColor',
            },
            children: (
                <CustomVariables
                    identifier={identifier}
                    gotoUrl={(url: string) => router.push(url)}
                    variables={customFields}
                />
            ),
        });
    };

    const getSocialLink = useCallback(
        (
            identifier: string,
            isExternal: boolean,
            customFields?: Array<{
                key: string;
                label: string;
                validation: string;
                defaultValue?: string;
                type: 'text' | 'password';
            }>
        ) =>
            async () => {
                const gotoIntegration = async (externalUrl?: string) => {
                    const url = await fetchIntegrationUrl(identifier, externalUrl);
                    if (url) {
                        window.location.href = url;
                    }
                };

                if (isExternal) {
                    openUrlModal(gotoIntegration);
                    return;
                }

                if (customFields) {
                    openCustomVariablesModal(identifier, customFields);
                    return;
                }

                await gotoIntegration();
            },
        []
    );


    const close = useCallback(() => {
        modal.closeAll();
    }, []);

    const showApiButton = useCallback(
        (identifier: string, name: string) => async () => {
            modal.openModal({
                title: '',
                withCloseButton: false,
                classNames: {
                    modal: 'bg-transparent text-textColor',
                },
                children: (
                    <ApiModal update={update} name={name} identifier={identifier}/>
                ),
            });
        },
        []
    );
    return (
        <div
            className="w-full flex flex-col gap-[20px] rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative">
            <div className="flex flex-col">
                <TopTitle title="Add Channel"/>
                <button
                    onClick={close}
                    className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
                    type="button"
                >
                    <CloseIcon/>
                </button>
                <h2 className="pt-[16px] pb-[10px]">Social</h2>
                <div className="grid grid-cols-3 gap-[10px] justify-items-center justify-center">
                    {social.map((item) => (
                        <div
                            key={item.identifier}
                            onClick={getSocialLink(
                                item.identifier,
                                item.isExternal,
                                item.customFields
                            )}
                            className={
                                'w-[120px] h-[100px] bg-input text-textColor justify-center items-center flex flex-col gap-[10px] cursor-pointer'
                            }
                        >
                            <div>
                                {item.identifier === 'youtube' ? (
                                    <img src={`/icons/platforms/youtube.svg`}/>
                                ) : (
                                    <img
                                        className="w-[32px] h-[32px] rounded-full"
                                        src={`/icons/platforms/${item.identifier}.png`}
                                    />
                                )}
                            </div>
                            <div>{item.name}</div>
                        </div>
                    ))}
                </div>
            </div>
            {!isGeneral && (
                <div className="flex flex-col">
                    <h2 className="pb-[10px]">Articles</h2>
                    <div className="grid grid-cols-3 gap-[10px]">
                        {article.map((item) => (
                            <div
                                key={item.identifier}
                                onClick={showApiButton(item.identifier, item.name)}
                                className="w-[120px] h-[100px] bg-input text-textColor justify-center items-center flex flex-col gap-[10px] cursor-pointer"
                            >
                                <div>
                                    <img
                                        className="w-[32px] h-[32px] rounded-full"
                                        src={`/icons/platforms/${item.identifier}.png`}
                                    />
                                </div>
                                <div>{item.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
