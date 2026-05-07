import { FC } from 'react';

export const BlockquoteText: FC<{
  editor: any;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.toggleBlockquote();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Blockquote"
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
          d="M2.66699 6.00033C2.66699 4.52757 3.86090 3.33366 5.33366 3.33366H5.66699C6.03518 3.33366 6.33366 3.63214 6.33366 4.00033C6.33366 4.36852 6.03518 4.66699 5.66699 4.66699H5.33366C4.59728 4.66699 4.00033 5.26395 4.00033 6.00033V6.33366H5.66699C6.03518 6.33366 6.33366 6.63214 6.33366 7.00033V10.667C6.33366 11.0352 6.03518 11.3337 5.66699 11.3337H2.66699C2.29880 11.3337 2.00033 11.0352 2.00033 10.667V6.00033H2.66699ZM2.00033 6.00033H2.66699"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.33366 6.00033C9.33366 4.52757 10.5276 3.33366 12.0003 3.33366H12.3337C12.7018 3.33366 13.0003 3.63214 13.0003 4.00033C13.0003 4.36852 12.7018 4.66699 12.3337 4.66699H12.0003C11.2640 4.66699 10.667 5.26395 10.667 6.00033V6.33366H12.3337C12.7018 6.33366 13.0003 6.63214 13.0003 7.00033V10.667C13.0003 11.0352 12.7018 11.3337 12.3337 11.3337H9.33366C8.96547 11.3337 8.66699 11.0352 8.66699 10.667V6.00033H9.33366ZM8.66699 6.00033H9.33366"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
