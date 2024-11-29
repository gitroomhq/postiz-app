'use client';

import React, {FC, useCallback} from 'react';
import {Button} from '@gitroom/react/form/button';
import {useFetch} from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import {capitalize} from 'lodash';
import removeMd from 'remove-markdown';
import {deleteDialog} from '@gitroom/react/helpers/delete.dialog';
import {useModals} from '@mantine/modals';
import {IntegrationContext} from '@gitroom/frontend/components/launches/helpers/use.integration';
import dayjs from 'dayjs';
import {SpecialMessageInterface} from "@gitroom/frontend/components/marketplace/types";
import {PreviewPopup} from "@gitroom/frontend/components/marketplace/preview-popup";


export const Post: FC<{
    isCurrentOrder: boolean;
    isSellerOrBuyer: 'BUYER' | 'SELLER';
    orderStatus: string;
    message: string;
    data: SpecialMessageInterface;
}> = (props) => {
    const {data, isSellerOrBuyer, message, isCurrentOrder, orderStatus} = props;
    const fetch = useFetch();
    const modal = useModals();

    const getIntegration = useCallback(async () => {
        return (
            await fetch(
                `/integrations/${data.data.integration}?order=${data.data.id}`,
                {
                    method: 'GET',
                }
            )
        ).json();
    }, []);

    const requestRevision = useCallback(async () => {
        if (
            !(await deleteDialog(
                'Are you sure you want to request a revision?',
                'Yes'
            ))
        ) {
            return;
        }

        await fetch(`/marketplace/posts/${data.data.postId}/revision`, {
            method: 'POST',
            body: JSON.stringify({
                message,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }, [data]);

    const requestApproved = useCallback(async () => {
        if (
            !(await deleteDialog(
                'Are you sure you want to approve this post?',
                'Yes'
            ))
        ) {
            return;
        }

        await fetch(`/marketplace/posts/${data.data.postId}/approve`, {
            method: 'POST',
            body: JSON.stringify({
                message,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }, [data]);

    const preview = useCallback(async () => {
        const post = await (
            await fetch(`/marketplace/posts/${data.data.postId}`)
        ).json();

        const integration = await getIntegration();

        modal.openModal({
            classNames: {
                modal: 'bg-transparent text-textColor',
            },
            size: 'auto',
            withCloseButton: false,
            children: (
                <IntegrationContext.Provider
                    value={{
                        date: dayjs(),
                        integration,
                        value: [],
                    }}
                >
                    <PreviewPopup
                        providerId={post?.providerId!}
                        post={post}
                        postId={data?.data?.postId!}
                    />
                </IntegrationContext.Provider>
            ),
        });
    }, [data?.data]);

    const {data: integrationData} = useSWR<{
        id: string;
        name: string;
        picture: string;
        providerIdentifier: string;
    }>(`/integrations/${data.data.integration}`, getIntegration);

    return (
        <div className="border border-customColor44 flex flex-col rounded-[6px] overflow-hidden">
            <div className="flex items-center bg-customColor8 px-[24px] py-[16px] text-[20px]">
                <div className="flex-1">
                    Post Draft {capitalize(integrationData?.providerIdentifier || '')}
                </div>
            </div>
            <div className="py-[16px] px-[24px] flex gap-[20px]">
                <div>
                    <div className="relative">
                        <img
                            src={integrationData?.picture}
                            alt="platform"
                            className="w-[24px] h-[24px] rounded-full"
                        />
                        <img
                            className="absolute left-[15px] top-[15px] w-[15px] h-[15px] rounded-full"
                            src={`/icons/platforms/${integrationData?.providerIdentifier}.png`}
                            alt={integrationData?.name}
                        />
                    </div>
                </div>
                <div className="flex flex-1 flex-col text-[16px] gap-[2px]">
                    <div className="text-[18px]">{integrationData?.name}</div>
                    <div>{removeMd(data.data.description)}</div>
                    {isSellerOrBuyer === 'BUYER' &&
                        isCurrentOrder &&
                        data.data.status === 'PENDING' &&
                        orderStatus === 'ACCEPTED' && (
                            <div className="mt-[18px] flex gap-[10px] justify-end">
                                <Button
                                    onClick={requestRevision}
                                    className="rounded-[4px] text-[14px] border-[2px] border-customColor21 !bg-sixth"
                                >
                                    Revision Needed
                                </Button>
                                <Button
                                    onClick={requestApproved}
                                    className="rounded-[4px] text-[14px] border-[2px] border-customColor21 !bg-sixth"
                                >
                                    Approve
                                </Button>
                                <Button className="rounded-[4px]" onClick={preview}>
                                    Preview
                                </Button>
                            </div>
                        )}

                    {data.data.status === 'REVISION' && (
                        <div className="flex justify-end">
                            <Button
                                className="rounded-[4px] text-[14px] border border-tableBorder !bg-sixth text-tableBorder">
                                Revision Requested
                            </Button>
                        </div>
                    )}
                    {data.data.status === 'APPROVED' && (
                        <div className="flex justify-end gap-[10px]">
                            <Button
                                className="rounded-[4px] text-[14px] border border-tableBorder !bg-sixth text-tableBorder">
                                ACCEPTED
                            </Button>
                        </div>
                    )}

                    {data.data.status === 'CANCELED' && (
                        <div className="flex justify-end gap-[10px]">
                            <Button
                                className="rounded-[4px] text-[14px] border border-tableBorder !bg-sixth text-tableBorder">
                                Cancelled by the seller
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};