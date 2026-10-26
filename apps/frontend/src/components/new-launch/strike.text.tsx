'use client';

import { FC } from 'react';

export const StrikeText: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.toggleStrike();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Strikethrough"
      onClick={mark}
      className="select-none cursor-pointer rounded-[6px] mobile:rounded-[8px] w-[30px] h-[30px] mobile:w-[40px] mobile:h-[40px] bg-newColColor mobile:bg-newSettings flex justify-center items-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        className="mobile:w-[20px] mobile:h-[20px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 4H9a3 3 0 0 0-2.83 4" />
        <path d="M14 12a4 4 0 0 1 0 8H6" />
        <line x1="4" y1="12" x2="20" y2="12" />
      </svg>
    </div>
  );
};
