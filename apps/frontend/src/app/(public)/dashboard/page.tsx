import { Metadata } from 'next';
import { DashboardShowcase } from '@gitroom/frontend/components/dashboard-showcase/dashboard-showcase';
import { getLiveCreatorRows, type LiveCreatorRow } from '@gitroom/frontend/lib/queries';
import type { CreatorRow } from '@gitroom/frontend/components/dashboard-showcase/showcase-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Dashboard — D3 Creator',
  description:
    'Live overview of every creator we grow at D3 — followers, engagement, and growth across Instagram, TikTok, Facebook, Douyin, and Xiaohongshu.',
};

export default async function DashboardPage() {
  const live = await getLiveCreatorRows().catch((err) => {
    console.error('[dashboard] getLiveCreatorRows failed — falling back to demo', err);
    return null;
  });
  // Strip the `insufficient` flag — showcase consumes plain CreatorRow.
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
          Dashboard
        </span>
        <h1 className="text-display-2 text-fg mb-4">
          Every creator. Every platform.
        </h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          A live roll-up of every account we manage. Filter by platform; numbers
          refresh as our scraper collects them.
        </p>
        {liveCreators && insufficient && (
          <p className="mt-4 text-caption text-fgSubtle">
            Tracking {liveCreators.length} creator{liveCreators.length === 1 ? '' : 's'} ·
            growth metrics fill in after 14 days of snapshots.
          </p>
        )}
      </header>

      <DashboardShowcase liveCreators={liveCreators} />
    </div>
  );
}
