import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { BentoGrid, BentoItem } from '@gitroom/frontend/components/ui/bento-grid';
import { PlatformPill } from '@gitroom/frontend/components/ui/platform-pill';
import { PlatformKey } from '@gitroom/frontend/components/ui/platform-icons';

export const dynamic = 'force-dynamic';

type Params = { id: string; platform: string };

const VALID_PLATFORMS: Record<string, { label: string }> = {
  instagram: { label: 'Instagram' },
  facebook: { label: 'Facebook' },
  tiktok: { label: 'TikTok' },
  douyin: { label: 'Douyin' },
  xiaohongshu: { label: 'Xiaohongshu' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id, platform } = await params;
  const platformInfo = VALID_PLATFORMS[platform.toLowerCase()];
  const platformLabel = platformInfo?.label ?? platform;
  return {
    title: `${id} on ${platformLabel} — D3 Creator`,
    description: `Live ${platformLabel} stats for creator ${id} — followers, engagement, and growth.`,
  };
}

export default async function CreatorPlatformPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, platform } = await params;
  const platformKey = platform.toLowerCase();
  const platformInfo = VALID_PLATFORMS[platformKey];

  if (!platformInfo) {
    notFound();
  }

  const headlineStats = [
    { label: 'Followers' },
    { label: 'Following' },
    { label: 'Posts' },
    { label: 'Engagement Rate' },
  ];

  return (
    <div className="flex flex-col gap-16 pt-12 pb-24">
      <header className="max-w-[760px]">
        <Link
          href={`/creators/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-1.5 text-caption text-fgMuted hover:text-fg transition-colors mb-6"
        >
          <span>←</span> Back to {id}
        </Link>
        <div className="mb-4">
          <PlatformPill platform={platformKey as PlatformKey} />
        </div>
        <h1 className="text-display-2 text-fg leading-[1.04]">
          {id} on <span className="text-brand">{platformInfo.label}</span>
        </h1>
      </header>

      <BentoGrid gap="md">
        {headlineStats.map((stat) => (
          <BentoItem key={stat.label} colSpan={3} tabletColSpan={6}>
            <GlassCard
              variant="base"
              hover
              padding="lg"
              radius="2xl"
              className="h-full text-left"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-micro uppercase text-fgSubtle">
                  {stat.label}
                </span>
                <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
                  Soon
                </span>
              </div>
              <div className="text-[clamp(36px,4vw,48px)] leading-[1.04] tracking-[-0.03em] font-semibold text-fg">
                —
              </div>
            </GlassCard>
          </BentoItem>
        ))}
      </BentoGrid>

      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading text-fg">
            Follower Growth — Last 30 Days
          </h2>
          <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
            Soon
          </span>
        </div>
        <div className="rounded-xl bg-glass-subtle border border-borderGlass h-[280px] flex items-center justify-center">
          <p className="text-body-sm text-fgMuted">
            Chart appears once tracking starts.
          </p>
        </div>
      </GlassCard>

      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading text-fg">Recent Posts</h2>
          <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
            Soon
          </span>
        </div>
        <div className="rounded-xl bg-glass-subtle border border-borderGlass p-12 text-center">
          <p className="text-body-sm text-fgMuted">
            Posts appear once scraper indexes this account.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
