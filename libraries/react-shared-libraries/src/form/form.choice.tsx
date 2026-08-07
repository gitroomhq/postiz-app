'use client';

import { FC, useEffect } from 'react';
import { clsx } from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
import { TranslatedLabel } from '../translation/translated-label';

/**
 * Compact Yes/No (or any 2–4 option) control for settings forms — avoids
 * full-width native selects for short labels.
 * Pill styling matches metric.component.tsx date-metric segmented buttons.
 */
export const FormChoice: FC<{
  name: string;
  label: string;
  translationKey?: string;
  options: { label: string; value: string | boolean }[];
}> = ({ name, label, translationKey, options }) => {
  const form = useFormContext();
  // Keep the field registered so RHF submit/validation include it even if
  // the user never clicks (defaults from useForm `values` alone are enough
  // for display, but register mirrors the old Select + setValueAs path).
  useEffect(() => {
    form.register(name);
  }, [form, name]);
  const raw = useWatch({ control: form.control, name });
  const current =
    raw === true || raw === 'true'
      ? 'true'
      : raw === false || raw === 'false'
        ? 'false'
        : String(raw ?? '');

  return (
    <div className="flex flex-col gap-[5px]">
      <div className="text-[13px] font-[500] text-pqMuted">
        <TranslatedLabel label={label} translationKey={translationKey} />
      </div>
      <div className="flex flex-wrap gap-[6px]">
        {options.map((opt) => {
          const value = String(opt.value);
          const selected = current === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                form.setValue(name, opt.value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }}
              className={clsx(
                'h-[32px] rounded-pqSm px-[13px] text-[12.5px] transition-colors',
                selected
                  ? 'bg-pqBrandSoft font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--brand)]'
                  : 'text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover hover:text-pqText'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
