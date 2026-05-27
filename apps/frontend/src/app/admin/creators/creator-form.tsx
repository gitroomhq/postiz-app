'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { AuroraButton } from '@gitroom/frontend/components/ui/aurora-button';
import {
  PLATFORM_ICONS,
  PlatformKey,
} from '@gitroom/frontend/components/ui/platform-icons';

const PLATFORMS: Array<{
  key: PlatformKey;
  label: string;
  placeholder: string;
}> = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/handle' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/handle' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@handle' },
  { key: 'douyin', label: 'Douyin', placeholder: 'https://www.douyin.com/user/...' },
  { key: 'xiaohongshu', label: 'Xiaohongshu', placeholder: 'https://www.xiaohongshu.com/user/profile/...' },
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
  'w-full px-3.5 py-2.5 bg-glass-subtle border border-borderGlass rounded-lg text-body-sm text-fg placeholder:text-fgSubtle focus:outline-none focus:border-aurora-violet/60 focus:shadow-focusRing transition-[border-color,box-shadow] duration-180 ease-out';

const labelClass = 'block text-micro uppercase text-fgSubtle mb-1.5';

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
  const [values, setValues] = useState<CreatorFormValues>(initial ?? emptyValues);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === 'edit');

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
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex flex-col gap-5">
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
            <p className="text-caption text-fgSubtle mt-1.5">
              Public URL will be{' '}
              <span className="font-mono text-aurora-violet">/creators/{values.slug || '…'}</span>
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard variant="base" glow="aurora" padding="lg" radius="2xl">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-subsection text-fg mb-1">Platform URLs</h2>
            <p className="text-body-sm text-fgMuted">
              Add one or more profile URLs. Leave any platform blank if not applicable.
            </p>
          </div>

          {PLATFORMS.map((p) => {
            const Icon = PLATFORM_ICONS[p.key];
            return (
              <div key={p.key}>
                <label className={labelClass} htmlFor={`url-${p.key}`}>
                  <span className="inline-flex items-center gap-2">
                    <Icon size={12} className="text-fgMuted shrink-0" />
                    {p.label}
                  </span>
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
            );
          })}

          {!hasAnyUrl && (
            <p className="text-caption text-aurora-cta">
              Add at least one platform URL to save.
            </p>
          )}
        </div>
      </GlassCard>

      <div className="flex items-center justify-end gap-3">
        <AuroraButton
          type="button"
          variant="ghost"
          size="md"
          onClick={() => router.push('/admin')}
        >
          Cancel
        </AuroraButton>
        <AuroraButton type="submit" variant="cta" size="md" disabled={!canSubmit}>
          {mode === 'create' ? 'Add creator' : 'Save changes'}
        </AuroraButton>
      </div>
    </form>
  );
}
