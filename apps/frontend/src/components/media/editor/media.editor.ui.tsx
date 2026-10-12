'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import clsx from 'clsx';

export const inputClass =
  'h-[36px] px-[10px] rounded-[8px] bg-newBgColorInner border border-newColColor text-[13px] outline-none focus:border-[#612BD3]';

export const ToolButton: FC<{
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}> = ({ active, disabled, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={clsx(
      'h-[36px] px-[12px] rounded-[8px] text-[13px] flex items-center gap-[6px] select-none whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed',
      active ? 'bg-[#612BD3] text-white' : 'bg-btnSimple changeColor'
    )}
  >
    {children}
  </button>
);

export const Section: FC<{ title: string; children: ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-col gap-[10px] p-[12px] rounded-[8px] bg-newBgColorInner">
    <div className="text-[13px] font-[600]">{title}</div>
    {children}
  </div>
);

export const Field: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <label className="flex flex-col gap-[4px] text-[12px] text-newTextColor/70">
    {label}
    {children}
  </label>
);

// keeps what is typed until it is a valid number, so the field can be cleared
export const NumberInput: FC<{
  value: number;
  min: number;
  max: number;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onValue: (value: number) => void;
}> = ({ value, min, max, className, onFocus, onBlur, onValue }) => {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);
  return (
    <input
      type="number"
      className={clsx(inputClass, className)}
      min={min}
      max={max}
      value={draft}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocused(false);
        onBlur?.();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const number = Number(e.target.value);
        if (e.target.value && number >= min && number <= max) {
          onValue(number);
        }
      }}
    />
  );
};

// colour picker with the brand kit colours one click away
export const ColorInput: FC<{
  value: string;
  swatches?: string[];
  onFocus?: () => void;
  onBlur?: () => void;
  onChange: (value: string) => void;
}> = ({ value, swatches = [], onFocus, onBlur, onChange }) => (
  <div className="flex items-center gap-[4px] flex-wrap max-w-[140px]">
    <input
      type="color"
      className="w-[36px] h-[36px] bg-transparent cursor-pointer"
      value={value}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value)}
    />
    {swatches.map((color) => (
      <button
        key={color}
        type="button"
        title={color}
        onClick={() => {
          onFocus?.();
          onChange(color);
          onBlur?.();
        }}
        className={clsx(
          'w-[18px] h-[18px] rounded-full border',
          color.toLowerCase() === value.toLowerCase()
            ? 'border-[#612BD3] border-2'
            : 'border-newTextColor/20'
        )}
        style={{ background: color }}
      />
    ))}
  </div>
);
