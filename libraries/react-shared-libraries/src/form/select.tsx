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
      {!!label && (
        <div className="text-[14px] text-pqMuted">
          <TranslatedLabel
            label={label}
            translationKey={translationKey}
            translationParams={translationParams}
          />
        </div>
      )}
      <select
        ref={ref}
        {...(disableForm ? {} : form.register(props.name, extraForm))}
        className={clsx(
          'h-[44px] rounded-[10px] border-0 bg-pqTableHeader px-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] transition-shadow focus:shadow-[inset_0_0_0_1px_var(--brand)]',
          className
        )}
        {...rest}
      />
      {!hideErrors && (
        <div className="text-[12px] text-red-400">{err || <>&nbsp;</>}</div>
      )}
    </div>
  );
});
