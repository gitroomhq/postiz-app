'use client';

import { FC, useState } from 'react';

const formatDuration = (seconds: number) => {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

export const VideoFrame: FC<{
  url: string;
  autoplay?: boolean;
  showDuration?: boolean;
}> = (props) => {
  const { url, showDuration } = props;
  const [duration, setDuration] = useState<number>();
  return (
    <>
      <video
        className="w-full h-full object-cover rounded-[4px]"
        src={url + '#t=0.1'}
        preload="metadata"
        autoPlay={!!props?.autoplay}
        onLoadedMetadata={
          showDuration
            ? (e) => setDuration(e.currentTarget.duration)
            : undefined
        }
      />
      {showDuration && !!duration && Number.isFinite(duration) && (
        <div className="absolute top-[6px] end-[6px] z-[30] px-[6px] py-[1px] rounded-full bg-black/60 text-white text-[11px] font-[500] leading-[16px] pointer-events-none">
          {formatDuration(duration)}
        </div>
      )}
    </>
  );
};
