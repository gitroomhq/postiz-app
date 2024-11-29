'use client';

import React, { FC, useCallback, useContext, useMemo } from 'react';
import {SpecialMessageInterface} from "@gitroom/frontend/components/marketplace/types";


export const Published: FC<{
    isCurrentOrder: boolean;
    isSellerOrBuyer: 'BUYER' | 'SELLER';
    orderStatus: string;
    data: SpecialMessageInterface;
}> = (props) => {
    const { data, isSellerOrBuyer } = props;
    return (
        <div className="border border-customColor44 flex flex-col rounded-[6px] overflow-hidden">
            <div className="flex items-center bg-customColor8 px-[24px] py-[16px] text-[20px]">
                <div className="flex-1">
                    {isSellerOrBuyer === 'BUYER' ? 'Your' : 'The'} post has been published
                </div>
            </div>

            <div className="py-[16px] px-[24px] flex flex-col gap-[20px]">
                <div className="flex gap-[20px]">
                    <div className="relative">
                        <img
                            src={data.data.picture}
                            alt="platform"
                            className="w-[24px] h-[24px] rounded-full"
                        />
                        <img
                            className="absolute left-[15px] top-[15px] w-[15px] h-[15px] rounded-full"
                            src={`/icons/platforms/${data.data.integration}.png`}
                            alt={data.data.name}
                        />
                    </div>

                    <div className="flex-1 text-[18px]">{data.data.name}</div>
                </div>
                <div className="text-[14px]">
                    URL:{' '}
                    <a className="underline hover:font-bold" href={data.data.url}>
                        {data.data.url}
                    </a>
                </div>
            </div>
        </div>
    );
};
