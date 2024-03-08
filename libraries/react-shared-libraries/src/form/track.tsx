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
        track: 'before:bg-[#0B0F1C] before:border before:border-[#172034]',
        mark: 'border-[#172034]',
        markFilled: 'border-[#7950F2]',
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
