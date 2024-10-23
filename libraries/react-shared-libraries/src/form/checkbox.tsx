'use client';
import { FC, forwardRef, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';

import { ReactComponent as CheckSvg } from '../../../../apps/frontend/src/assets/checkmark.svg';

export const Checkbox = forwardRef<
  null,
  {
    checked?: boolean;
    disableForm?: boolean;
    name?: string;
    className?: string;
    label?: string;
    onChange?: (event: { target: { name?: string; value: boolean } }) => void;
    variant?: 'default' | 'hollow';
  }
>((props, ref: any) => {
  const { checked, className, label, disableForm, variant } = props;
  const form = useFormContext();
  const register = disableForm ? {} : form.register(props.name!);

  const watch = disableForm
    ? undefined
    : useWatch({
        name: props.name!,
      });

  const [currentStatus, setCurrentStatus] = useState(watch || checked);
  const changeStatus = useCallback(() => {
    setCurrentStatus(!currentStatus);
    props?.onChange?.({ target: { name: props.name!, value: !currentStatus } });
    if (!disableForm) {
      // @ts-ignore
      register?.onChange?.({
        target: { name: props.name!, value: !currentStatus },
      });
    }
  }, [currentStatus]);

  return (
    <div className="flex gap-[10px]">
      <div
        ref={ref}
        {...register}
        onClick={changeStatus}
        className={clsx(
          'cursor-pointer rounded-[4px] select-none w-[24px] h-[24px] justify-center items-center flex',
          variant === 'default' || !variant
            ? 'bg-forth'
            : 'border-customColor1 border-2 bg-customColor2',
          className
        )}
      >
        {currentStatus && (
          <div>
            <CheckSvg />
          </div>
        )}
      </div>
      {!!label && <div>{label}</div>}
    </div>
  );
});
