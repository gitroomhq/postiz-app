import { Metadata } from 'next';
import Link from 'next/link';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { BentoGrid, BentoItem } from '@gitroom/frontend/components/ui/bento-grid';
import { AuroraButton } from '@gitroom/frontend/components/ui/aurora-button';
import { Reveal } from '@gitroom/frontend/components/ui/reveal';
import {
  PLATFORM_ICONS,
  PLATFORM_LABELS,
  type PlatformKey,
} from '@gitroom/frontend/components/ui/platform-icons';
import { Sparkline } from '@gitroom/frontend/components/dashboard-showcase/sparkline';
import {
  compactFormatter,
  exactFormatter,
  handleToSlug,
  METRICS,
  signedPercentFormatter,
  summarize,
  TOP_CREATORS,
} from '@gitroom/frontend/components/dashboard-showcase/showcase-data';
import {
  getSiteSummary,
  getTopCreatorsByGrowth,
  getPlatformBreakdown,
  type LiveCreatorRow,
  type LivePlatformBreakdown,
} from '@gitroom/frontend/lib/queries';

// Server Component fetches live counts on each request — disable static
// optimization so the hero never goes stale.
// ISR: regenerate from Supabase at most once per hour. Daily cron writes
// snapshots once/day; 1h cache means at worst data is ~1h stale, no DB hit
// on warm requests, fast TTFB. Background revalidation happens on first
// request after expiry (stale-while-revalidate).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'D3 Creator — Real creators. Real numbers. Live.',
  description:
    'D3 Creator is a live public showcase of the creators we grow. Real follower counts, real engagement, real growth — across Instagram, TikTok, Facebook, Douyin, and Xiaohongshu (RedNote).',
};

const PLATFORM_ORDER: PlatformKey[] = [
  'instagram',
  'tiktok',
  'douyin',
  'facebook',
  'xiaohongshu',
];

