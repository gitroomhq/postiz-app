'use client';

import { Slider } from '@mantine/core';
import { FC } from 'react';
export const Track: FC<{
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}> = (props) => {
  const { value, onChange, min, max } = props;
  return (
    <Slider
      color="violet"
      labelAlwaysOn={true}
      value={value}
      onChange={onChange}
      size="xl"
      classNames={{
        track:
          'before:bg-customColor3 before:border before:border-customColor6',
        mark: 'border-customColor6',
        markFilled: 'border-customColor7',
      }}
      min={min}
      max={max}
      // classNames={{
      //   track: 'h-[15px]',
      //   thumb: 'w-[24px] h-[24px]',
      // }}
    />
  );
};
