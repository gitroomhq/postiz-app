'use client';

import {
  DetailedHTMLProps, FC, InputHTMLAttributes, ReactNode, useEffect, useMemo
} from 'react';
import { clsx } from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
import interClass from '../helpers/inter.font';

export const Input: FC<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    removeError?: boolean;
    error?: any;
    disableForm?: boolean;
    customUpdate?: () => void;
    label: string;
    name: string;
    icon?: ReactNode;
    type: string;
  }
> = (props) => {
  const {
    label,
    icon,
    removeError,
    customUpdate,
    className,
    disableForm,
    error,
    type,
    ...rest
  } = props;
  const form = useFormContext();
  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[props?.name!]) return;
    return form?.formState?.errors?.[props?.name!]?.message! as string;
  }, [form?.formState?.errors?.[props?.name!]?.message, error]);

  const watch = customUpdate ? form?.watch(props.name) : null;
  useEffect(() => {
    if (customUpdate) {
      customUpdate();
    }
  }, [watch]);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return (
    <div className="flex flex-col gap-[6px]">
      {!!label && (<div className={`${interClass} text-[14px]`}>{label}</div>)}
      <div
        className={clsx(
          'bg-input h-[44px] border-fifth border rounded-[4px] text-inputText placeholder-inputText flex items-center justify-center',
          className
        )}
      >
        {icon && <div className="pl-[16px]">{icon}</div>}
        <input
          className={clsx(
            'h-full bg-transparent outline-none flex-1',
            icon ? 'pl-[8px] pr-[16px]' : 'px-[16px]'
          )}
          {...(disableForm ? {} : form.register(props.name))}
          {...form.register(props.type, {
            required: 'Email is required',
            pattern: {
              value: emailPattern,
              message: 'Please enter a valid email address'
            },
            setValueAs: (value) => value.trim()})
          }
          {...rest}
        />
      </div>
      {!removeError && (
        <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
      )}
    </div>
  );
};
