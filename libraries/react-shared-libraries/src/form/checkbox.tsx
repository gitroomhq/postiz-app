'use client';
import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import { useFormContext, useWatch } from 'react-hook-form';

export const Checkbox: FC<{
  checked?: boolean;
  disableForm?: boolean;
  name?: string;
  className?: string;
  onChange?: (event: { target: { name?: string, value: boolean } }) => void;
}> = (props) => {
  const { checked, className, disableForm } = props;
  const form = useFormContext();
  const register = disableForm ? {} : form.register(props.name!);

  const watch = disableForm ? undefined : useWatch({
    name: props.name!,
  });

  const [currentStatus, setCurrentStatus] = useState(watch || checked);
  const changeStatus = useCallback(() => {
    setCurrentStatus(!currentStatus);
    props?.onChange?.({ target: { name: props.name!, value: !currentStatus } });
    if (!disableForm) {
      // @ts-ignore
      register?.onChange?.({ target: { name: props.name!, value: !currentStatus } });
    }
  }, [currentStatus]);

  return (
    <div
      {...register}
      onClick={changeStatus}
      className={clsx(
        'cursor-pointer rounded-[4px] select-none bg-forth w-[24px] h-[24px] flex justify-center items-center',
        className
      )}
    >
      {currentStatus && (
        <Image src="/form/checked.svg" alt="Checked" width={20} height={20} />
      )}
    </div>
  );
};
