'use client';

import { MediaBox } from '@gitroom/frontend/components/media/media.component';

export const MediaLayoutComponent = () => {
  return (
    <div className="bg-newBgColorInner p-[20px] flex flex-1 flex-col gap-[15px] transition-all">
      <MediaBox setMedia={() => {}} closeModal={() => {}} standalone={true} />
    </div>
  );
};
