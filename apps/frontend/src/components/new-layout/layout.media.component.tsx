'use client';

import { MediaBox } from '@gitroom/frontend/components/media/media.component';

export const MediaLayoutComponent = () => {
  return (
    <div className="flex flex-1 flex-col transition-all">
      <MediaBox setMedia={() => {}} closeModal={() => {}} standalone={true} />
    </div>
  );
};
