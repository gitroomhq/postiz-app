'use client';

import {
  DetailedHTMLProps,
  forwardRef,
  SelectHTMLAttributes,
  useMemo,
} from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import { RegisterOptions } from 'react-hook-form/dist/types/validator';
import { TranslatedLabel } from '../translation/translated-label';

export type SelectProps = DetailedHTMLProps<
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
  /** Narrow control for short option lists (Yes/No). */
  compact?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (props, ref) => {
    const {
      label,
      className,
      hideErrors,
      disableForm,
      error,
      extraForm,
      translationKey,
      translationParams,
      compact,
      name,
      ...rest
    } = props;
    const form = useFormContext();
    const err = useMemo(() => {
      if (error) return error;
      if (!form || !form.formState.errors[name]) return;
      return form?.formState?.errors?.[name]?.message! as string;
    }, [form?.formState?.errors?.[name]?.message, error, name]);
    return (
      <div
        className={clsx(
          'flex flex-col',
          label ? 'gap-[5px]' : '',
          compact && 'max-w-[220px]'
        )}
      >
        {!!label && (
          <div className="text-[13px] font-[500] text-pqMuted">
            <TranslatedLabel
              label={label}
              translationKey={translationKey}
              translationParams={translationParams}
            />
          </div>
        )}
        <div className="relative">
          <select
            ref={ref}
            {...(disableForm ? {} : form.register(name, extraForm))}
            className={clsx(
              // Native arrow replaced — OS chevrons look broken on dark fills.
              'h-[40px] w-full appearance-none rounded-[10px] border-0 bg-pqTableHeader pe-[36px] ps-[12px] text-[14px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] transition-shadow focus:shadow-[inset_0_0_0_1px_var(--brand)]',
              className
            )}
            {...rest}
          />
          <svg
            viewBox="0 0 12 12"
            width="12"
            height="12"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute end-[12px] top-1/2 -translate-y-1/2 text-pqSoft"
          >
            <path
              d="M3 4.5 6 7.5 9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {!hideErrors && err ? (
          <div className="text-[12px] text-pqDanger">{err}</div>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';
