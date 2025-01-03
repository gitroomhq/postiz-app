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

export const BoldText: FC<{ editor: any; currentValue: string }> = ({
  editor,
}) => {
  const mark = () => {
    const selectedText = Editor.string(editor, editor.selection);

    const newText = (
      !selectedText ? prompt('What do you want to write?') || '' : selectedText
    )
      .split('')
      // @ts-ignore
      .map((char) => originalMap?.[char] || char)
      .join('');


    Transforms.insertText(editor, newText);
    ReactEditor.focus(editor);
  };

  return (
    <div
      onClick={mark}
      className="select-none cursor-pointer bg-customColor2 w-[40px] p-[5px] text-center rounded-tl-lg rounded-tr-lg"
    >
      <svg
        width="25"
        height="24"
        viewBox="0 0 25 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_31_12616)">
          <path
            d="M14.7686 12.24C15.4192 12.3787 15.9419 12.704 16.3366 13.216C16.7312 13.7173 16.9286 14.2933 16.9286 14.944C16.9286 15.8827 16.5979 16.6293 15.9366 17.184C15.2859 17.728 14.3739 18 13.2006 18H7.96856V6.768H13.0246C14.1659 6.768 15.0566 7.02933 15.6966 7.552C16.3472 8.07467 16.6726 8.784 16.6726 9.68C16.6726 10.3413 16.4966 10.8907 16.1446 11.328C15.8032 11.7653 15.3446 12.0693 14.7686 12.24ZM10.7046 11.312H12.4966C12.9446 11.312 13.2859 11.216 13.5206 11.024C13.7659 10.8213 13.8886 10.528 13.8886 10.144C13.8886 9.76 13.7659 9.46667 13.5206 9.264C13.2859 9.06133 12.9446 8.96 12.4966 8.96H10.7046V11.312ZM12.7206 15.792C13.1792 15.792 13.5312 15.6907 13.7766 15.488C14.0326 15.2747 14.1606 14.9707 14.1606 14.576C14.1606 14.1813 14.0272 13.872 13.7606 13.648C13.5046 13.424 13.1472 13.312 12.6886 13.312H10.7046V15.792H12.7206Z"
            fill="currentColor"
          />
        </g>
        <defs>
          <clipPath id="clip0_31_12616">
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
