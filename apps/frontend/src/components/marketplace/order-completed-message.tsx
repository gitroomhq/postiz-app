'use client';

import React, {FC} from 'react';

export const OrderCompleted: FC = () => {
    return (
        <div className="border border-customColor44 flex flex-col rounded-[6px] overflow-hidden">
            <div className="flex items-center bg-customColor8 px-[24px] py-[16px] text-[20px]">
                <div className="flex-1">Order completed</div>
            </div>
            <div className="py-[16px] px-[24px] flex flex-col gap-[20px] text-[18px]">
                The order has been completed
            </div>
        </div>
    );
};