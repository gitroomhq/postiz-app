'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import clsx from 'clsx';
import {
  PLATFORM_ICONS,
  PLATFORM_LABELS,
  type PlatformKey,
} from '../ui/platform-icons';
import {
  formatCompact,
  formatDuration,
  PLATFORM_ASPECT,
  relativeTime,
  type ContentPost,
} from './content-data';

interface ContentLightboxProps {
  post: ContentPost | null;
  onClose: () => void;
}

export function ContentLightbox({ post, onClose }: ContentLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (post && !dlg.open) {
      dlg.showModal();
      // Try to autoplay the full preview clip if any
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    }
    if (!post && dlg.open) dlg.close();
  }, [post]);

  // ESC and explicit close
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dlg.addEventListener('cancel', onCancel);
    return () => dlg.removeEventListener('cancel', onCancel);
  }, [onClose]);

  // Backdrop click — dialog itself receives click when user clicks outside content
  const handleBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  if (!post) {
    return (
      <dialog
        ref={dialogRef}
        className="bg-transparent p-0 backdrop:bg-scrim"
        aria-hidden="true"
      />
    );
  }

  const Icon = PLATFORM_ICONS[post.platform as PlatformKey];
  const hasVideo = !!post.previewVideoUrl;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="lightbox-caption"
      className={clsx(
        // Native dialog reset + position
        'bg-transparent text-fg p-0 m-auto',
        'max-w-[920px] w-[min(92vw,920px)]',
        // Backdrop scrim
        'backdrop:bg-black/72',
      )}
    >
      <div
        // Stop propagation so clicking inside doesn't close
        onClick={(e) => e.stopPropagation()}
        className="bg-glass-elevated border border-borderGlassStrong rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]"
      >
        {/* Media pane */}
        <div className="relative bg-canvas-deep flex items-center justify-center min-h-[320px]">
          <div
            className={clsx(
              'relative w-full',
              PLATFORM_ASPECT[post.platform as PlatformKey]
            )}
          >
            {hasVideo ? (
              <video
                ref={videoRef}
                src={post.previewVideoUrl ?? undefined}
                muted
                autoPlay
                loop
                playsInline
                controls
                preload="metadata"
                className="absolute inset-0 w-full h-full object-contain bg-black motion-reduce:hidden"
              />
            ) : null}
            {/* Fallback (also shown under motion-reduce when hasVideo) */}
            {(!hasVideo || true) && post.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.thumbnailUrl}
                alt=""
                className={clsx(
                  'absolute inset-0 w-full h-full object-contain bg-black',
                  hasVideo && 'motion-reduce:block hidden'
                )}
              />
            ) : !post.thumbnailUrl ? (
              <div className="absolute inset-0 p-8 flex items-center justify-center">
                <p className="text-body-lg text-fg max-w-prose">{post.caption}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Info pane */}
        <div className="flex flex-col gap-5 p-6 md:max-h-[80vh] md:overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-caption text-fgMuted">
              <span className="inline-flex items-center justify-center size-7 rounded-md bg-customColor16 border border-borderGlass text-fg">
                <Icon size={14} />
              </span>
              {PLATFORM_LABELS[post.platform as PlatformKey]}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="size-8 inline-flex items-center justify-center rounded-md border border-borderGlass text-fgMuted hover:text-fg hover:border-borderGlassStrong transition-colors duration-150 ease-out"
            >
              ×
            </button>
          </div>

          <p
            id="lightbox-caption"
            className="text-body-sm text-fg leading-relaxed whitespace-pre-line"
          >
            {post.caption}
          </p>

          {post.hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {post.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-micro font-mono text-fgMuted px-2 h-6 inline-flex items-center rounded border border-borderGlass bg-customColor16"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-y-3 pt-1 border-t border-borderGlass mt-1">
            <Stat
              label={post.metrics.views != null ? 'Views' : 'Likes'}
              value={formatCompact(post.metrics.views ?? post.metrics.likes)}
            />
            <Stat
              label="Comments"
              value={formatCompact(post.metrics.comments)}
            />
            <Stat label="Shares" value={formatCompact(post.metrics.shares)} />
            {post.metrics.saves != null ? (
              <Stat label="Saves" value={formatCompact(post.metrics.saves)} />
            ) : (
              <Stat label="Posted" value={relativeTime(post.publishedAt)} />
            )}
          </dl>

          {hasVideo && post.durationSec != null ? (
            <div className="text-caption text-fgSubtle font-mono tabular-nums">
              Duration · {formatDuration(post.durationSec)}
            </div>
          ) : null}

          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center justify-center h-10 px-4 rounded-lg bg-customColor16 border border-borderGlass text-label text-fg hover:text-fg hover:border-borderGlassStrong transition-colors duration-150 ease-out"
          >
            View on {PLATFORM_LABELS[post.platform as PlatformKey]} →
          </a>
        </div>
      </div>
    </dialog>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-micro uppercase tracking-[0.04em] text-fgSubtle">
        {label}
      </dt>
      <dd className="text-body-sm font-mono tabular-nums text-fg">{value}</dd>
    </div>
  );
}
