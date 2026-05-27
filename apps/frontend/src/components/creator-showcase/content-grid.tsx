'use client';

import { useMemo, useState } from 'react';
import type { PlatformKey } from '../ui/platform-icons';
import { ContentThumb } from './content-thumb';
import { ContentLightbox } from './content-lightbox';
import { getCreatorPosts, type ContentPost } from './content-data';

interface ContentGridProps {
  creatorSlug: string;
  platform: PlatformKey;
  /** Number of posts to render (default 24) */
  limit?: number;
}

export function ContentGrid({ creatorSlug, platform, limit = 24 }: ContentGridProps) {
  const posts = useMemo(() => {
    const all = getCreatorPosts(creatorSlug, platform);
    return [...all]
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, limit);
  }, [creatorSlug, platform, limit]);

  const [open, setOpen] = useState<ContentPost | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {posts.map((post) => (
          <ContentThumb key={post.id} post={post} onOpen={setOpen} />
        ))}
      </div>
      <ContentLightbox post={open} onClose={() => setOpen(null)} />
    </>
  );
}
