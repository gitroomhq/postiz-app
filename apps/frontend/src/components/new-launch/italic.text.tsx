import { FC } from 'react';

export const ItalicText: FC<{
  editor: any;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.toggleItalic();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Italic Text"
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
          d="M10 2.66699H6.66667M9.33333 13.3337H6M8.66667 2.66699L7.33333 13.3337"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
