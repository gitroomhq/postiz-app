"use client";
import {FC, useCallback, useState} from "react";
import clsx from "clsx";
import Image from "next/image";

export const Checkbox: FC<{checked: boolean, className?: string, onChange?: (event: {target: {value: string}}) => void}> = (props) => {
    const {checked, className} = props;
    const [currentStatus, setCurrentStatus] = useState(checked);
    const changeStatus = useCallback(() => {
        setCurrentStatus(!currentStatus);
        props?.onChange?.({target: {value: `${!currentStatus}`}});
    }, [currentStatus]);

    return (
        <div onClick={changeStatus} className={clsx("cursor-pointer rounded-[4px] select-none bg-forth w-[24px] h-[24px] flex justify-center items-center", className)}>
            {currentStatus && <Image src="/form/checked.svg" alt="Checked" width={20} height={20} />}
        </div>
    )
}