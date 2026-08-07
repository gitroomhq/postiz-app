'use client';

import React from 'react';
import clsx from 'clsx';
import {
  setDateFormat,
  useDateFormat,
} from '@gitroom/frontend/components/launches/helpers/date.format';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';

const DateFormatComponent = () => {
  const t = useT();
  const toaster = useToaster();
  const { dateOrder } = useDateFormat();
  const changeFormat = (value: 'MDY' | 'DMY') => {
    if (value === dateOrder) {
      return;
    }
    setDateFormat(value);
    toaster.show(t('settings_updated', 'Settings updated'), 'success');
  };
  const options = [
    { label: t('date_format_mdy', 'MM/DD/YYYY'), value: 'MDY' as const },
    { label: t('date_format_dmy', 'DD/MM/YYYY'), value: 'DMY' as const },
  ];
  return (
    <div className="rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)] p-[15px_16px] flex flex-col gap-[13px]">
      <div className="text-[13.5px] font-[600]">
        {t('date_format', 'Date format')}
      </div>
      <div className="flex gap-[6px]">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => changeFormat(option.value)}
            className={clsx(
              'h-[32px] px-[13px] rounded-pqSm text-[12.5px]',
              dateOrder === option.value
                ? 'bg-pqBrandSoft shadow-[inset_0_0_0_1px_var(--brand)] font-[600] text-pqText'
                : 'shadow-[inset_0_0_0_1px_var(--border)] text-pqMuted hover:bg-pqHover'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateFormatComponent;
