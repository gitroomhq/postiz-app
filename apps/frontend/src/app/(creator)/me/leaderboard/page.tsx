import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'My leaderboard — D3 Creator',
};

interface PostRow {
  external_post_id: string;
  caption_excerpt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  posted_at: string | null;
  media_url: string | null;
}

export default async function CreatorMeLeaderboardPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (!auth.creatorLink?.onboarding_completed) redirect('/onboarding');

  // Cookie-aware client — same defense-in-depth reasoning as /me/page.tsx.
  // The data tables have "public read for anon + authenticated" RLS for the
  // showcase, so this client sees the same rows an anon visitor would, and
  // the creator_id filter narrows to this user's own posts at the query
  // level. If the filter ever broke, the leak is bounded by what's already
  // public via /leaderboard.
  const sb = await getSupabaseRoute();
  const creatorId = auth.creatorLink.creator_id;

  // Top posts across this creator's profiles, by views.
  let posts: PostRow[] = [];
  if (creatorId) {
    const { data: profileIds } = await sb
      .from('profile')
      .select('id')
      .eq('creator_id', creatorId);
    const ids = (profileIds ?? []).map((p) => p.id);
    if (ids.length) {
      const { data } = await sb
        .from('post_snapshot')
        .select(
          'external_post_id, caption_excerpt, views, likes, comments, posted_at, media_url',
        )
        .in('profile_id', ids)
        .order('views', { ascending: false, nullsFirst: false })
        .limit(20);
      posts = (data as PostRow[] | null) ?? [];
    }
  }

  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
          My leaderboard
        </span>
        <h1 className="text-display-2 text-fg mb-4">Your top posts.</h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          The 20 highest-viewed posts across your platforms.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="glass-subtle border border-borderGlass rounded-2xl p-6 text-body text-fgMuted">
          No post snapshots yet.
        </div>
      ) : (
        <ol className="space-y-2">
          {posts.map((p, i) => (
            <li
              key={p.external_post_id + i}
              className="glass-elevated rounded-xl p-4 flex items-center gap-4"
            >
              <span className="text-section text-fgSubtle w-10 text-right tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body text-fg truncate">
                  {p.caption_excerpt ?? '(no caption)'}
                </p>
                <p className="text-caption text-fgMuted">
                  {p.posted_at ? new Date(p.posted_at).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-body text-fg tabular-nums">
                  {p.views != null ? Intl.NumberFormat().format(p.views) : '—'}
                </div>
                <div className="text-caption text-fgSubtle">views</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
