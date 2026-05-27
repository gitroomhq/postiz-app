import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { BentoGrid, BentoItem } from '@gitroom/frontend/components/ui/bento-grid';
import { PlatformPill } from '@gitroom/frontend/components/ui/platform-pill';
import { type PlatformKey, PLATFORM_LABELS } from '@gitroom/frontend/components/ui/platform-icons';
import { ContentGrid } from '@gitroom/frontend/components/creator-showcase/content-grid';
import type { ContentPost } from '@gitroom/frontend/components/creator-showcase/content-data';
import {
  getCreatorPlatformDetail,
  type PlatformPostRow,
} from '@gitroom/frontend/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { id: string; platform: string };

const VALID: PlatformKey[] = [
  'instagram',
  'tiktok',
  'douyin',
  'facebook',
  'xiaohongshu',
];

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id, platform } = await params;
  const key = platform.toLowerCase() as PlatformKey;
  const label = PLATFORM_LABELS[key] ?? platform;
  return {
    title: `${id} on ${label} — D3 Creator`,
    description: `Live ${label} stats for ${id} — followers, engagement, and recent posts.`,
  };
}

export default async function CreatorPlatformPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, platform } = await params;
  const platformKey = platform.toLowerCase() as PlatformKey;
  if (!VALID.includes(platformKey)) notFound();

  const detail = await getCreatorPlatformDetail(id, platformKey).catch((err) => {
    console.error('[creators/[id]/[platform]] getCreatorPlatformDetail failed', err);
    return null;
  });
  if (!detail) notFound();
  const { creator, slot, posts } = detail;

  const livePosts: ContentPost[] = posts.map((p: PlatformPostRow): ContentPost => ({
    id: `${creator.creatorId}-${platformKey}-${p.externalId}`,
    creatorSlug: id.toLowerCase(),
    platform: platformKey,
    externalId: p.externalId,
    url: p.url,
    type: p.type === 'note' || p.type === 'text' ? 'image' : p.type,
    thumbnailUrl: p.thumbnailUrl,
    previewVideoUrl: null, // not provided by current IG adapter
    caption: p.caption,
    hashtags: p.hashtags,
    publishedAt: p.publishedAt,
    metrics: {
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      views: p.views,
      saves: null,
    },
    mediaCount: p.mediaCount,
    durationSec: p.durationSec,
  }));

  return (
    <div className="flex flex-col gap-16 pt-12 pb-24">
      <header className="max-w-[760px]">
        <Link
          href={`/creators/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-1.5 text-caption text-fgMuted hover:text-fg transition-colors mb-6"
        >
          <span>←</span> Back to {creator.displayName}
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <PlatformPill platform={platformKey} />
          {slot?.handle && (
            <span className="text-caption text-fgSubtle">@{slot.handle}</span>
          )}
        </div>
        <h1 className="text-display-2 text-fg leading-[1.04]">
          {creator.displayName} on {PLATFORM_LABELS[platformKey]}
        </h1>
        {slot?.nickname && (
          <p className="mt-2 text-body-sm text-fgMuted">{slot.nickname}</p>
        )}
      </header>

      <BentoGrid gap="md">
        <BentoItem colSpan={3} tabletColSpan={6}>
          <StatCard
            label="Followers"
            value={slot?.followers != null ? compact.format(slot.followers) : '—'}
          />
        </BentoItem>
        <BentoItem colSpan={3} tabletColSpan={6}>
          <StatCard
            label="Following"
            value={slot?.following != null ? compact.format(slot.following) : '—'}
          />
        </BentoItem>
        <BentoItem colSpan={3} tabletColSpan={6}>
          <StatCard
            label="Total Views"
            note="last 30 posts"
            value={slot?.totalViews ? compact.format(slot.totalViews) : '—'}
          />
        </BentoItem>
        <BentoItem colSpan={3} tabletColSpan={6}>
          <StatCard
            label="Total Likes"
            note="last 30 posts"
            value={slot?.totalLikes ? compact.format(slot.totalLikes) : '—'}
          />
        </BentoItem>
      </BentoGrid>

      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-heading text-fg">Recent Posts</h2>
            <p className="text-caption text-fgMuted">
              {livePosts.length > 0
                ? `${livePosts.length} most recent · hover to preview, click to open`
                : slot
                  ? 'Syncing — first batch lands within minutes after the next cron run'
                  : 'No profile tracked for this platform'}
            </p>
          </div>
        </div>
        {livePosts.length > 0 ? (
          <ContentGrid
            creatorSlug={id.toLowerCase()}
            platform={platformKey}
            posts={livePosts}
          />
        ) : (
          <div className="rounded-xl bg-glass-subtle border border-borderGlass h-[280px] flex items-center justify-center">
            <p className="text-body-sm text-fgMuted">
              No posts yet for this profile.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <GlassCard
      variant="base"
      hover
      padding="lg"
      radius="2xl"
      className="h-full text-left"
    >
      <div className="flex items-center justify-between mb-6">
        <span className="text-micro uppercase text-fgSubtle">{label}</span>
        {note && (
          <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
            {note}
          </span>
        )}
      </div>
      <div className="text-[clamp(36px,4vw,48px)] leading-[1.04] tracking-[-0.03em] font-semibold text-fg tabular-nums">
        {value}
      </div>
    </GlassCard>
  );
}
