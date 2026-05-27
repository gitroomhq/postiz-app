import { Metadata } from 'next';
import { LeaderboardShowcase } from '@gitroom/frontend/components/leaderboard-showcase/leaderboard-showcase';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Leaderboard — D3 Creator',
  description:
    'Top creators we grow at D3, ranked by followers, 30-day growth, and engagement across every platform.',
};

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-white/[0.78]" />
          Leaderboard
        </span>
        <h1 className="text-display-2 text-fg mb-4">
          Top creators, ranked live.
        </h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          Sort by followers, 30-day growth, or engagement. Filter by platform.
          Updated as soon as our scraper kicks in.
        </p>
      </header>

      <LeaderboardShowcase />
    </div>
  );
}
