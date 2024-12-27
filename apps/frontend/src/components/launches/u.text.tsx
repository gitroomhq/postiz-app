import { FC, useCallback } from 'react';
import { Editor, Transforms } from 'slate';

const underlineMap = {
  "a": "a̲",
  "b": "b̲",
  "c": "c̲",
  "d": "d̲",
  "e": "e̲",
  "f": "f̲",
  "g": "g̲",
  "h": "h̲",
  "i": "i̲",
  "j": "j̲",
  "k": "k̲",
  "l": "l̲",
  "m": "m̲",
  "n": "n̲",
  "o": "o̲",
  "p": "p̲",
  "q": "q̲",
  "r": "r̲",
  "s": "s̲",
  "t": "t̲",
  "u": "u̲",
  "v": "v̲",
  "w": "w̲",
  "x": "x̲",
  "y": "y̲",
  "z": "z̲",
  "A": "A̲",
  "B": "B̲",
  "C": "C̲",
  "D": "D̲",
  "E": "E̲",
  "F": "F̲",
  "G": "G̲",
  "H": "H̲",
  "I": "I̲",
  "J": "J̲",
  "K": "K̲",
  "L": "L̲",
  "M": "M̲",
  "N": "N̲",
  "O": "O̲",
  "P": "P̲",
  "Q": "Q̲",
  "R": "R̲",
  "S": "S̲",
  "T": "T̲",
  "U": "U̲",
  "V": "V̲",
  "W": "W̲",
  "X": "X̲",
  "Y": "Y̲",
  "Z": "Z̲",
  "1": "1̲",
  "2": "2̲",
  "3": "3̲",
  "4": "4̲",
  "5": "5̲",
  "6": "6̲",
  "7": "7̲",
  "8": "8̲",
  "9": "9̲",
  "0": "0̲",
};
export const UText: FC<{ editor: any; currentValue: string }> = ({
  editor,
}) => {
  const mark = () => {
    const selectedText = Editor.string(editor, editor.selection);

    const newText = (
      !selectedText ? prompt('What do you want to write?') || '' : selectedText
    )
      .split('')
      // @ts-ignore
      .map((char) => underlineMap?.[char] || char)
      .join('');

    Transforms.insertText(editor, newText);
  };

  return (
    <div
      onClick={mark}
      className="select-none cursor-pointer bg-customColor2 w-[40px] p-[5px] text-center rounded-tl-lg rounded-tr-lg"
    >
      U
    </div>
  );
};