export default async function HomePage() {
  const demoSummary = summarize('all');
  // Live counts from Supabase when present; otherwise the design demo stays in.
  // Fire all three queries in parallel — Server Component renders block on
  // the slowest one anyway, no point in serializing.
  const [liveSummary, liveTopCreators, livePlatformBreakdown] = await Promise.all([
    getSiteSummary().catch((err) => {
      console.error('[home] getSiteSummary failed', err);
      return null;
    }),
    getTopCreatorsByGrowth(3).catch((err) => {
      console.error('[home] getTopCreatorsByGrowth failed', err);
      return null;
    }),
    getPlatformBreakdown().catch((err) => {
      console.error('[home] getPlatformBreakdown failed', err);
      return null;
    }),
  ]);

  const summary = liveSummary
    ? {
        ...demoSummary,
        trackedCreators: liveSummary.trackedCreators,
        combinedFollowers: liveSummary.combinedFollowers,
        combinedGrowth30d: liveSummary.combinedFollowersDelta30d,
      }
    : demoSummary;

  // Top Creators bento: live when we have ≥1 creator past the 14-day
  // sufficiency gate with positive 30d growth; else fall back to the
  // synthetic top-3 so the section still has something to show.
  const topThree: TopCreatorCard[] = liveTopCreators
    ? liveTopCreators.map(liveRowToCard)
    : TOP_CREATORS.slice(0, 3).map(demoRowToCard);

  // Per-platform cards: merge live + demo. Each of the five platforms either
  // has live data (preferred) or falls back to its demo entry so the strip
  // always renders five cards.
  const liveByPlatform = new Map<PlatformKey, LivePlatformBreakdown>();
  for (const p of livePlatformBreakdown ?? []) liveByPlatform.set(p.platform, p);

  const allMetrics = METRICS.all;

  return (
    <div className="flex flex-col w-full">
      {/* ----- HERO ----- */}
      <section className="w-full pt-16 pb-20 sm:pt-24 sm:pb-24 lg:pt-32 lg:pb-32 max-w-[1100px] mx-auto text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-8">
            <span className="inline-block size-1.5 rounded-full bg-white/[0.78]" />
            Live creator showcase
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
          <p className="text-caption text-fgSubtle mt-8 tabular-nums">
            {exactFormatter.format(summary.trackedCreators)} creators ·{' '}
            {compactFormatter.format(summary.combinedFollowers)} combined followers
          </p>
        </Reveal>
      </section>

      {/* ----- LIVE PREVIEW BENTO ----- */}
      <section className="w-full pb-20 sm:pb-24 max-w-[1100px] mx-auto">
        <Reveal>
          <SectionLabel
            eyebrow="Live preview"
            title="What's behind the door."
            caption="A snapshot of the dashboard, refreshed continuously."
          />

          <BentoGrid gap="md">
          <BentoItem colSpan={7} rowSpan={2} tabletColSpan={6}>
            <GlassCard
              variant="base"
              padding="lg"
              radius="2xl"
              className="h-full flex flex-col"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex flex-col gap-1">
                  <span className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
                    Top Creators
                  </span>
                  <span className="text-caption text-fgMuted">
                    Ranked by 30d net growth · All platforms
                  </span>
                </div>
                <Link
                  href="/leaderboard"
                  className="group text-caption text-fgSubtle hover:text-fg font-mono transition-colors duration-150 ease-out"
                >
                  See all{' '}
                  <span className="inline-block transition-transform duration-150 ease-out group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>

              <ul className="flex flex-col flex-1 justify-between gap-2">
                {topThree.map((creator) => {
                  const Icon = PLATFORM_ICONS[creator.primaryPlatform];
                  const isWinner = creator.rank === 1;
                  return (
                    <li
                      key={creator.handle}
                      className="border-b border-borderGlass last:border-b-0"
                    >
                      <Link
                        href={`/creators/${handleToSlug(creator.handle)}`}
                        className="grid grid-cols-[40px_minmax(0,1fr)_auto_120px] gap-4 items-center px-1 py-4 rounded-md transition-colors duration-150 ease-out hover:bg-white/[0.025] focus-visible:bg-white/[0.04] outline-none"
                      >
                        <span
                          className={`font-mono tabular-nums text-[28px] leading-none tracking-[-0.025em] ${
                            isWinner ? 'text-brand font-semibold' : 'text-fgSubtle'
                          }`}
                        >
                          {String(creator.rank).padStart(2, '0')}
                        </span>
                        <span className="text-fg font-medium truncate">
                          {creator.handle}
                        </span>
                        <span className="flex items-center gap-2 text-fgMuted text-caption">
                          <Icon size={14} />
                          <span className="hidden sm:inline">
                            {PLATFORM_LABELS[creator.primaryPlatform]}
                          </span>
                        </span>
                        <span className="text-right font-mono tabular-nums text-fg">
                          {compactFormatter.format(creator.followers)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </BentoItem>

          <BentoItem colSpan={5} rowSpan={2} tabletColSpan={6}>
            <Link href="/dashboard" className="block h-full group">
              <GlassCard
                variant="base"
                hover
                padding="lg"
                radius="2xl"
                className="h-full flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
                      Net Growth · 30d
                    </span>
                    <span className="text-caption text-fgMuted">All platforms</span>
                  </div>
                  <span className="text-caption text-fgSubtle font-mono">
                    Open{' '}
                    <span className="inline-block transition-transform duration-150 ease-out group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mb-1">
                  <div className="text-[clamp(36px,4vw,52px)] leading-[0.98] tracking-[-0.035em] font-semibold text-fg tabular-nums">
                    +{compactFormatter.format(allMetrics.netGrowth30d)}
                  </div>
                  <div className="text-body-sm font-mono tabular-nums text-fgMuted">
                    {signedPercentFormatter.format(allMetrics.netGrowth30dPct)}
                  </div>
                </div>
                <div className="text-caption text-fgMuted mb-6 tabular-nums">
                  vs. prior 30d
                </div>

                <div className="flex-1 min-h-[120px]">
                  <Sparkline
                    values={allMetrics.growthSeries}
                    ariaLabel="Daily net follower additions over 30 days"
                  />
                </div>
              </GlassCard>
            </Link>
          </BentoItem>
          </BentoGrid>
        </Reveal>
      </section>

      {/* ----- PLATFORMS ----- */}
      <section className="w-full pb-20 sm:pb-24 max-w-[1100px] mx-auto">
        <Reveal>
          <SectionLabel
            eyebrow="Coverage"
            title="Five platforms. One showcase."
            caption="Every creator we manage, every platform we run."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
          {PLATFORM_ORDER.map((platform) => {
            const Icon = PLATFORM_ICONS[platform];
            const live = liveByPlatform.get(platform);
            const isEmpty = !live;
            const followers = live?.followers ?? 0;
            const growth30d = live?.growth30d ?? 0;
            const creatorCount = live?.creatorCount ?? 0;
            return (
              <Link
                key={platform}
                href="/dashboard"
                className={`block h-full group ${isEmpty ? 'opacity-50' : ''}`}
              >
                <GlassCard
                  variant="base"
                  hover
                  padding="md"
                  radius="2xl"
                  className="h-full flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center size-10 rounded-md bg-customColor16 border border-borderGlass text-fg">
                      <Icon size={18} />
                    </span>
                    <span className="text-caption text-fgSubtle font-mono tabular-nums">
                      {isEmpty
                        ? 'Not yet tracked'
                        : `${creatorCount} creator${creatorCount === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-label text-fg font-medium">
                      {PLATFORM_LABELS[platform]}
                    </span>
                    <span className="text-[clamp(20px,2vw,24px)] leading-none tracking-[-0.02em] font-semibold text-fg tabular-nums">
                      {isEmpty ? '—' : compactFormatter.format(followers)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-caption text-fgMuted font-mono tabular-nums pt-3 border-t border-borderGlass">
                    <span>{isEmpty ? '—' : `+${compactFormatter.format(growth30d)}`}</span>
                    <span>30d</span>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
          </div>
        </Reveal>
      </section>

      {/* ----- STATS STRIP ----- */}
      <section className="w-full pb-20 sm:pb-24 max-w-[1100px] mx-auto">
        <Reveal>
        <GlassCard variant="base" padding="none" radius="2xl">
          <dl className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-borderGlass">
            <StatCell
              label="Tracked Creators"
              value={exactFormatter.format(summary.trackedCreators)}
              note="Across every platform"
            />
            <StatCell
              label="Combined Followers"
              value={compactFormatter.format(summary.combinedFollowers)}
              note={`${exactFormatter.format(summary.combinedFollowers)} total`}
            />
            <StatCell
              label="30d Net Growth"
              value={`+${compactFormatter.format(summary.combinedGrowth30d)}`}
              note={signedPercentFormatter.format(allMetrics.netGrowth30dPct) + ' vs. prior 30d'}
            />
          </dl>
        </GlassCard>
        </Reveal>
      </section>

      {/* ----- BOTTOM CTA BAND ----- */}
      <section className="w-full pb-24 max-w-[1100px] mx-auto">
        <Reveal>
        <GlassCard variant="base" padding="lg" radius="2xl" className="text-center">
          <h2 className="text-display-2 text-fg max-w-[640px] mx-auto mb-4">
            Watch creators grow, live.
          </h2>
          <p className="text-body-lg text-fgMuted max-w-[520px] mx-auto mb-8">
            The dashboard refreshes the moment our scraper kicks in. Pick a
            platform, sort by growth, watch the numbers move.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard" className="contents">
              <AuroraButton variant="cta" size="lg">
                Open the dashboard
              </AuroraButton>
            </Link>
            <Link href="/leaderboard" className="contents">
              <AuroraButton variant="ghost" size="lg">
                See the leaderboard
              </AuroraButton>
            </Link>
          </div>
          <p className="text-caption text-fgSubtle mt-8 tabular-nums">
            Showcase preview · synthetic data until the scraper switches on.
          </p>
        </GlassCard>
        </Reveal>
      </section>
    </div>
  );
}

// Normalized shape used by the Top Creators bento; both live and demo
// rows are projected into this so the JSX doesn't branch.
interface TopCreatorCard {
  rank: number;
  handle: string;
  primaryPlatform: PlatformKey;
  followers: number;
}

function liveRowToCard(r: LiveCreatorRow): TopCreatorCard {
  return {
    rank: r.rank,
    handle: r.handle,
    primaryPlatform: r.primaryPlatform,
    followers: r.followers,
  };
}

function demoRowToCard(r: {
  rank: number;
  handle: string;
  primaryPlatform: PlatformKey;
  followers: number;
}): TopCreatorCard {
  return {
    rank: r.rank,
    handle: r.handle,
    primaryPlatform: r.primaryPlatform,
    followers: r.followers,
  };
}

interface SectionLabelProps {
  eyebrow: string;
  title: string;
  caption?: string;
}

function SectionLabel({ eyebrow, title, caption }: SectionLabelProps) {
  return (
    <div className="mb-6 flex flex-col gap-1.5">
      <span className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
        {eyebrow}
      </span>
      <h2 className="text-subsection text-fg">{title}</h2>
      {caption ? (
        <p className="text-body-sm text-fgMuted max-w-[520px]">{caption}</p>
      ) : null}
    </div>
  );
}

interface StatCellProps {
  label: string;
  value: string;
  note: string;
}

function StatCell({ label, value, note }: StatCellProps) {
  return (
    <div className="p-6 sm:p-8 flex flex-col gap-3">
      <dt className="text-micro uppercase text-fgSubtle tracking-[0.04em]">
        {label}
      </dt>
      <dd className="text-[clamp(28px,3vw,40px)] leading-[1.02] tracking-[-0.03em] font-semibold text-fg tabular-nums">
        {value}
      </dd>
      <p className="text-caption text-fgMuted tabular-nums">{note}</p>
    </div>
  );
}
