import { Metadata } from 'next';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Leaderboard — D3 Creator',
  description:
    'Top creators we grow at D3, ranked by followers and 30-day growth across every platform.',
};

const rankPlaceholders = [1, 2, 3, 4, 5];

const medalColor = (rank: number) => {
  if (rank === 1) return 'bg-brand text-canvas';
  if (rank === 2) return 'bg-white/[0.10] text-fg';
  if (rank === 3) return 'bg-white/[0.06] text-fgMuted';
  return 'bg-white/[0.04] text-fgSubtle';
};

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-16 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-brand" />
          Leaderboard
        </span>
        <h1 className="text-display-2 text-fg mb-4">
          Top creators, ranked live.
        </h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          Ranked by followers and 30-day growth across every platform we run.
          Updated as soon as our scraper kicks in.
        </p>
      </header>

      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading text-fg">By Total Followers</h2>
          <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
            Soon
          </span>
        </div>

        <div className="rounded-xl overflow-hidden border border-borderGlass">
          <div className="grid grid-cols-[64px_1fr_140px_120px] gap-4 px-5 py-3 bg-white/[0.03] text-micro uppercase text-fgSubtle border-b border-borderGlass">
            <div>#</div>
            <div>Creator</div>
            <div className="text-right">Followers</div>
            <div className="text-right">30d Δ</div>
          </div>
          {rankPlaceholders.map((rank, i) => (
            <div
              key={rank}
              className={`grid grid-cols-[64px_1fr_140px_120px] gap-4 px-5 py-4 items-center transition-colors hover:bg-white/[0.03] ${i < rankPlaceholders.length - 1 ? 'border-b border-borderGlass' : ''}`}
            >
              <div>
                <span
                  className={`inline-flex items-center justify-center size-8 rounded-full text-label font-semibold ${medalColor(rank)}`}
                >
                  {rank}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-glass-subtle border border-borderGlass" />
                <span className="text-body-sm text-fgMuted">
                  Tracking starts soon
                </span>
              </div>
              <div className="text-right text-body-sm font-mono text-fgMuted">
                —
              </div>
              <div className="text-right text-body-sm font-mono text-fgMuted">
                —
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading text-fg">By 30-Day Growth</h2>
          <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
            Soon
          </span>
        </div>
        <div className="rounded-xl bg-glass-subtle border border-borderGlass p-12 text-center">
          <p className="text-body-sm text-fgMuted">
            Growth leaderboard appears once 30 days of data exists.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
