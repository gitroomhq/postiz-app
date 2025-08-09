'use client';

import { FC, useCallback } from 'react';
import { Editor, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';
const underlineMap = {
  a: 'a̲',
  b: 'b̲',
  c: 'c̲',
  d: 'd̲',
  e: 'e̲',
  f: 'f̲',
  g: 'g̲',
  h: 'h̲',
  i: 'i̲',
  j: 'j̲',
  k: 'k̲',
  l: 'l̲',
  m: 'm̲',
  n: 'n̲',
  o: 'o̲',
  p: 'p̲',
  q: 'q̲',
  r: 'r̲',
  s: 's̲',
  t: 't̲',
  u: 'u̲',
  v: 'v̲',
  w: 'w̲',
  x: 'x̲',
  y: 'y̲',
  z: 'z̲',
  A: 'A̲',
  B: 'B̲',
  C: 'C̲',
  D: 'D̲',
  E: 'E̲',
  F: 'F̲',
  G: 'G̲',
  H: 'H̲',
  I: 'I̲',
  J: 'J̲',
  K: 'K̲',
  L: 'L̲',
  M: 'M̲',
  N: 'N̲',
  O: 'O̲',
  P: 'P̲',
  Q: 'Q̲',
  R: 'R̲',
  S: 'S̲',
  T: 'T̲',
  U: 'U̲',
  V: 'V̲',
  W: 'W̲',
  X: 'X̲',
  Y: 'Y̲',
  Z: 'Z̲',
  '1': '1̲',
  '2': '2̲',
  '3': '3̲',
  '4': '4̲',
  '5': '5̲',
  '6': '6̲',
  '7': '7̲',
  '8': '8̲',
  '9': '9̲',
  '0': '0̲',
};
const reverseMap = Object.fromEntries(
  Object.entries(underlineMap).map(([key, value]) => [value, key])
);
export const UText: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.unsetBold();
    editor?.commands?.toggleUnderline();
    editor?.commands?.focus();
  };
  return (
    <div
      onClick={mark}
      className="select-none cursor-pointer w-[40px] p-[5px] text-center"
    >
      <svg
        width="25"
        height="24"
        viewBox="0 0 25 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_31_12620)">
          <path
            d="M10.4119 6.47V12.77C10.4119 13.4 10.5669 13.885 10.8769 14.225C11.1869 14.565 11.6419 14.735 12.2419 14.735C12.8419 14.735 13.3019 14.565 13.6219 14.225C13.9419 13.885 14.1019 13.4 14.1019 12.77V6.47H16.6669V12.755C16.6669 13.695 16.4669 14.49 16.0669 15.14C15.6669 15.79 15.1269 16.28 14.4469 16.61C13.7769 16.94 13.0269 17.105 12.1969 17.105C11.3669 17.105 10.6219 16.945 9.96191 16.625C9.31191 16.295 8.79691 15.805 8.41691 15.155C8.03691 14.495 7.84691 13.695 7.84691 12.755V6.47H10.4119Z"
            fill="currentColor"
          />
          <path
            d="M6.96191 18.5H17.5369V19.25H6.96191V18.5Z"
            fill="currentColor"
          />
        </g>
        <defs>
          <clipPath id="clip0_31_12620">
            <rect
              width="24"
              height="24"
              fill="white"
              transform="translate(0.25)"
            />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
};
