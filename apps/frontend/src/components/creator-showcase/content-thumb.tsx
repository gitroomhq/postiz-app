'use client';

import { useRef, useState, type MouseEvent, type FocusEvent } from 'react';
import clsx from 'clsx';
import {
  PLATFORM_ICONS,
  type PlatformKey,
} from '../ui/platform-icons';
import {
  formatDuration,
  formatPrimaryMetric,
  PLATFORM_ASPECT,
  relativeTime,
  type ContentPost,
} from './content-data';

interface ContentThumbProps {
  post: ContentPost;
  onOpen: (post: ContentPost) => void;
}

const HOVER_INTENT_MS = 150;

export function ContentThumb({ post, onOpen }: ContentThumbProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [active, setActive] = useState(false);

  const Icon = PLATFORM_ICONS[post.platform as PlatformKey];
  const hasVideo = !!post.previewVideoUrl;
  const metric = formatPrimaryMetric(post);

  const enter = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setActive(true), HOVER_INTENT_MS);
  };

  const leave = () => {
    window.clearTimeout(timerRef.current);
    setActive(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onOpen(post);
  };

  const handleFocus = (_e: FocusEvent<HTMLButtonElement>) => enter();
  const handleBlur = (_e: FocusEvent<HTMLButtonElement>) => leave();

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={`Open post: ${post.caption.slice(0, 80)}`}
      className={clsx(
        'group relative block w-full overflow-hidden rounded-xl border border-borderGlass bg-customColor16 text-left',
        'transition-colors duration-150 ease-out hover:border-borderGlassStrong',
        'focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2',
        PLATFORM_ASPECT[post.platform as PlatformKey]
      )}
    >
      {/* Static thumbnail layer */}
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnailUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ease-out motion-reduce:transition-none"
          style={{ opacity: active && hasVideo ? 0 : 1 }}
        />
      ) : (
        <div className="absolute inset-0 p-4 flex items-end bg-customColor16">
          <p className="text-body-sm text-fgMuted line-clamp-6">{post.caption}</p>
        </div>
      )}

      {/* Hover video — only mounts when active. Hidden under reduced-motion. */}
      {hasVideo && active && (
        <video
          ref={videoRef}
          src={post.previewVideoUrl ?? undefined}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover motion-reduce:hidden"
          onCanPlay={() => {
            videoRef.current?.play().catch(() => {
              /* autoplay blocked — leave thumbnail visible */
            });
          }}
        />
      )}

      {/* Platform chip — solid bg, no backdrop-filter per DESIGN.md */}
      <span className="absolute top-2 left-2 inline-flex items-center justify-center size-6 rounded-md bg-canvas/85 border border-borderGlass text-fg">
        <Icon size={12} />
      </span>

      {/* Top-right type/duration chip */}
      {hasVideo && post.durationSec != null ? (
        <span className="absolute top-2 right-2 px-1.5 h-5 inline-flex items-center rounded bg-canvas/85 border border-borderGlass text-micro font-mono tabular-nums text-fg">
          {formatDuration(post.durationSec)}
        </span>
      ) : post.type === 'carousel' && post.mediaCount != null ? (
        <span className="absolute top-2 right-2 px-1.5 h-5 inline-flex items-center gap-1 rounded bg-canvas/85 border border-borderGlass text-micro font-mono tabular-nums text-fg">
          <CarouselGlyph /> {post.mediaCount}
        </span>
      ) : null}

      {/* Bottom solid scrim — metric + relative time */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-canvas/85 border-t border-borderGlass flex items-center justify-between">
        <span className="text-caption font-mono tabular-nums text-fg">
          {metric.value}
        </span>
        <span className="text-micro text-fgSubtle font-mono">
          {relativeTime(post.publishedAt)}
        </span>
      </div>

      {/* Caption fallback overlay — for posts WITHOUT video preview */}
      {!hasVideo && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-canvas/92 px-4 pt-4 pb-12 flex items-end opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        >
          <p className="text-body-sm text-fg line-clamp-6">{post.caption}</p>
        </div>
      )}
    </button>
  );
}

function CarouselGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="10"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="5"
        y="1"
        width="10"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
