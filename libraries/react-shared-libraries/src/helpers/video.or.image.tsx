'use client';

import { FC, SyntheticEvent } from 'react';
import { clsx } from 'clsx';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
export const VideoOrImage: FC<{
  src: string;
  autoplay: boolean;
  isContain?: boolean;
  imageClassName?: string;
  videoClassName?: string;
  onMediaReady?: (width: number, height: number) => void;
}> = (props) => {
  const {
    src,
    autoplay,
    isContain,
    imageClassName,
    videoClassName,
    onMediaReady,
  } = props;
  const ready = (width: number, height: number) => {
    onMediaReady?.(width, height);
  };
  if (hasExtension(src, 'mp4')) {
    return (
      <video
        src={src}
        autoPlay={autoplay}
        playsInline
        className={clsx(
          'w-full h-full',
          isContain ? 'object-contain' : 'object-cover',
          videoClassName
        )}
        muted={true}
        loop={true}
        onLoadedMetadata={(e: SyntheticEvent<HTMLVideoElement>) =>
          ready(e.currentTarget.videoWidth, e.currentTarget.videoHeight)
        }
      />
    );
  }
  return (
    <img
      className={clsx(
        isContain ? 'object-contain' : 'object-cover',
        'w-full h-full',
        imageClassName
      )}
      src={src}
      onLoad={(e: SyntheticEvent<HTMLImageElement>) =>
        ready(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
      }
    />
  );
};
