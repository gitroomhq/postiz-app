'use client';

import { FC, useMemo } from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import { TranslatedLabel } from '../translation/translated-label';

export interface MultiSelectOption {
  label: string;
  value: string | number;
}

// Controlled multi-select primitive: renders a scrollable checkbox list and
// reports the full selected array via `onChange`. Selection state is owned by
// the caller (pair it with react-hook-form's `setValue`), keeping this purely
// presentational so any provider/form can reuse it.
export const MultiSelect: FC<{
  label: string;
  name?: string;
  options: MultiSelectOption[];
  value: Array<string | number>;
  onChange: (value: Array<string | number>) => void;
  className?: string;
  error?: any;
  hideErrors?: boolean;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
}> = (props) => {
  const {
    label,
    name,
    options,
    value,
    onChange,
    className,
    error,
    hideErrors,
    translationKey,
    translationParams,
  } = props;
  const form = useFormContext();
  const err = useMemo(() => {
    if (error) return error;
    if (!form || !name || !form.formState.errors[name]) return;
    return form?.formState?.errors?.[name]?.message as string;
  }, [form?.formState?.errors?.[name!]?.message, error, name]);

  const isSelected = (optionValue: string | number) =>
    value.some((current) => String(current) === String(optionValue));

  const toggle = (optionValue: string | number) => {
    const next = isSelected(optionValue)
      ? value.filter((current) => String(current) !== String(optionValue))
      : [...value, optionValue];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="text-[14px]">
        <TranslatedLabel
          label={label}
          translationKey={translationKey}
          translationParams={translationParams}
        />
      </div>
      <div
        className={clsx(
          'bg-newBgColorInner border border-newTableBorder rounded-[8px] max-h-[160px] overflow-auto p-[12px] flex flex-col gap-[8px]',
          className
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-[8px] cursor-pointer text-[14px]"
          >
            <input
              type="checkbox"
              checked={isSelected(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {!hideErrors && (
        <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
      )}
    </div>
  );
};
