'use client';

import { FC, useCallback } from 'react';

export const Bullets: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const bullet = () => {
    editor?.commands?.toggleBulletList();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Bullets"
      onClick={bullet}
      className="select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M14 8.00065L6 8.00065M14 4.00065L6 4.00065M14 12.0007L6 12.0007M3.33333 8.00065C3.33333 8.36884 3.03486 8.66732 2.66667 8.66732C2.29848 8.66732 2 8.36884 2 8.00065C2 7.63246 2.29848 7.33398 2.66667 7.33398C3.03486 7.33398 3.33333 7.63246 3.33333 8.00065ZM3.33333 4.00065C3.33333 4.36884 3.03486 4.66732 2.66667 4.66732C2.29848 4.66732 2 4.36884 2 4.00065C2 3.63246 2.29848 3.33398 2.66667 3.33398C3.03486 3.33398 3.33333 3.63246 3.33333 4.00065ZM3.33333 12.0007C3.33333 12.3688 3.03486 12.6673 2.66667 12.6673C2.29848 12.6673 2 12.3688 2 12.0007C2 11.6325 2.29848 11.334 2.66667 11.334C3.03486 11.334 3.33333 11.6325 3.33333 12.0007Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
