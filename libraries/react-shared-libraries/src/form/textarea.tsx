'use client';

import { DetailedHTMLProps, FC, InputHTMLAttributes, useMemo } from 'react';
import clsx from 'clsx';
import { useFormContext } from 'react-hook-form';
import { TranslatedLabel } from '../translation/translated-label';

export const Textarea: FC<
  DetailedHTMLProps<
    InputHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  > & {
    error?: any;
    disableForm?: boolean;
    label: string;
    name: string;
    translationKey?: string;
    translationParams?: Record<string, string | number>;
  }
> = (props) => {
  const {
    label,
    className,
    disableForm,
    error,
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
    <div
      className={clsx(
        'flex flex-col gap-[6px]',
        props.disabled && 'opacity-50'
      )}
    >
      {!!label && (
        <div className="text-[14px] text-pqMuted">
          <TranslatedLabel
            label={label}
            translationKey={translationKey}
            translationParams={translationParams}
          />
        </div>
      )}
      <textarea
        {...(disableForm ? {} : form.register(props.name))}
        className={clsx(
          'min-h-[110px] resize-y rounded-[10px] border-0 bg-pqTableHeader p-[10px_12px] text-[14px] leading-[1.55] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] transition-shadow placeholder:text-pqSoft focus:shadow-[inset_0_0_0_1px_var(--brand)]',
          className
        )}
        {...rest}
      />
      <div className="text-[12px] text-red-400">{err || <>&nbsp;</>}</div>
    </div>
  );
};
