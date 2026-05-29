import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';
import { getCreatorMetrics } from '@gitroom/frontend/lib/creator-metrics';
import { CreatorStats } from './creator-stats';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'My dashboard — D3 Creator',
};

export default async function CreatorMePage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  // Admins manage from /admin.
  if (auth.role === 'admin') redirect('/admin');
  // No onboarding gate: creators land here straight away. The dashboard shows
  // a friendly "add your first profile" prompt when they have no profiles yet.

  // Cookie-aware client (NOT service-role). The data tables are public-read
  // for the showcase, so the worst-case leak is bounded by what an anon
  // visitor already sees; getCreatorMetrics narrows to this user's claimed
  // profiles (or their creator_id as a legacy fallback) at the query level.
  const sb = await getSupabaseRoute();
  const creatorId = auth.creatorLink.creator_id;
  const metrics = await getCreatorMetrics(sb, { userId: auth.userId, creatorId });

  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
          My data
        </span>
        <h1 className="text-display-2 text-fg mb-4">Your creator view.</h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          Signed in as <span className="text-fg">{auth.email}</span>. Live stats
          across every profile you own or track —{' '}
          <Link href="/me/profiles" className="text-aurora-cta underline underline-offset-4">
            manage your URLs
          </Link>
          .
        </p>
      </header>

      {!metrics.hasProfiles ? (
        <div className="glass-subtle border border-borderGlass rounded-2xl p-6 text-body text-fgMuted">
          You haven&apos;t added any profiles yet.{' '}
          <Link href="/me/profiles" className="text-aurora-cta underline underline-offset-4">
            Add a profile URL
          </Link>{' '}
          to start tracking — daily stats appear here once collected.
        </div>
      ) : (
        <CreatorStats metrics={metrics} />
      )}
    </div>
  );
}
