'use client';
import { FC, forwardRef, useCallback, useState } from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import { useFormContext, useWatch } from 'react-hook-form';

export const Checkbox = forwardRef<null, {
  checked?: boolean;
  disableForm?: boolean;
  name?: string;
  className?: string;
  onChange?: (event: { target: { name?: string, value: boolean } }) => void;
  variant?: 'default' | 'hollow';
}>((props, ref: any) => {
  const { checked, className, disableForm, variant } = props;
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
      ref={ref}
      {...register}
      onClick={changeStatus}
      className={clsx(
        'cursor-pointer rounded-[4px] select-none w-[24px] h-[24px] justify-center items-center flex',
        variant === 'default' || !variant ? ('bg-forth') : ('border-customColor1 border-2 bg-customColor2'),
        className
      )}
    >
      {currentStatus && (
          <div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
       )}
    </div>
  );
});
