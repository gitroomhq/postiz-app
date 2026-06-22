'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';

interface UserTagItem {
  label: string;
  x: number;
  y: number;
}

export const InstagramUserTags: FC<{
  name: string;
  onChange: (event: { target: { value: UserTagItem[]; name: string } }) => void;
}> = ({ name, onChange }) => {
  const { getValues } = useSettings();
  const { value: posts } = useIntegration();
  const [tags, setTags] = useState<UserTagItem[]>([]);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingName, setPendingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const images = posts[0]?.image || [];
  const imageUrl = images[0]?.path;
  const isVideo =
    !!imageUrl && (imageUrl.includes('.mp4') || imageUrl.includes('.mov'));
  const isCarousel = images.length > 1;

  useEffect(() => {
    const saved = getValues()[name];
    if (Array.isArray(saved) && saved.length) setTags(saved);
  }, []);

  const update = useCallback(
    (newTags: UserTagItem[]) => {
      setTags(newTags);
      onChange({ target: { value: newTags, name } });
    },
    [name, onChange]
  );

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tags.length >= 20) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      setPendingPos({ x, y });
      setPendingName('');
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [tags.length]
  );

  const confirm = useCallback(() => {
    if (!pendingName.trim() || !pendingPos) return;
    update([
      ...tags,
      {
        label: pendingName.trim().replace(/^@/, ''),
        x: pendingPos.x,
        y: pendingPos.y,
      },
    ]);
    setPendingPos(null);
    setPendingName('');
  }, [pendingName, pendingPos, tags, update]);

  const cancel = useCallback(() => {
    setPendingPos(null);
    setPendingName('');
  }, []);

  const removeTag = useCallback(
    (i: number) => update(tags.filter((_, idx) => idx !== i)),
    [tags, update]
  );

  if (!imageUrl || isVideo || isCarousel) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="text-[14px]">
        Tag users (max 20) — click image to place tag
      </div>

      <div
        className="relative cursor-crosshair select-none rounded-[8px] overflow-hidden"
        onClick={handleImageClick}
      >
        <img
          src={imageUrl}
          className="w-full h-auto block pointer-events-none"
          alt="Post preview"
        />

        {/* Placed tags */}
        {tags.map((tag, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${tag.x * 100}%`,
              top: `${tag.y * 100}%`,
              transform: 'translate(-50%, -100%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/90 text-black text-[11px] px-[6px] py-[2px] rounded flex items-center gap-[4px] whitespace-nowrap shadow">
              @{tag.label}
              <button
                className="opacity-60 hover:opacity-100 text-[13px] font-bold leading-none ml-[2px]"
                onClick={() => removeTag(i)}
              >
                ×
              </button>
            </div>
            <div className="w-[2px] h-[6px] bg-white/80 mx-auto" />
          </div>
        ))}

        {/* Pending tag input */}
        {pendingPos && (
          <div
            className="absolute z-20"
            style={{
              left: `${pendingPos.x * 100}%`,
              top: `${pendingPos.y * 100}%`,
              transform:
                pendingPos.y < 0.2
                  ? 'translate(-50%, 8px)'
                  : 'translate(-50%, calc(-100% - 6px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-newBgColorInner border border-newTableBorder rounded-[6px] px-[10px] py-[6px] shadow-xl flex items-center gap-[6px]">
              <input
                ref={inputRef}
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirm();
                  }
                  if (e.key === 'Escape') cancel();
                }}
                className="bg-transparent outline-none text-[12px] w-[120px] text-textColor placeholder-textColor"
                placeholder="@username"
              />
              <button
                className="opacity-60 hover:opacity-100 text-[12px]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  confirm();
                }}
              >
                ✓
              </button>
              <button
                className="opacity-60 hover:opacity-100 text-[12px]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  cancel();
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          {tags.map((tag, i) => (
            <div
              key={i}
              className="flex items-center gap-[4px] bg-newBgColorInner border border-newTableBorder rounded-[4px] px-[8px] py-[3px] text-[12px]"
            >
              @{tag.label}
              <button
                className="opacity-60 hover:opacity-100 font-bold"
                onClick={() => removeTag(i)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
