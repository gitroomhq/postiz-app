import { Metadata } from 'next';
import { LeaderboardShowcase } from '@gitroom/frontend/components/leaderboard-showcase/leaderboard-showcase';
import { getLiveCreatorRows, type LiveCreatorRow } from '@gitroom/frontend/lib/queries';
import type { CreatorRow } from '@gitroom/frontend/components/dashboard-showcase/showcase-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Leaderboard — D3 Creator',
  description:
    'Top creators we grow at D3, ranked by followers, 30-day growth, and engagement across every platform.',
};

export default async function LeaderboardPage() {
  const live = await getLiveCreatorRows().catch((err) => {
    console.error('[leaderboard] getLiveCreatorRows failed — falling back to demo', err);
    return null;
  });
  const liveCreators: CreatorRow[] | null = live
    ? live.map((r: LiveCreatorRow): CreatorRow => {
        const { insufficient: _i, ...rest } = r;
        return rest;
      })
    : null;
  const insufficient = live ? live.some((r: LiveCreatorRow) => r.insufficient) : false;

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
        {liveCreators && insufficient && (
          <p className="mt-4 text-caption text-fgSubtle">
            Tracking {liveCreators.length} creator{liveCreators.length === 1 ? '' : 's'} ·
            growth and engagement insights fill in after 14 days of snapshots.
          </p>
        )}
      </header>

      <LeaderboardShowcase liveCreators={liveCreators} />
    </div>
  );
}
