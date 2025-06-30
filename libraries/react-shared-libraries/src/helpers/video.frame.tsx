'use client';

import { FC } from 'react';
export const VideoFrame: FC<{
  url: string;
}> = (props) => {
  const { url } = props;
  return (
    <video
      className="w-full h-full object-cover rounded-[4px]"
      src={url + '#t=0.1'}
      preload="metadata"
      autoPlay={false}
    ></video>
  );
};
