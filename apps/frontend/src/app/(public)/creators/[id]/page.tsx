import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { BentoGrid, BentoItem } from '@gitroom/frontend/components/ui/bento-grid';
import {
  PLATFORM_ICONS,
  PLATFORM_LABELS,
  type PlatformKey,
} from '@gitroom/frontend/components/ui/platform-icons';
import {
  getCreatorByHandle,
  type CreatorPlatformSlot,
} from '@gitroom/frontend/lib/queries';

// ISR: 1h cache, see (public)/page.tsx for rationale.
export const revalidate = 3600;

type Params = { id: string };

const SUPPORTED: PlatformKey[] = [
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
const exact = new Intl.NumberFormat('en-US');

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const creator = await getCreatorByHandle(id).catch(() => null);
  const name = creator?.displayName ?? id;
  return {
    title: `${name} — D3 Creator`,
    description: `Live follower counts, engagement, and growth for ${name} across every platform.`,
  };
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const creator = await getCreatorByHandle(id).catch((err) => {
    console.error('[creators/[id]] getCreatorByHandle failed', err);
    return null;
  });

  if (!creator) {
    notFound();
  }

  let totalLikes = 0;
  let totalViews = 0;
  for (const p of creator.platforms as CreatorPlatformSlot[]) {
    totalLikes += p.totalLikes ?? 0;
    totalViews += p.totalViews ?? 0;
  }

  return (
    <div className="flex flex-col gap-16 pt-12 pb-24">
      {/* Header */}
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-2xl glass-subtle border border-borderGlass overflow-hidden flex items-center justify-center text-heading text-brand font-semibold shrink-0">
            {creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              creator.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-3">
              Creator profile
            </span>
            <h1 className="text-display-2 text-fg leading-[1.04]">
              {creator.displayName}
            </h1>
            {creator.biography && (
              <p className="mt-3 text-body-sm text-fgMuted max-w-[640px] whitespace-pre-line">
                {creator.biography}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Headline stats */}
      <BentoGrid gap="md">
        <BentoItem colSpan={4} tabletColSpan={6}>
          <GlassCard variant="base" hover padding="lg" radius="2xl" className="h-full text-left">
            <div className="flex items-center justify-between mb-6">
              <span className="text-micro uppercase text-fgSubtle">Total Followers</span>
            </div>
            <div className="text-[clamp(40px,5vw,56px)] leading-[1.04] tracking-[-0.03em] font-semibold text-fg tabular-nums">
              {compact.format(creator.totalFollowers)}
            </div>
            <p className="text-caption text-fgSubtle mt-2 tabular-nums">
              {exact.format(creator.totalFollowers)} across {creator.platforms.length} platform{creator.platforms.length === 1 ? '' : 's'}
            </p>
          </GlassCard>
        </BentoItem>

        <BentoItem colSpan={4} tabletColSpan={6}>
          <GlassCard variant="base" hover padding="lg" radius="2xl" className="h-full text-left">
            <div className="flex items-center justify-between mb-6">
              <span className="text-micro uppercase text-fgSubtle">Total Views</span>
              <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
                Last 30 posts
              </span>
            </div>
            <div className="text-[clamp(40px,5vw,56px)] leading-[1.04] tracking-[-0.03em] font-semibold text-fg tabular-nums">
              {totalViews > 0 ? compact.format(totalViews) : '—'}
            </div>
          </GlassCard>
        </BentoItem>

        <BentoItem colSpan={4} tabletColSpan={12}>
          <GlassCard variant="base" hover padding="lg" radius="2xl" className="h-full text-left">
            <div className="flex items-center justify-between mb-6">
              <span className="text-micro uppercase text-fgSubtle">Total Likes</span>
              <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
                Last 30 posts
              </span>
            </div>
            <div className="text-[clamp(40px,5vw,56px)] leading-[1.04] tracking-[-0.03em] font-semibold text-fg tabular-nums">
              {totalLikes > 0 ? compact.format(totalLikes) : '—'}
            </div>
          </GlassCard>
        </BentoItem>
      </BentoGrid>

      {/* Platforms */}
      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading text-fg">Platforms</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUPPORTED.map((key) => {
            const Icon = PLATFORM_ICONS[key];
            const slot = creator.platforms.find(
              (p: CreatorPlatformSlot) => p.platform === key,
            );
            const followers = slot?.followers;
            const hasData = followers !== null && followers !== undefined;

            return (
              <Link
                key={key}
                href={`/creators/${encodeURIComponent(id)}/${key}`}
                className={
                  slot
                    ? 'group flex items-center justify-between p-4 rounded-xl glass-subtle border border-borderGlass hover:border-borderGlassStrong hover:bg-white/[0.04] transition-colors'
                    : 'flex items-center justify-between p-4 rounded-xl border border-dashed border-borderGlass opacity-50 pointer-events-none'
                }
              >
                <span className="flex items-center gap-2.5 text-label text-fg">
                  <Icon size={16} className="text-fg shrink-0" />
                  {PLATFORM_LABELS[key]}
                </span>
                <span className="text-caption tabular-nums text-fgSubtle group-hover:text-brand transition-colors">
                  {slot ? (hasData ? compact.format(followers!) : 'syncing') : 'not tracked'}
                </span>
              </Link>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
