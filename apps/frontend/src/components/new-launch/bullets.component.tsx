'use client';

import { FC, useCallback } from 'react';

export const Bullets: FC<{
  editor: any;
  currentValue: string;
}> = ({ editor }) => {
  const bullet = () => {
    editor.commands.toggleBulletList();
  };
  return (
    <div
      onClick={bullet}
      className="select-none cursor-pointer w-[40px] p-[5px] text-center"
    >
      A
    </div>
  );
};
