'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { VideoOrImage } from '@gitroom/react/helpers/video.or.image';
import {
  FEED_PREVIEW_FALLBACK_WH,
  clampPreviewAspect,
} from '@gitroom/frontend/components/new-launch/preview-media-aspect';

/** One complete 4:5 card fits the preview pane; stacked cards snap into view. */
export const PREVIEW_MEDIA_MAX_HEIGHT = 'min(34vh, 300px)';

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
  // Tall enough to read a 4:5, short enough that one complete card (header +
  // media + actions) fits in the preview pane instead of sitting half-cut
  // under the composer footer.
  const maxHeight = PREVIEW_MEDIA_MAX_HEIGHT;

  return (
    <div
      data-pq="preview-media"
      className={clsx(
        'relative mx-auto overflow-hidden bg-black/20',
        className
      )}
      style={{
        aspectRatio: `${displayWH} / 1`,
        maxHeight,
        width: `min(100%, calc(${maxHeight} * ${displayWH}))`,
      }}
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
