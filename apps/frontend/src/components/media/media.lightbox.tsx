'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

export type LightboxMedia = {
  id: string;
  path: string;
  originalName?: string | null;
  name?: string;
  meta?: string;
  uiDemo?: boolean;
  fileSize?: number;
  /** Demo tile fill when the path is a video sample or the image fails. */
  thumbGradient?: string;
};

function mediaMetaLabel(media: LightboxMedia) {
  const name = media.originalName || media.name || media.path;
  const isVideo =
    hasExtension(media.path, 'mp4') || /\.webm$/i.test(media.path);
  let format = media.meta;
  if (!format) {
    if (isVideo) format = 'MP4';
    else {
      const ext = name.split('.').pop()?.toUpperCase();
      format = ext && ext.length <= 5 ? ext : 'Image';
    }
  }
  if (media.fileSize && media.fileSize > 0) {
    const kb = media.fileSize / 1024;
    const size =
      kb >= 1024
        ? `${(kb / 1024).toFixed(kb >= 10240 ? 0 : 1)} MB`
        : `${Math.max(1, Math.round(kb))} KB`;
    // Prefer EXT · size when meta was dimensions-only (demo) or bare format.
    if (!media.meta || !/\d+\s*(KB|MB)/i.test(media.meta)) {
      const extOnly = format.split('·')[0].trim();
      return `${extOnly} · ${size}`;
    }
  }
  return format;
}

export const MediaLightbox: FC<{
  media: LightboxMedia;
  onClose: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
}> = ({ media, onClose, onDelete, onDownload }) => {
  const t = useT();
  const mediaDirectory = useMediaDirectory();
  const [imgFailed, setImgFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isVideo =
    hasExtension(media.path, 'mp4') || /\.webm$/i.test(media.path);
  const url = media.uiDemo ? media.path : mediaDirectory.set(media.path);
  const gradient = media.thumbGradient;
  const metaLabel = mediaMetaLabel(media);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mounted, onClose]);

  const stop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-pqMediaScrim p-[48px] tablet:p-[24px] mobile:p-[16px]"
      onClick={onClose}
      data-pq="media-lightbox"
    >
      <div
        className="flex w-full max-w-[min(880px,100%)] flex-col gap-[12px]"
        onClick={stop}
      >
        <div className="flex items-center gap-[8px]">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-[600] text-white">
              {t('media', 'Media')}
            </div>
            <div className="mt-[2px] text-[12px] text-white/60">{metaLabel}</div>
          </div>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              title={t('download', 'Download')}
              className="grid h-[32px] w-[32px] place-items-center rounded-[9px] bg-white/12 text-white hover:bg-white/24"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path
                  d="M12 4v12M7.5 11.5 12 16l4.5-4.5M4 20h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title={t('delete', 'Delete')}
              className="grid h-[32px] w-[32px] place-items-center rounded-[9px] bg-white/12 text-white hover:bg-pqDanger"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path
                  d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title={t('close', 'Close')}
            className="grid h-[32px] w-[32px] place-items-center rounded-[9px] bg-white/12 text-white hover:bg-white/24"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div
          className={clsx(
            'relative grid aspect-[16/10] place-items-center overflow-hidden rounded-[14px] outline outline-1 outline-white/12 -outline-offset-1',
            !gradient && 'bg-pqSettings'
          )}
          style={gradient ? { background: gradient } : undefined}
        >
          {!!gradient && (
            <div
              className="absolute inset-0"
              style={{ background: gradient }}
              aria-hidden
            />
          )}
          {isVideo ? (
            <video
              className="relative z-[1] max-h-full max-w-full object-contain"
              src={url}
              controls
              autoPlay
              playsInline
            />
          ) : !imgFailed ? (
            <img
              src={url}
              alt={t('media', 'Media')}
              className="relative z-[1] max-h-full max-w-full object-contain"
              onError={() => setImgFailed(true)}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
