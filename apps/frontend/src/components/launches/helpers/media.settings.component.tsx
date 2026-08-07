'use client';

import { EventEmitter } from 'events';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import {
  ModalFormActions,
  modalLabelClass,
  modalTextareaClass,
} from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
const postUrlEmitter = new EventEmitter();

export const MediaSettingsLayout = () => {
  const [showPostSelector, setShowPostSelector] = useState(false);
  const [media, setMedia] = useState(undefined);
  const [callback, setCallback] = useState<{
    callback: (tag: {
      id: string;
      name: string;
      path: string;
      thumbnail: string;
      alt: string;
    }) => void;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  } | null>({
    callback: (params: {
      id: string;
      name: string;
      path: string;
      thumbnail: string;
      alt: string;
    }) => {},
  } as any);
  useEffect(() => {
    postUrlEmitter.on(
      'show',
      (params: {
        media: any;
        callback: (url: {
          id: string;
          name: string;
          path: string;
          thumbnail: string;
          alt: string;
        }) => void;
      }) => {
        setCallback(params);
        setMedia(params.media);
        setShowPostSelector(true);
      }
    );
    return () => {
      setShowPostSelector(false);
      setCallback(null);
      setMedia(undefined);
      postUrlEmitter.removeAllListeners();
    };
  }, []);
  const close = useCallback(() => {
    setShowPostSelector(false);
    setCallback(null);
    setMedia(undefined);
  }, []);
  if (!showPostSelector) {
    return <></>;
  }
  return (
    <MediaComponentInner
      media={media}
      onClose={close}
      onSelect={callback?.callback!}
    />
  );
};

export const useMediaSettings = () => {
  return useCallback((media: any) => {
    return new Promise((resolve) => {
      postUrlEmitter.emit('show', {
        media,
        callback: (value: any) => {
          resolve(value);
        },
      });
    });
  }, []);
};

