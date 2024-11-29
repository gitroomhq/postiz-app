import React, {FC, useCallback} from 'react';
import {useFetch} from '@gitroom/helpers/utils/custom.fetch';
import {deleteDialog} from '@gitroom/react/helpers/delete.dialog';


export const OrderInProgress: FC<{ group: string; buyer: boolean, order: string }> = (
    props
) => {
    const {group, buyer, order} = props;
    const fetch = useFetch();

    const completeOrder = useCallback(async () => {
        if (await deleteDialog('Are you sure you want to pay the seller and end the order? this is irreversible action')) {
            await (
                await fetch(`/marketplace/offer/${order}/complete`, {
                    method: 'POST',
                })
            ).json();
        }
    }, [order]);

    return (
        <div className="flex gap-[10px]">
            {buyer && (
                <div onClick={completeOrder}
                     className="rounded-[34px] border-[1px] border-customColor21 !bg-sixth h-[28px] justify-center items-center text-[12px] px-[12px] flex font-[600] cursor-pointer">
                    Complete order and pay early
                </div>
            )}
            <div
                className="h-[28px] justify-center items-center bg-customColor42 text-[12px] px-[12px] flex rounded-[34px] font-[600]">
                Order in progress
            </div>
        </div>
    );
};