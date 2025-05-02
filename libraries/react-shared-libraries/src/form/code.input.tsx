'use client';

import React, { FC, ReactNode, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import OtpInput from 'react-otp-input';
import interClass from '../helpers/inter.font';
import clsx from 'clsx';

export const CodeInput: FC<{
  name: string;
  label?: string;
  numDigits?: number;
  removeError?: boolean;
  error?: any;
  icon?: ReactNode;
}> = ({ name, label, numDigits = 6, removeError, error, icon }) => {
  const form = useFormContext();

  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[name]) return;
    return form?.formState?.errors?.[name]?.message! as string;
  }, [form?.formState?.errors?.[name]?.message, error]);

  return (
    <div className="flex flex-col gap-[6px] w-full items-center">
      {!!label && (
        <div className={clsx(interClass, 'text-[14px] w-full text-left')}>
          {label}
        </div>
      )}

      <Controller
        name={name}
        control={form.control}
        render={({ field: { onChange, value } }) => (
          <OtpInput
            value={value}
            onChange={onChange}
            numInputs={numDigits}
            inputType="tel"
            shouldAutoFocus
            renderSeparator={
              <span className="mx-1 text-inputText text-lg">-</span>
            }
            renderInput={(props) => (
              <input {...props} style={{ width: "2.2rem"}} />
            )}
            containerStyle="flex justify-center gap-[8px]"
            inputStyle={clsx(
              'bg-input text-inputText border border-fifth rounded-[6px] h-[48px] text-center text-[18px] font-mono outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary',
              err && 'border-red-500 focus:ring-red-500'
            )}
          />
        )}
      />

      {!removeError && (
        <div className="text-red-400 text-[12px] text-center mt-[4px]">
          {err || <>&nbsp;</>}
        </div>
      )}
    </div>
  );
};