export const CreateThumbnail: FC<{
  onSelect: (blob: Blob, timestampMs: number) => void;
  media:
    | {
        id: string;
        name: string;
        path: string;
        thumbnail?: string;
        alt?: string;
      }
    | undefined;
  altText?: string;
  onAltTextChange?: (altText: string) => void;
}> = (props) => {
  const { onSelect, media } = props;
  const { backendUrl } = useVariables();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleLoadedMetadata = useCallback(() => {
    setDuration(videoRef?.current?.duration);
    setIsLoaded(true);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    setCurrentTime(videoRef?.current?.currentTime);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const captureFrame = useCallback(async () => {
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsCapturing(false);
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get timestamp in milliseconds
      const timestampMs = Math.round(currentTime * 1000);

      // Convert canvas to blob
      canvas.toBlob(
        (blob: Blob | null) => {
          if (blob) {
            onSelect(blob, timestampMs);
          }
          setIsCapturing(false);
        },
        'image/jpeg',
        0.8
      );
    } catch (error) {
      console.error('Error capturing frame:', error);
      setIsCapturing(false);

      // Fallback: try to capture using a different approach
      try {
        const video = videoRef.current;
        if (video) {
          // Create a temporary canvas element
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');

          if (tempCtx) {
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            tempCtx.drawImage(video, 0, 0);

            // Get timestamp in milliseconds
            const timestampMs = Math.round(currentTime * 1000);

            tempCanvas.toBlob(
              (blob: Blob | null) => {
                if (blob) {
                  onSelect(blob, timestampMs);
                }
                setIsCapturing(false);
              },
              'image/jpeg',
              0.8
            );
          }
        }
      } catch (fallbackError) {
        console.error('Fallback capture also failed:', fallbackError);
        alert(
          'Unable to capture frame. This might be due to CORS restrictions on the video source.'
        );
        setIsCapturing(false);
      }
    }
  }, [onSelect, currentTime]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!media) return null;

  return (
    <div className="flex flex-col space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={
            backendUrl + '/public/stream?url=' + encodeURIComponent(media.path)
          }
          className="w-full h-[200px] object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          muted
          preload="metadata"
          crossOrigin="anonymous"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {isLoaded && (
        <>
          <div className="flex flex-col space-y-2">
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-pqSettings rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${
                  (currentTime / duration) * 100
                }%, var(--border) ${(currentTime / duration) * 100}%, var(--border) 100%)`,
              }}
            />
            <div className="flex justify-between text-sm text-pqMuted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={captureFrame}
              disabled={isCapturing}
              className="rounded-pqSm bg-pqBrand px-[24px] py-[8px] text-pqOnBrand transition-colors hover:bg-pqBrandHover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCapturing ? 'Capturing...' : 'Select This Frame'}
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--brand);
          cursor: pointer;
          border: 2px solid var(--onBrand);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--brand);
          cursor: pointer;
          border: 2px solid var(--onBrand);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export const MediaComponentInner: FC<{
  onClose: () => void;
  onSelect: (media: {
    id: string;
    name: string;
    path: string;
    thumbnail: string;
    alt: string;
  }) => void;
  media:
    | {
        id: string;
        name: string;
        path: string;
        thumbnail: string;
        alt: string;
        thumbnailTimestamp?: number;
      }
    | undefined;
}> = (props) => {
  const { onClose, onSelect, media } = props;
  const t = useT();
  const toaster = useToaster();
  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
  const newFetch = useFetch();
  const [newThumbnail, setNewThumbnail] = useState<string | null>(null);
  const [isEditingThumbnail, setIsEditingThumbnail] = useState(false);
  const [altText, setAltText] = useState<string>(media?.alt || '');
  const [loading, setLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(
    props.media?.thumbnail || null
  );
  const [thumbnailTimestamp, setThumbnailTimestamp] = useState<number | null>(
    props.media?.thumbnailTimestamp || null
  );

  useEffect(() => {
    setActivateExitButton(false);
    return () => {
      setActivateExitButton(true);
    };
  }, []);

  const save = useCallback(async () => {
    setLoading(true);
    let path = thumbnail || '';
    if (newThumbnail) {
      const blob = await (await fetch(newThumbnail)).blob();
      const formData = new FormData();
      formData.append('file', blob, 'media.jpg');
      formData.append('preventSave', 'true');
      const data = await (
        await newFetch('/media/upload-simple', {
          method: 'POST',
          body: formData,
        })
      ).json();
      path = data.path;
    }

    const media = await (
      await newFetch('/media/information', {
        method: 'POST',
        body: JSON.stringify({
          id: props.media.id,
          alt: altText,
          thumbnail: path,
          thumbnailTimestamp: thumbnailTimestamp,
        }),
      })
    ).json();

    onSelect(media);
    toaster.show(t('alt_text_saved', 'Alt text saved'));
    onClose();
  }, [altText, newThumbnail, thumbnail, thumbnailTimestamp]);

  return (
    <div className="mt-[4px] flex flex-col gap-[16px]">
      <p className="text-[13.5px] leading-[1.55] text-pqMuted">
        {t(
          'alt_text_subtitle',
          'Describe the image for screen readers and platforms that support alt text.'
        )}
      </p>
      <div className="flex flex-col gap-[8px]">
        <label className={modalLabelClass}>
          {t('alt_text', 'Alt text')}
        </label>
        <textarea
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          className={modalTextareaClass}
          rows={4}
        />
      </div>
      {hasExtension(media?.path, 'mp4') && (
        <>
          {/* Alt Text Input */}
          <div>
            {!isEditingThumbnail ? (
              <div className="flex flex-col">
                {/* Show existing thumbnail if it exists */}
                {(newThumbnail || thumbnail) && (
                  <div className="flex flex-col space-y-2">
                    <span className="text-sm text-pqMuted">
                      Current Thumbnail:
                    </span>
                    <img
                      src={newThumbnail || thumbnail}
                      alt="Current thumbnail"
                      className="max-w-full max-h-[500px] object-contain rounded-lg border border-pqBorder"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    disabled={loading}
                    onClick={() => setIsEditingThumbnail(true)}
                    className="flex-1 rounded-pqSm border border-pqBorder bg-pqSettings px-[24px] py-[8px] text-pqText transition-colors hover:bg-pqHover"
                  >
                    {media.thumbnail || newThumbnail
                      ? 'Edit Thumbnail'
                      : 'Create Thumbnail'}
                  </button>
                  {(thumbnail || newThumbnail) && (
                    <button
                      disabled={loading}
                      onClick={() => {
                        setNewThumbnail(null);
                        setThumbnail(null);
                      }}
                      className="flex-1 rounded-pqSm border border-pqDangerLine bg-pqDangerSoft px-[24px] py-[8px] text-pqDanger transition-colors hover:bg-pqDangerChip"
                    >
                      Clear Thumbnail
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Back button */}
                <div className="flex justify-start">
                  <button
                    onClick={() => setIsEditingThumbnail(false)}
                    className="text-pqMuted hover:text-pqText transition-colors flex items-center space-x-2"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19 12H5M12 19L5 12L12 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Back</span>
                  </button>
                </div>

                {/* Thumbnail Editor */}
                <CreateThumbnail
                  onSelect={(blob: Blob, timestampMs: number) => {
                    // Convert blob to base64 or handle as needed
                    const reader = new FileReader();
                    reader.onload = () => {
                      // You can handle the result here - for now just call onSelect with the blob URL
                      const url = URL.createObjectURL(blob);
                      setNewThumbnail(url);
                      setThumbnailTimestamp(timestampMs);
                      setIsEditingThumbnail(false);
                    };
                    reader.readAsDataURL(blob);
                  }}
                  media={media}
                  altText={altText}
                  onAltTextChange={setAltText}
                />
              </div>
            )}
          </div>
        </>
      )}

      {!isEditingThumbnail && (
        <ModalFormActions onCancel={onClose}>
          <Button
            disabled={loading}
            onClick={save}
            className="h-[40px] shrink-0 rounded-[10px] px-[18px] text-[13.5px] font-[600]"
          >
            {t('save', 'Save')}
          </Button>
        </ModalFormActions>
      )}
    </div>
  );
};
