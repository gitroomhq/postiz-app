'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type PlatformKey =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'douyin'
  | 'xiaohongshu';

const PLATFORMS: Array<{ key: PlatformKey; label: string; placeholder: string }> = [
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/handle',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/handle',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@handle',
  },
  {
    key: 'douyin',
    label: 'Douyin',
    placeholder: 'https://www.douyin.com/user/...',
  },
  {
    key: 'xiaohongshu',
    label: 'Xiaohongshu',
    placeholder: 'https://www.xiaohongshu.com/user/profile/...',
  },
];

export interface CreatorFormValues {
  name: string;
  slug: string;
  urls: Record<PlatformKey, string>;
}

interface Props {
  mode: 'create' | 'edit';
  initial?: CreatorFormValues;
}

const inputClass =
  'w-full px-[14px] py-[10px] rounded-[8px] bg-[#0E0E0E] border border-[#252525] text-[14px] text-white placeholder:text-[#696868] focus:outline-none focus:border-[#1D4ED8]/60 transition-colors';

const labelClass = 'block text-[12px] uppercase tracking-[1px] text-[#9c9c9c] mb-[6px]';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const emptyValues: CreatorFormValues = {
  name: '',
  slug: '',
  urls: {
    instagram: '',
    facebook: '',
    tiktok: '',
    douyin: '',
    xiaohongshu: '',
  },
};

export function CreatorForm({ mode, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<CreatorFormValues>(
    initial ?? emptyValues
  );
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    mode === 'edit'
  );

  const onNameChange = (next: string) => {
    setValues((v) => ({
      ...v,
      name: next,
      slug: slugManuallyEdited ? v.slug : slugify(next),
    }));
  };

  const onSlugChange = (next: string) => {
    setSlugManuallyEdited(true);
    setValues((v) => ({ ...v, slug: slugify(next) }));
  };

  const onUrlChange = (key: PlatformKey, next: string) => {
    setValues((v) => ({ ...v, urls: { ...v.urls, [key]: next } }));
  };

  const hasAnyUrl = Object.values(values.urls).some((u) => u.trim().length > 0);
  const canSubmit = values.name.trim().length > 0 && values.slug.length > 0 && hasAnyUrl;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    window.alert(
      `Save wiring lands with the scraper backend. Form values would be:\n\n${JSON.stringify(values, null, 2)}`
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[24px]">
      <div className="p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525] flex flex-col gap-[20px]">
        <div>
          <label className={labelClass} htmlFor="creator-name">
            Display name
          </label>
          <input
            id="creator-name"
            type="text"
            className={inputClass}
            placeholder="e.g. Ada Lim"
            value={values.name}
            onChange={(e) => onNameChange(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="creator-slug">
            URL slug
          </label>
          <input
            id="creator-slug"
            type="text"
            className={inputClass}
            placeholder="ada-lim"
            value={values.slug}
            onChange={(e) => onSlugChange(e.target.value)}
            required
          />
          <p className="text-[11px] text-[#696868] mt-[6px]">
            Public URL will be{' '}
            <span className="text-[#9c9c9c]">/creators/{values.slug || '…'}</span>
          </p>
        </div>
      </div>

      <div className="p-[24px] rounded-[12px] bg-[#1A1919] border border-[#252525] flex flex-col gap-[16px]">
        <div>
          <h2 className="text-[16px] font-semibold text-white mb-[4px]">
            Platform URLs
          </h2>
          <p className="text-[12px] text-[#9c9c9c]">
            Add one or more profile URLs. Leave any platform blank if not
            applicable.
          </p>
        </div>

        {PLATFORMS.map((p) => (
          <div key={p.key}>
            <label className={labelClass} htmlFor={`url-${p.key}`}>
              {p.label}
            </label>
            <input
              id={`url-${p.key}`}
              type="url"
              className={inputClass}
              placeholder={p.placeholder}
              value={values.urls[p.key]}
              onChange={(e) => onUrlChange(p.key, e.target.value)}
            />
          </div>
        ))}

        {!hasAnyUrl && (
          <p className="text-[11px] text-[#f97066]">
            Add at least one platform URL to save.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-[12px]">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="px-[20px] py-[12px] rounded-[10px] bg-[#0E0E0E] border border-[#252525] hover:border-[#454444] text-white text-[14px] font-semibold transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-[20px] py-[12px] rounded-[10px] bg-[#1D4ED8] hover:bg-[#1842b8] disabled:bg-[#252525] disabled:text-[#696868] disabled:cursor-not-allowed text-white text-[14px] font-semibold transition-colors"
        >
          {mode === 'create' ? 'Add creator' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
