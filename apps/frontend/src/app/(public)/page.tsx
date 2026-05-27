import { Metadata } from 'next';
import Link from 'next/link';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { BentoGrid, BentoItem } from '@gitroom/frontend/components/ui/bento-grid';
import { AuroraButton } from '@gitroom/frontend/components/ui/aurora-button';
import { AnimatedList } from '@gitroom/frontend/components/ui/animated-list';
import { PlatformPill } from '@gitroom/frontend/components/ui/platform-pill';
import { PlatformKey } from '@gitroom/frontend/components/ui/platform-icons';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'D3 Creator — Real creators. Real numbers. Live.',
  description:
    'D3 Creator is a live public showcase of the creators we grow. Real follower counts, real engagement, real growth — across Instagram, TikTok, Facebook, Douyin, and Xiaohongshu (RedNote).',
};

const PLATFORMS: PlatformKey[] = [
  'instagram',
  'tiktok',
  'facebook',
  'douyin',
  'xiaohongshu',
];

const STATS = [
  {
    label: 'Total Followers',
    note: 'Combined reach across every creator we track.',
  },
  {
    label: 'Active Creators',
    note: 'Creators currently growing with D3.',
  },
  {
    label: '30-Day Growth',
    note: 'New followers added in the last 30 days.',
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero — single focal point, generous breathing room */}
      <section className="w-full pt-12 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 max-w-[1100px] mx-auto text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-8">
          <span className="inline-block size-1.5 rounded-full bg-brand" />
          Live Creator Showcase
        </span>
        <h1 className="text-display-1 text-fg mb-6 max-w-[900px] mx-auto">
          Real creators. Real numbers. Live.
        </h1>
        <p className="text-body-lg text-fgMuted max-w-[600px] mx-auto mb-10">
          A public window into the creators we grow at D3. Follower counts,
          engagement, and growth — updated live across every platform we run.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard" className="contents">
            <AuroraButton variant="cta" size="lg">
              View Dashboard
            </AuroraButton>
          </Link>
          <Link href="/leaderboard" className="contents">
            <AuroraButton variant="ghost" size="lg">
              View Leaderboard
            </AuroraButton>
          </Link>
        </div>
      </section>

      {/* Platforms — single quiet row */}
      <section className="w-full pb-20 sm:pb-24 max-w-[1100px] mx-auto">
        <AnimatedList
          stagger={50}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {PLATFORMS.map((platform) => (
            <PlatformPill key={platform} platform={platform} />
          ))}
        </AnimatedList>
      </section>

      {/* Stats bento */}
      <section className="w-full pb-16 sm:pb-20 max-w-[1100px] mx-auto">
        <BentoGrid gap="md" className="w-full">
          {STATS.map((stat) => (
            <BentoItem key={stat.label} colSpan={4} tabletColSpan={6}>
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
                <div className="text-[clamp(40px,5vw,56px)] leading-[1.04] tracking-[-0.03em] font-semibold text-fg mb-4">
                  —
                </div>
                <p className="text-body-sm text-fgMuted">{stat.note}</p>
              </GlassCard>
            </BentoItem>
          ))}
        </BentoGrid>

        <p className="text-caption text-fgSubtle text-center mt-12">
          Numbers go live the moment our scraper kicks in.
        </p>
      </section>
    </div>
  );
}
