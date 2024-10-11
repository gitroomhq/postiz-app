'use client';

import { DetailedHTMLProps, FC, InputHTMLAttributes, useMemo } from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import interClass from '../helpers/inter.font';
import { RegisterOptions } from 'react-hook-form/dist/types/validator';

export const Checkbox: FC<
  DetailedHTMLProps<
    InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > & {
    error?: any;
    extraForm?: RegisterOptions<any>;
    disableForm?: boolean;
    label: string;
    name: string;
    hideErrors?: boolean;
  }
> = (props) => {
  const {
    label,
    className,
    hideErrors,
    disableForm,
    error,
    extraForm,
    name,
    ...rest
  } = props;
  const form = useFormContext();

  return (
    <div className={clsx("flex flex-col", label ? 'gap-[6px]' : '')}>
      <label className="flex items-center gap-[8px]">
        <input
          type="checkbox"
          {...(disableForm ? {} : form.register(name, extraForm))}
          className={clsx(
            'bg-input outline-none border-fifth border rounded-[4px]',
            className
          )}
          {...rest}
        />
        <span className={`${interClass} text-[14px]`}>{label}</span>
      </label>
    </div>
  );
};