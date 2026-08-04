'use client';

import { FC, useCallback } from 'react';
import clsx from 'clsx';
export const Slider: FC<{
  value: 'on' | 'off';
  fill?: boolean;
  onChange: (value: 'on' | 'off') => void;
}> = (props) => {
  const { value, onChange, fill } = props;
  const change = useCallback(() => {
    onChange(value === 'on' ? 'off' : 'on');
  }, [value]);
  return (
    <div
      className={clsx(
        'relative w-[40px] h-[22px] flex-shrink-0 rounded-[999px] cursor-pointer transition-colors duration-150',
        value === 'on' ? 'bg-pqBrand' : 'bg-pqBorder'
      )}
      onClick={change}
    >
      <span
        className={clsx(
          'absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white transition-all duration-150',
          value === 'on' ? 'left-[23px]' : 'left-[3px]'
        )}
      />
    </div>
  );
};
