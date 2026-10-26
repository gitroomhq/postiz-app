'use client';

import { FC } from 'react';

export const CodeText: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.toggleCode();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Monospace"
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
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    </div>
  );
};
