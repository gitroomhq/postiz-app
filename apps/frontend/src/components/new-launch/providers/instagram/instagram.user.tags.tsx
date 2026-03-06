'use client';

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { ReactTags } from 'react-tag-autocomplete';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

interface TagWithPosition {
  label: string;
  value: string;
  x?: number;
  y?: number;
}

interface UserTagsForImage {
  tags: TagWithPosition[];
}

export const InstagramUserTagPlacer: FC<{
  name: string;
  onChange: (event: {
    target: { value: UserTagsForImage[]; name: string };
  }) => void;
}> = (props) => {
  const { onChange, name } = props;
  const { getValues } = useSettings();
  const { value: integrationValue } = useIntegration();
  const mediaDir = useMediaDirectory();
  const t = useT();
  const imageRef = useRef<HTMLDivElement>(null);

  // All media items for the first post
  const allMedia = integrationValue[0]?.image ?? [];
  // Indices into allMedia that are images (not videos)
  const imageIndices = allMedia
    .map((img, i) => ({ img, i }))
    .filter(({ img }) => !img.path.endsWith('.mp4'))
    .map(({ i }) => i);

  // tagsByMedia[i] = tags for allMedia[i]
  const [tagsByMedia, setTagsByMedia] = useState<UserTagsForImage[]>([]);
  // The currently selected allMedia index (only images)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(
    imageIndices[0] ?? 0
  );
  const [selectedTagIndex, setSelectedTagIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string>('');
  const maxTags = 20;

  const currentTags: TagWithPosition[] =
    tagsByMedia[selectedMediaIndex]?.tags ?? [];
  const currentImage = allMedia[selectedMediaIndex];

  useEffect(() => {
    const settings = getValues()[name];
    if (settings && Array.isArray(settings)) {
      setTagsByMedia(settings);
    } else {
      setTagsByMedia(allMedia.map(() => ({ tags: [] as TagWithPosition[] })));
    }
  }, []);

  const notify = useCallback(
    (newTagsByMedia: UserTagsForImage[]) => {
      onChange({ target: { value: newTagsByMedia, name } });
    },
    [name, onChange]
  );

  const updateTagsForCurrentImage = useCallback(
    (newTags: TagWithPosition[]) => {
      const updated = allMedia.map((_, i) =>
        i === selectedMediaIndex
          ? { tags: newTags }
          : tagsByMedia[i] ?? { tags: [] }
      );
      setTagsByMedia(updated);
      notify(updated);
    },
    [allMedia, selectedMediaIndex, tagsByMedia, notify]
  );

  const onDelete = useCallback(
    (tagIndex: number) => {
      const newTags = currentTags.filter((_, i) => i !== tagIndex);
      updateTagsForCurrentImage(newTags);
      if (selectedTagIndex === tagIndex) {
        setSelectedTagIndex(null);
      } else if (selectedTagIndex !== null && selectedTagIndex > tagIndex) {
        setSelectedTagIndex(selectedTagIndex - 1);
      }
    },
    [currentTags, selectedTagIndex, updateTagsForCurrentImage]
  );

  const onAddition = useCallback(
    (newTag: any) => {
      if (currentTags.length >= maxTags) return;
      const newTags = [...currentTags, { ...newTag, x: undefined, y: undefined }];
      updateTagsForCurrentImage(newTags);
      setSelectedTagIndex(newTags.length - 1);
    },
    [currentTags, updateTagsForCurrentImage]
  );

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (selectedTagIndex === null || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      const newTags = currentTags.map((tag, i) =>
        i === selectedTagIndex ? { ...tag, x, y } : tag
      );
      updateTagsForCurrentImage(newTags);
    },
    [selectedTagIndex, currentTags, updateTagsForCurrentImage]
  );

  const switchImage = useCallback((mediaIndex: number) => {
    setSelectedMediaIndex(mediaIndex);
    setSelectedTagIndex(null);
    setSuggestions('');
  }, []);

  const suggestionsArray = useMemo(
    () =>
      [...currentTags, { label: suggestions, value: suggestions }].filter(
        (f) => f.label
      ),
    [suggestions, currentTags]
  );

  if (imageIndices.length === 0) {
    return (
      <div className="text-[14px] text-gray-400">
        Add an image to tag users
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Image thumbnail tabs — only shown for carousels with multiple images */}
      {imageIndices.length > 1 && (
        <div className="flex gap-[6px] overflow-x-auto pb-[4px]">
          {imageIndices.map((mediaIdx) => (
            <button
              key={mediaIdx}
              type="button"
              onClick={() => switchImage(mediaIdx)}
              className={clsx(
                'relative flex-shrink-0 w-[52px] h-[52px] rounded-[6px] overflow-hidden border-2 transition-all',
                mediaIdx === selectedMediaIndex
                  ? 'border-white opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-75'
              )}
            >
              <img
                src={mediaDir.set(allMedia[mediaIdx].path)}
                alt={`Image ${mediaIdx + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
              {(tagsByMedia[mediaIdx]?.tags?.length ?? 0) > 0 && (
                <div className="absolute top-[2px] right-[2px] bg-primary rounded-full w-[14px] h-[14px] flex items-center justify-center text-[8px] text-white font-bold">
                  {tagsByMedia[mediaIdx].tags.length}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tag input */}
      <div>
        <div className="text-[14px] mb-[6px]">
          {imageIndices.length > 1
            ? `Tag users on image ${imageIndices.indexOf(selectedMediaIndex) + 1} (max 20) - accounts can't be private`
            : "Tag users (max 20, images only) - accounts can't be private"}
        </div>
        <ReactTags
          placeholderText={t('add_a_tag', 'Add a tag')}
          suggestions={suggestionsArray}
          selected={currentTags}
          onAdd={onAddition}
          onInput={setSuggestions}
          onDelete={onDelete}
        />
      </div>

      {/* Tag placement controls */}
      {currentTags.length > 0 && (
        <>
          <div className="text-[12px] text-gray-400">
            {selectedTagIndex !== null
              ? `Click on the image to place @${currentTags[selectedTagIndex]?.label}`
              : 'Select a tag to place it on the image'}
          </div>

          <div className="flex flex-wrap gap-[6px]">
            {currentTags.map((tag, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setSelectedTagIndex(i === selectedTagIndex ? null : i)
                }
                className={clsx(
                  'px-[8px] py-[4px] rounded-full text-[12px] border transition-colors cursor-pointer',
                  i === selectedTagIndex
                    ? 'bg-white text-black border-white'
                    : tag.x !== undefined
                    ? 'bg-transparent text-primary border-primary'
                    : 'bg-transparent text-gray-400 border-gray-600'
                )}
              >
                @{tag.label}
                {tag.x !== undefined ? ' ✓' : ''}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Image with clickable tag pins */}
      {currentImage && (
        <div
          ref={imageRef}
          className={clsx(
            'relative rounded-[8px] overflow-hidden select-none',
            selectedTagIndex !== null
              ? 'cursor-crosshair ring-2 ring-white ring-opacity-40'
              : 'cursor-default'
          )}
          onClick={handleImageClick}
        >
          <img
            src={mediaDir.set(currentImage.path)}
            alt="Tag placement"
            className="w-full h-auto block"
            draggable={false}
          />
          {currentTags.map((tag, i) =>
            tag.x !== undefined && tag.y !== undefined ? (
              <div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  left: `${tag.x * 100}%`,
                  top: `${tag.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={clsx(
                      'w-[10px] h-[10px] rounded-full border-2 border-white',
                      i === selectedTagIndex ? 'bg-white' : 'bg-primary'
                    )}
                  />
                  <div className="mt-[2px] bg-black bg-opacity-70 text-white text-[10px] px-[4px] py-[1px] rounded whitespace-nowrap">
                    @{tag.label}
                  </div>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
};
