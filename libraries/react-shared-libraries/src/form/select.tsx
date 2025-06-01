'use client';

import {
  DetailedHTMLProps,
  FC,
  forwardRef,
  SelectHTMLAttributes,
  useMemo,
} from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import interClass from '../helpers/inter.font';
import { RegisterOptions } from 'react-hook-form/dist/types/validator';
import { TranslatedLabel } from '../translation/translated-label';

export const Select: FC<
  DetailedHTMLProps<
    SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  > & {
    error?: any;
    extraForm?: RegisterOptions<any>;
    disableForm?: boolean;
    label: string;
    name: string;
    hideErrors?: boolean;
    translationKey?: string;
    translationParams?: Record<string, string | number>;
  }
> = forwardRef((props, ref) => {
  const {
    label,
    className,
    hideErrors,
    disableForm,
    error,
    extraForm,
    translationKey,
    translationParams,
    ...rest
  } = props;
  const form = useFormContext();
  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[props?.name!]) return;
    return form?.formState?.errors?.[props?.name!]?.message! as string;
  }, [form?.formState?.errors?.[props?.name!]?.message, error]);
  return (
    <div className={clsx('flex flex-col', label ? 'gap-[6px]' : '')}>
      <div className={`${interClass} text-[14px]`}>
        <TranslatedLabel
          label={label}
          translationKey={translationKey}
          translationParams={translationParams}
        />
      </div>
      <select
        ref={ref}
        {...(disableForm ? {} : form.register(props.name, extraForm))}
        className={clsx(
          'bg-input h-[44px] px-[16px] outline-none border-fifth border rounded-[4px] text-inputText placeholder-inputText',
          className
        )}
        {...rest}
      />
      {!hideErrors && (
        <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
      )}
    </div>
  );
});
