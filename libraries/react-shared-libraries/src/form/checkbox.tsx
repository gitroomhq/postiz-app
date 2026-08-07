'use client';

import { forwardRef, useCallback } from 'react';
import clsx from 'clsx';
import { useFormContext } from 'react-hook-form';

/**
 * Checkbox face is always light (`--onBrand` / white) with a brand tick when
 * on. A filled brand square (old `bg-forth`) reads as “mystery block”, not a
 * control — owner feedback 2026-08-06.
 */
export const Checkbox = forwardRef<
  null,
  {
    checked?: boolean;
    disableForm?: boolean;
    name?: string;
    className?: string;
    label?: string;
    onChange?: (event: {
      target: {
        name?: string;
        value: boolean;
      };
    }) => void;
    /** Kept for callers; both variants share the same face treatment. */
    variant?: 'default' | 'hollow';
  }
>((props, ref: any) => {
  const { checked, className, label, disableForm } = props;
  const form = useFormContext();
  const watch = disableForm ? undefined : form.watch(props.name!);
  // `watch || checked` treated `false` as missing and flipped state wrongly.
  const val = !!(disableForm ? checked : watch ?? checked);

  const changeStatus = useCallback(() => {
    const next = !val;
    props?.onChange?.({
      target: {
        name: props.name!,
        value: next,
      },
    });
    if (!disableForm && props.name) {
      form.setValue(props.name, next, { shouldDirty: true, shouldTouch: true });
    }
  }, [val, disableForm, props, form]);

  return (
    <div className="flex items-center gap-[10px]">
      <div
        ref={ref}
        role="checkbox"
        aria-checked={val}
        onClick={changeStatus}
        className={clsx(
          'flex h-[18px] w-[18px] shrink-0 cursor-pointer select-none items-center justify-center rounded-[5px] bg-pqOnBrand text-pqBrand shadow-[inset_0_0_0_1px_var(--border)] transition-colors',
          className
        )}
      >
        {val && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      {!!label && (
        <div
          className="cursor-pointer text-[14px] text-pqText"
          onClick={changeStatus}
        >
          {label}
        </div>
      )}
    </div>
  );
});
