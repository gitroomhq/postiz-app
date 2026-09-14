'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import { clampPreviewAspect } from '@gitroom/frontend/components/new-launch/preview-media-aspect';

export const PreviewMediaFrame: FC<{
  src: string;
  minWH: number;
  maxWH: number;
  fallbackWH?: number;
  className?: string;
  autoplay?: boolean;
}> = ({
  src,
  minWH,
  maxWH,
  fallbackWH = 1,
  className,
  autoplay = true,
}) => {
  const [ratio, setRatio] = useState(fallbackWH);

  const onMediaReady = useCallback(
    (width: number, height: number) => {
      setRatio(clampPreviewAspect(width, height, minWH, maxWH));
    },
    [minWH, maxWH]
  );

  return (
    <div
      className={clsx('relative w-full overflow-hidden bg-black/20', className)}
      style={{ aspectRatio: `${ratio} / 1` }}
    >
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="absolute inset-0 block"
      >
        <VideoOrImage
          autoplay={autoplay}
          src={src}
          onMediaReady={onMediaReady}
        />
      </a>
    </div>
  );
};
