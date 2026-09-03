'use client';

import { EventEmitter } from 'events';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { TagsComponent } from '@gitroom/frontend/components/launches/tags.component';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useVariables } from '@gitroom/react/helpers/variable.context';
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
              className="w-full h-2 bg-fifth rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${
                  (currentTime / duration) * 100
                }%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`,
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
  media: any;
}> = (props) => {
  const { onClose, onSelect, media } = props;
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
  const [title, setTitle] = useState(media?.title || media?.originalName || '');
  const [description, setDescription] = useState(media?.description || '');
  const [status, setStatus] = useState(media?.status || 'draft');
  const [categoryId, setCategoryId] = useState(media?.categoryId || media?.category?.id || '');
  const [selectedTags, setSelectedTags] = useState<any[]>(
    (media?.tags || [])
      .map((entry: any) => entry.tag || entry)
      .filter((tag: any) => tag?.name)
      .map((tag: any) => ({ label: tag.name, value: tag.name, id: tag.id, color: tag.color }))
  );
  const [people, setPeople] = useState((media?.people || []).join(', '));
  const [products, setProducts] = useState((media?.products || []).join(', '));
  const [keywords, setKeywords] = useState((media?.keywords || []).join(', '));
  const [platforms, setPlatforms] = useState((media?.recommendedPlatforms || []).join(', '));
  const [languages, setLanguages] = useState((media?.languages || []).join(', '));
  const [source, setSource] = useState(media?.source || '');
  const [sourceUrl, setSourceUrl] = useState(media?.sourceUrl || '');
  const [attribution, setAttribution] = useState(media?.attribution || '');
  const [copyrightOwner, setCopyrightOwner] = useState(media?.copyrightOwner || '');
  const [licenseType, setLicenseType] = useState(media?.licenseType || 'unknown');
  const [licenseUrl, setLicenseUrl] = useState(media?.licenseUrl || '');
  const [expiresAt, setExpiresAt] = useState(media?.expiresAt ? String(media.expiresAt).slice(0, 10) : '');
  const [focusX, setFocusX] = useState(media?.focusX ?? '');
  const [focusY, setFocusY] = useState(media?.focusY ?? '');
  const split = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
  const loadCategories = useCallback(async () => (await newFetch('/media/categories/list')).json(), [newFetch]);
  const loadTags = useCallback(async () => (await newFetch('/posts/tags')).json(), [newFetch]);
  const { data: categories, mutate: mutateCategories } = useSWR('media-categories', loadCategories);
  const { data: tags } = useSWR('post-tags', loadTags);

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
          title, description, status,
          categoryId: categoryId || null,
          tagIds: (tags?.tags || [])
            .filter((tag: any) => selectedTags.some((item: any) => item.value === tag.name || item.id === tag.id))
            .map((tag: any) => tag.id),
          people: split(people), products: split(products), keywords: split(keywords),
          recommendedPlatforms: split(platforms), languages: split(languages),
          source, sourceUrl: sourceUrl || undefined, attribution, copyrightOwner,
          licenseType, licenseUrl: licenseUrl || undefined, expiresAt: expiresAt || null,
          focusX: focusX === '' ? null : Number(focusX), focusY: focusY === '' ? null : Number(focusY),
        }),
      })
    ).json();

    onSelect(media);
    onClose();
  }, [altText, newThumbnail, thumbnail, thumbnailTimestamp, title, description, status, categoryId, selectedTags, tags, people, products, keywords, platforms, languages, source, sourceUrl, attribution, copyrightOwner, licenseType, licenseUrl, expiresAt, focusX, focusY]);

  const analyze = useCallback(async () => {
    setLoading(true);
    try {
      const result = await (await newFetch(`/media/${media.id}/ai-suggestions`, { method: 'POST' })).json();
      setTitle(result.title || title); setDescription(result.description || description); setAltText(result.alt || altText);
      setPeople((result.people || []).join(', ')); setProducts((result.products || []).join(', ')); setKeywords((result.keywords || []).join(', '));
    } finally { setLoading(false); }
  }, [media?.id, title, description, altText]);

  const reanalyze = useCallback(async () => {
    setLoading(true);
    try { await newFetch(`/media/${media.id}/analyze`, { method: 'POST' }); } finally { setLoading(false); }
  }, [media?.id]);

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categoryDraftName, setCategoryDraftName] = useState('');
  const [categoryDraftColor, setCategoryDraftColor] = useState('#612BD3');
  const [categoryBusy, setCategoryBusy] = useState(false);

  const refreshCategories = useCallback(async () => {
    await mutateCategories();
    await globalMutate('media-box-categories');
  }, [mutateCategories]);

  const openCreateCategory = useCallback(() => {
    setCategoryDraftName('');
    setCategoryDraftColor('#612BD3');
    setShowCategoryManager(true);
  }, []);

  const openEditCategory = useCallback(() => {
    const current = (categories || []).find((item: any) => item.id === categoryId);
    if (!current) {
      openCreateCategory();
      return;
    }
    setCategoryDraftName(current.name || '');
    setCategoryDraftColor(current.color || '#612BD3');
    setShowCategoryManager(true);
  }, [categories, categoryId, openCreateCategory]);

  const createCategory = useCallback(async () => {
    if (!categoryDraftName.trim() || categoryBusy) return;
    setCategoryBusy(true);
    try {
      const created = await (
        await newFetch('/media/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: categoryDraftName.trim(),
            color: categoryDraftColor,
          }),
        })
      ).json();
      await refreshCategories();
      setCategoryId(created.id);
      setShowCategoryManager(false);
      setCategoryDraftName('');
    } finally {
      setCategoryBusy(false);
    }
  }, [categoryDraftName, categoryDraftColor, categoryBusy, newFetch, refreshCategories]);

  const renameCategory = useCallback(async () => {
    if (!categoryId || !categoryDraftName.trim() || categoryBusy) return;
    setCategoryBusy(true);
    try {
      await newFetch(`/media/categories/${categoryId}`, {
        method: 'POST',
        body: JSON.stringify({
          name: categoryDraftName.trim(),
          color: categoryDraftColor,
        }),
      });
      await refreshCategories();
      setShowCategoryManager(false);
    } finally {
      setCategoryBusy(false);
    }
  }, [categoryId, categoryDraftName, categoryDraftColor, categoryBusy, newFetch, refreshCategories]);

  const archiveCategory = useCallback(async () => {
    if (!categoryId || categoryBusy) return;
    if (!window.confirm('Archive this category? Media keeps working; the category is only hidden from the list.')) {
      return;
    }
    setCategoryBusy(true);
    try {
      await newFetch(`/media/categories/${categoryId}`, { method: 'DELETE' });
      await refreshCategories();
      setCategoryId('');
      setShowCategoryManager(false);
      setCategoryDraftName('');
    } finally {
      setCategoryBusy(false);
    }
  }, [categoryId, categoryBusy, newFetch, refreshCategories]);

  return (
    <div className="mt-[10px] flex flex-col gap-[20px]">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="field" /></Field>
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)} className="field"><option value="draft">Draft</option><option value="ready">Ready</option><option value="archived">Archived</option></select></Field>
        <div className="md:col-span-2">
          <Field label="Category">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="field"
                >
                  <option value="">No category</option>
                  {(categories || []).map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openCreateCategory}
                  className="px-3 rounded bg-third shrink-0"
                  title="Add category"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={openEditCategory}
                  className="px-3 rounded bg-third shrink-0"
                  title="Manage category"
                >
                  Manage
                </button>
              </div>
              {showCategoryManager && (
                <div className="rounded-[8px] border border-tableBorder bg-newBgColorInner p-3 flex flex-col gap-2">
                  <div className="text-[13px] font-[600]">
                    {categoryId ? 'Edit category' : 'Create category'}
                  </div>
                  <input
                    autoFocus
                    value={categoryDraftName}
                    onChange={(e) => setCategoryDraftName(e.target.value)}
                    placeholder="Category name"
                    className="field"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[12px] text-newTextColor/70">Color</label>
                    <input
                      type="color"
                      value={categoryDraftColor}
                      onChange={(e) => setCategoryDraftColor(e.target.value)}
                      className="h-[36px] w-[48px] rounded border border-tableBorder bg-transparent"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={categoryBusy || !categoryDraftName.trim()}
                      onClick={createCategory}
                      className="px-3 py-2 rounded bg-[#612BD3] text-white disabled:opacity-50"
                    >
                      Create new
                    </button>
                    {categoryId ? (
                      <>
                        <button
                          type="button"
                          disabled={categoryBusy || !categoryDraftName.trim()}
                          onClick={renameCategory}
                          className="px-3 py-2 rounded bg-third disabled:opacity-50"
                        >
                          Save rename
                        </button>
                        <button
                          type="button"
                          disabled={categoryBusy}
                          onClick={archiveCategory}
                          className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50"
                        >
                          Archive
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={categoryBusy}
                      onClick={() => setShowCategoryManager(false)}
                      className="px-3 py-2 rounded border border-tableBorder"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[12px] text-newTextColor/60">
                    Categories are organization-wide. Archive hides them from the picker; existing media stays available.
                  </p>
                </div>
              )}
            </div>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Tags">
            <TagsComponent
              name="tags"
              label="Tags"
              initial={selectedTags}
              onChange={(e) => setSelectedTags(e.target.value || [])}
            />
          </Field>
          <p className="text-[12px] text-newTextColor/60 mt-1">Same organization tags as posts — open the picker to select or create.</p>
        </div>
      </section>
      <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="field min-h-[80px]" /></Field>
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
      <section className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
        <Field label="People (comma separated)"><input value={people} onChange={(e) => setPeople(e.target.value)} className="field" /></Field>
        <Field label="Products (comma separated)"><input value={products} onChange={(e) => setProducts(e.target.value)} className="field" /></Field>
        <Field label="Keywords (comma separated)"><input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="field" /></Field>
        <Field label="Recommended platforms (comma separated)"><input value={platforms} onChange={(e) => setPlatforms(e.target.value)} className="field" placeholder="instagram, facebook" /></Field>
        <Field label="Content languages (BCP-47, comma separated)"><input value={languages} onChange={(e) => setLanguages(e.target.value)} className="field" placeholder="en, fr-FR" /></Field>
        <Field label="Crop focus X / Y"><div className="flex gap-2"><input type="number" min="0" max="1" step="0.01" value={focusX} onChange={(e) => setFocusX(e.target.value)} className="field" /><input type="number" min="0" max="1" step="0.01" value={focusY} onChange={(e) => setFocusY(e.target.value)} className="field" /></div></Field>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-[12px] border-t border-tableBorder pt-4">
        <Field label="Source"><input value={source} onChange={(e) => setSource(e.target.value)} className="field" /></Field>
        <Field label="Source URL"><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="field" /></Field>
        <Field label="Author / attribution"><input value={attribution} onChange={(e) => setAttribution(e.target.value)} className="field" /></Field>
        <Field label="Copyright owner"><input value={copyrightOwner} onChange={(e) => setCopyrightOwner(e.target.value)} className="field" /></Field>
        <Field label="License"><select value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className="field">{['unknown','owned','licensed','creative_commons','third_party','public_domain'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></Field>
        <Field label="License URL"><input value={licenseUrl} onChange={(e) => setLicenseUrl(e.target.value)} className="field" /></Field>
        <Field label="Expires at"><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="field" /></Field>
      </section>
      <div className="flex gap-2"><button type="button" disabled={loading} onClick={reanalyze} className="px-4 py-2 rounded bg-third">Analyze technical metadata</button><button type="button" disabled={loading} onClick={analyze} className="px-4 py-2 rounded bg-third">AI suggestions</button></div>
      {hasExtension(media?.path, 'mp4') && (
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
  );
};

const Field: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="flex flex-col gap-1 text-sm text-textColor"><span>{label}</span>{children}<style jsx>{`.field { width: 100%; padding: 0.5rem 0.75rem; background: var(--newBgColorInner, #171717); border: 1px solid var(--tableBorder, #444); border-radius: .5rem; color: inherit; }`}</style></label>;
