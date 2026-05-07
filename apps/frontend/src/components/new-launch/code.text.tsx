import { FC } from 'react';

export const CodeText: FC<{
  editor: any;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.toggleCode();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Code Text"
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
          d="M5.33333 5.33301L2 7.99967L5.33333 10.6663M10.6667 5.33301L14 7.99967L10.6667 10.6663"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
