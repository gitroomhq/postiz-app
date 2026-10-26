'use client';

import { FC } from 'react';

export const ItalicText: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.toggleItalic();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Italic"
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
        <line x1="19" y1="4" x2="10" y2="4" />
        <line x1="14" y1="20" x2="5" y2="20" />
        <line x1="15" y1="4" x2="9" y2="20" />
      </svg>
    </div>
  );
};
