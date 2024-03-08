"use client";

import {FC, useCallback} from "react";
import clsx from "clsx";

export const Slider: FC<{value: 'on' | 'off', onChange: (value: 'on' | 'off') => void}> = (props) => {
    const {value, onChange} = props;
    const change = useCallback(() => {
        onChange(value === 'on' ? 'off' : 'on');
    }, [value]);

    return (
        <div className="w-[57px] h-[32px] p-[4px] border-fifth border rounded-[100px]" onClick={change}>
            <div className="w-full h-full relative rounded-[100px]">
                <div className={clsx("absolute left-0 top-0 w-[24px] h-[24px] bg-[#E9E9F1] rounded-full transition-all cursor-pointer", value === 'on' ? 'left-[100%] -translate-x-[100%]' : 'left-0')} />
            </div>
        </div>
    )
}