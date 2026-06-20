'use client';

import { FC, useCallback } from 'react';
import { Editor, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';
const originalMap = {
  a: '𝗮',
  b: '𝗯',
  c: '𝗰',
  d: '𝗱',
  e: '𝗲',
  f: '𝗳',
  g: '𝗴',
  h: '𝗵',
  i: '𝗶',
  j: '𝗷',
  k: '𝗸',
  l: '𝗹',
  m: '𝗺',
  n: '𝗻',
  o: '𝗼',
  p: '𝗽',
  q: '𝗾',
  r: '𝗿',
  s: '𝘀',
  t: '𝘁',
  u: '𝘂',
  v: '𝘃',
  w: '𝘄',
  x: '𝘅',
  y: '𝘆',
  z: '𝘇',
  A: '𝗔',
  B: '𝗕',
  C: '𝗖',
  D: '𝗗',
  E: '𝗘',
  F: '𝗙',
  G: '𝗚',
  H: '𝗛',
  I: '𝗜',
  J: '𝗝',
  K: '𝗞',
  L: '𝗟',
  M: '𝗠',
  N: '𝗡',
  O: '𝗢',
  P: '𝗣',
  Q: '𝗤',
  R: '𝗥',
  S: '𝗦',
  T: '𝗧',
  U: '𝗨',
  V: '𝗩',
  W: '𝗪',
  X: '𝗫',
  Y: '𝗬',
  Z: '𝗭',
  '1': '𝟭',
  '2': '𝟮',
  '3': '𝟯',
  '4': '𝟰',
  '5': '𝟱',
  '6': '𝟲',
  '7': '𝟳',
  '8': '𝟴',
  '9': '𝟵',
  '0': '𝟬',
};
const reverseMap = Object.fromEntries(
  Object.entries(originalMap).map(([key, value]) => [value, key])
);
export const BoldText: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const mark = () => {
    editor?.commands?.unsetUnderline();
    editor?.commands?.toggleBold();
    editor?.commands?.focus();
  };
  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content="Bold Text"
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
          d="M4 8.00033H9.33333C10.8061 8.00033 12 6.80642 12 5.33366C12 3.8609 10.8061 2.66699 9.33333 2.66699H4V8.00033ZM4 8.00033H10C11.4728 8.00033 12.6667 9.19423 12.6667 10.667C12.6667 12.1398 11.4728 13.3337 10 13.3337H4V8.00033Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
