'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import {
  FEED_PREVIEW_FALLBACK_WH,
  clampPreviewAspect,
} from '@gitroom/frontend/components/new-launch/preview-media-aspect';

export const PreviewMediaFrame: FC<{
  src: string;
  minWH: number;
  maxWH: number;
  fallbackWH?: number;
  aspectWH?: number;
  className?: string;
  autoplay?: boolean;
  onAspect?: (ratio: number) => void;
}> = ({
  src,
  minWH,
  maxWH,
  fallbackWH = FEED_PREVIEW_FALLBACK_WH,
  aspectWH,
  className,
  autoplay = true,
  onAspect,
}) => {
  const [ratio, setRatio] = useState(fallbackWH);

  const onMediaReady = useCallback(
    (width: number, height: number) => {
      const next = clampPreviewAspect(width, height, minWH, maxWH);
      if (!Number.isFinite(next)) {
        return;
      }
      setRatio(next);
      onAspect?.(next);
    },
    [minWH, maxWH, onAspect]
  );

  const displayWH = aspectWH ?? ratio;

  return (
    <div
      className={clsx('relative w-full overflow-hidden bg-black/20', className)}
      style={{ aspectRatio: `${displayWH} / 1` }}
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
          onMediaReady={aspectWH == null ? onMediaReady : undefined}
        />
      </a>
    </div>
  );
};
