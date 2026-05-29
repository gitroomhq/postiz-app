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
  // Admins manage from /admin and never go through creator onboarding.
  if (auth.role === 'admin') redirect('/admin');
  if (!auth.creatorLink?.onboarding_completed) redirect('/onboarding');

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
          {creatorId ? (
            <>
              You haven&apos;t claimed any profiles yet.{' '}
              <Link href="/me/profiles" className="text-aurora-cta underline underline-offset-4">
                Add a profile URL
              </Link>{' '}
              and daily stats will appear here.
            </>
          ) : (
            <>
              No creator linked yet.{' '}
              <Link href="/onboarding" className="text-aurora-cta underline underline-offset-4">
                Finish onboarding
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <CreatorStats metrics={metrics} />
      )}

      {/* Share links — de-emphasized below the stats. */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="glass-subtle border border-borderGlass p-5 rounded-2xl">
          <h2 className="text-label text-fgMuted uppercase tracking-wide mb-2">
            Dashboard URL
          </h2>
          {auth.creatorLink.dashboard_url ? (
            <a
              href={auth.creatorLink.dashboard_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body text-aurora-cta underline underline-offset-4 break-all"
            >
              {auth.creatorLink.dashboard_url}
            </a>
          ) : (
            <p className="text-body text-fgMuted">Not set.</p>
          )}
        </article>
        <article className="glass-subtle border border-borderGlass p-5 rounded-2xl">
          <h2 className="text-label text-fgMuted uppercase tracking-wide mb-2">
            Leaderboard URL
          </h2>
          {auth.creatorLink.leaderboard_url ? (
            <a
              href={auth.creatorLink.leaderboard_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body text-aurora-cta underline underline-offset-4 break-all"
            >
              {auth.creatorLink.leaderboard_url}
            </a>
          ) : (
            <p className="text-body text-fgMuted">Not set.</p>
          )}
        </article>
      </section>
    </div>
  );
}
