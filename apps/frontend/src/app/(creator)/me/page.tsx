import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { getSupabaseAdmin } from '@d3/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'My dashboard — D3 Creator',
};

export default async function CreatorMePage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (!auth.creatorLink?.onboarding_completed) redirect('/onboarding');

  // Pull this creator's own profiles + latest snapshots. Service-role client
  // is needed because public RLS reads everything; we want a server-driven
  // filter scoped to creator_id == auth.creatorLink.creator_id.
  const admin = getSupabaseAdmin();
  const creatorId = auth.creatorLink.creator_id;

  // Step 1: pull this creator's profiles, scoped by creator_id.
  const { data: profiles } = creatorId
    ? await admin
        .from('profile')
        .select('id, platform, handle, display_name, profile_url, scrape_status')
        .eq('creator_id', creatorId)
    : { data: null };

  // Step 2: pull snapshots only for THOSE profiles. Previously this query
  // had no profile_id filter and just .limit(50) — which (a) returned the
  // 50 most-recent snapshots across the entire system, leaking other
  // creators' rows into this page's server memory, and (b) silently
  // failed to show this creator's data once others scraped more often
  // and pushed them out of the top-50 window. Mirror the same pattern
  // /me/leaderboard already uses.
  const profileIds = (profiles ?? []).map((p) => p.id);
  const { data: latestSnapshots } = profileIds.length
    ? await admin
        .from('profile_snapshot')
        .select(
          'profile_id, followers, total_posts, total_views, total_likes, captured_at',
        )
        .in('profile_id', profileIds)
        .order('captured_at', { ascending: false })
        .limit(50)
    : { data: null };

  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
          My data
        </span>
        <h1 className="text-display-2 text-fg mb-4">Your creator view.</h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          Signed in as <span className="text-fg">{auth.email}</span>. Only data
          tied to your creator is shown here.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="glass-elevated p-5 rounded-2xl">
          <h2 className="text-heading text-fg mb-2">Dashboard URL</h2>
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
        <article className="glass-elevated p-5 rounded-2xl">
          <h2 className="text-heading text-fg mb-2">Leaderboard URL</h2>
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

      <section>
        <h2 className="text-section text-fg mb-4">Your profiles</h2>
        {!creatorId ? (
          <p className="text-body text-fgMuted">
            No creator linked yet.{' '}
            <Link href="/onboarding" className="text-aurora-cta underline underline-offset-4">
              Finish onboarding
            </Link>
            .
          </p>
        ) : !profiles || profiles.length === 0 ? (
          <div className="glass-subtle border border-borderGlass rounded-2xl p-6 text-body text-fgMuted">
            An admin hasn&apos;t added any platform profiles for your creator
            yet. Once added, daily snapshots will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-borderGlass border border-borderGlass rounded-2xl overflow-hidden">
            {profiles.map((p) => {
              const snap = (latestSnapshots ?? []).find((s) => s.profile_id === p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-4 bg-glass-base"
                >
                  <div className="min-w-0">
                    <div className="text-label text-fgMuted uppercase tracking-wide">
                      {p.platform}
                    </div>
                    <div className="text-body text-fg truncate">
                      {p.display_name ?? p.handle ?? p.profile_url}
                    </div>
                  </div>
                  <div className="text-right text-caption text-fgMuted shrink-0">
                    {snap?.followers != null ? (
                      <div className="text-body text-fg">
                        {Intl.NumberFormat().format(Number(snap.followers))}
                        <span className="text-caption text-fgSubtle ml-1">followers</span>
                      </div>
                    ) : (
                      <div className="text-fgSubtle">No snapshot yet</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
