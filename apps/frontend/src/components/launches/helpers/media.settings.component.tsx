'use client';

import { EventEmitter } from 'events';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
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
  onSelect: (blob: Blob) => void;
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
  const { onSelect, media, altText, onAltTextChange } = props;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [mode, setMode] = useState<'frame' | 'upload'>('frame');

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoaded(true);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

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

      // Convert canvas to blob
      canvas.toBlob(
        (blob: Blob | null) => {
          if (blob) {
            onSelect(blob);
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

            tempCanvas.toBlob(
              (blob: Blob | null) => {
                if (blob) {
                  onSelect(blob);
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
  }, [onSelect]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onSelect(file);
      }
    },
    [onSelect]
  );

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!media) return null;

  return (
    <div className="flex flex-col space-y-4">
      {/* Mode Toggle */}
      <div className="flex rounded-lg bg-fifth p-1">
        <button
          onClick={() => setMode('frame')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'frame'
              ? 'bg-forth text-white'
              : 'text-textColor hover:text-white'
          }`}
        >
          Select Frame
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'upload'
              ? 'bg-forth text-white'
              : 'text-textColor hover:text-white'
          }`}
        >
          Upload Image
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {mode === 'frame' ? (
        <>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={media.path}
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
                  className="w-full h-2 bg-fifth rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${
                      (currentTime / duration) * 100
                    }%, #374151 ${
                      (currentTime / duration) * 100
                    }%, #374151 100%)`,
                  }}
                />
                <div className="flex justify-between text-sm text-textColor">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={captureFrame}
                  disabled={isCapturing}
                  className="bg-forth text-white px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCapturing ? 'Capturing...' : 'Select This Frame'}
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center space-y-4 py-8">
          <div className="text-center space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-textColor"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-textColor">
              <p className="text-sm">Upload a custom thumbnail image</p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, JPEG up to 10MB
              </p>
            </div>
          </div>

          <button
            onClick={triggerFileUpload}
            className="bg-forth text-white px-6 py-3 rounded-lg hover:bg-opacity-80 transition-all flex items-center space-x-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Choose Image</span>
          </button>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
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
    | { id: string; name: string; path: string; thumbnail: string; alt: string }
    | undefined;
}> = (props) => {
  const { onClose, onSelect, media } = props;
  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
  const newFetch = useFetch();
  const [newThumbnail, setNewThumbnail] = useState<string | null>(null);
  const [isEditingThumbnail, setIsEditingThumbnail] = useState(false);
  const [altText, setAltText] = useState<string>(media?.alt || '');
  const [loading, setLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(props.media?.thumbnail || null);

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
        }),
      })
    ).json();

    onSelect(media);
    onClose();
  }, [altText, newThumbnail, thumbnail]);

  return (
    <div className="text-textColor fixed start-0 top-0 bg-primary/80 z-[300] w-full h-full p-[60px] animate-fade justify-center flex bg-black/40">
      <div className="w-full h-full relative">
        <div className="w-[500px] bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] absolute left-[50%] top-[100px] -translate-x-[50%]">
          <div className="flex">
            <div className="flex-1">
              <TopTitle title={'Media Setting'} />
            </div>
            <button
              onClick={onClose}
              className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
              type="button"
            >
              <svg
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
              >
                <path
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>
          <div className="mt-[10px] flex flex-col gap-[20px]">
            <div className="flex flex-col space-y-2">
              <label className="text-sm text-textColor font-medium">
                Alt Text (for accessibility)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image/video content..."
                className="w-full px-3 py-2 bg-fifth border border-tableBorder rounded-lg text-textColor placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forth focus:border-transparent"
              />
            </div>
            {media?.path.indexOf('mp4') > -1 && (
              <>
                {/* Alt Text Input */}
                <div>
                  {!isEditingThumbnail ? (
                    <div className="flex flex-col">
                      {/* Show existing thumbnail if it exists */}
                      {(newThumbnail || thumbnail) && (
                        <div className="flex flex-col space-y-2">
                          <span className="text-sm text-textColor">
                            Current Thumbnail:
                          </span>
                          <img
                            src={newThumbnail || thumbnail}
                            alt="Current thumbnail"
                            className="max-w-full max-h-[500px] object-contain rounded-lg border border-tableBorder"
                          />
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <button
                          disabled={loading}
                          onClick={() => setIsEditingThumbnail(true)}
                          className="bg-third text-textColor px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all flex-1 border border-tableBorder"
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
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all flex-1 border border-red-700"
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
                          className="text-textColor hover:text-white transition-colors flex items-center space-x-2"
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
                        onSelect={(blob: Blob) => {
                          // Convert blob to base64 or handle as needed
                          const reader = new FileReader();
                          reader.onload = () => {
                            // You can handle the result here - for now just call onSelect with the blob URL
                            const url = URL.createObjectURL(blob);
                            setNewThumbnail(url);
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
              <div className="flex space-x-2 !mt-[20px]">
                <button
                  disabled={loading}
                  onClick={onClose}
                  className="flex-1 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="flex-1 bg-forth text-white px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
