import { FC } from 'react';

export const StrikeText: FC<{
  editor: any;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.toggleStrike();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Strike Text"
      onClick={mark}
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
          d="M2 8H14M5.33333 5.33301C5.33333 3.86025 6.52724 2.66634 8 2.66634C9.47276 2.66634 10.6667 3.86025 10.6667 5.33301C10.6667 6.80577 9.47276 8.00033 8 8.00033M8 8.00033C9.47276 8.00033 10.6667 9.19423 10.6667 10.667C10.6667 12.1397 9.47276 13.3337 8 13.3337C6.52724 13.3337 5.33333 12.1397 5.33333 10.667"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
