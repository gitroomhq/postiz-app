'use client';

import 'react-phone-number-input/style.css'
import './phone.input.scss';
import {
  DetailedHTMLProps,
  FC,
  InputHTMLAttributes,
  ReactNode,
  useMemo,
} from 'react';
import { clsx } from 'clsx';
import PhoneInputtt from 'react-phone-number-input'
import { useFormContext, Controller } from 'react-hook-form';
import interClass from '../helpers/inter.font';


export const PhoneInput: FC<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    removeError?: boolean;
    error?: any;
    disableForm?: boolean;
    label: string;
    name: string;
    icon?: ReactNode;
  }
> = ({
  label,
  icon,
  removeError,
  className,
  disableForm,
  error,
  name,
  ...rest
}) => {
  const form = useFormContext();

  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[name]) return;
    return form?.formState?.errors?.[name]?.message! as string;
  }, [form?.formState?.errors?.[name]?.message, error]);

  return (
    <div className="flex flex-col gap-[6px]">
      {!!label && (<div className={`${interClass} text-[14px]`}>{label}</div>)}

      <div
        className={clsx(
          'bg-input h-[44px] border border-fifth rounded-[4px] text-inputText placeholder-inputText flex items-center justify-center',
          className
        )}
      >
        {icon && <div className="pl-[16px]">{icon}</div>}

        <Controller
          name={name}
          control={form.control}
          render={({ field: { onChange, value } }) => (
              <PhoneInputtt
                placeholder="Enter phone number"
                value={value}
                international={false}
                onChange={(num) => onChange(num)}
                className="phone-input-wrapper"
              />
          )}
        />
      </div>

      {!removeError && (
        <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
      )}
    </div>
  );
};
