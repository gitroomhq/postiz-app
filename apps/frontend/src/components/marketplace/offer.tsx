'use client';

import React, {FC, useCallback, useMemo} from 'react';
import {Button} from '@gitroom/react/form/button';
import {useFetch} from '@gitroom/helpers/utils/custom.fetch';
import {SpecialMessageInterface} from "@gitroom/frontend/components/marketplace/types";

export const Offer: FC<{
    isCurrentOrder: boolean;
    isSellerOrBuyer: 'BUYER' | 'SELLER';
    orderStatus: string;
    data: SpecialMessageInterface;
}> = (props) => {
    const {data, isSellerOrBuyer, isCurrentOrder, orderStatus} = props;
    const fetch = useFetch();

    const acceptOrder = useCallback(async () => {
        const {url} = await (
            await fetch(`/marketplace/orders/${data.data.id}/payment`, {
                method: 'POST',
            })
        ).json();

        window.location.href = url;
    }, [data.data.id]);

    const totalPrice = useMemo(() => {
        return data?.data?.ordersItems?.reduce((all: any, current: any) => {
            return all + current.price * current.quantity;
        }, 0);
    }, [data?.data?.ordersItems]);
    return (
        <div className="border border-customColor44 flex flex-col rounded-[6px] overflow-hidden">
            <div className="flex items-center bg-customColor8 px-[24px] py-[16px] text-[20px]">
                <div className="flex-1">New Offer</div>
                <div className="text-customColor42">${totalPrice}</div>
            </div>
            <div className="py-[16px] px-[24px] flex flex-col gap-[20px]">
                <div className="text-inputText text-[12px]">Platform</div>
                {data.data.ordersItems.map((item: any) => (
                    <div
                        key={item.integration.id}
                        className="flex gap-[10px] items-center"
                    >
                        <div className="relative">
                            <img
                                src={item.integration.picture}
                                alt="platform"
                                className="w-[24px] h-[24px] rounded-full"
                            />
                            <img
                                className="absolute left-[15px] top-[15px] w-[15px] h-[15px] rounded-full"
                                src={`/icons/platforms/${item.integration.providerIdentifier}.png`}
                                alt={item.integration.name}
                            />
                        </div>
                        <div className="flex-1 text-[18px]">{item.integration.name}</div>
                        <div className="text-[18px]">{item.quantity} Posts</div>
                    </div>
                ))}
                {orderStatus === 'PENDING' &&
                    isCurrentOrder &&
                    isSellerOrBuyer === 'BUYER' && (
                        <div className="flex justify-end">
                            <Button
                                className="rounded-[4px] text-[14px]"
                                onClick={acceptOrder}
                            >
                                Pay & Accept Offer
                            </Button>
                        </div>
                    )}
                {orderStatus === 'ACCEPTED' && (
                    <div className="flex justify-end">
                        <Button
                            className="rounded-[4px] text-[14px] border border-tableBorder !bg-sixth text-tableBorder">
                            Accepted
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};