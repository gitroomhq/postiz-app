import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';
import { resolveCreatorProfiles } from '@gitroom/frontend/lib/creator-metrics';
import { EmptyState } from '@gitroom/frontend/components/ui/empty-state';

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
  if (auth.role === 'admin') redirect('/admin');
  // No onboarding gate — creators see their top posts straight away.

  // Cookie-aware client — same defense-in-depth reasoning as /me/page.tsx.
  // The data tables have "public read for anon + authenticated" RLS for the
  // showcase, so this client sees the same rows an anon visitor would, and
  // the profile filter narrows to this user's own posts at the query level.
  // If the filter ever broke, the leak is bounded by what's already public
  // via /leaderboard.
  const sb = await getSupabaseRoute();

  // Which profiles count as "this user's"? Source of truth is profile_claim
  // (owner + tracker), shared with /me — NOT profile.creator_id. A tracked
  // profile belonging to another creator still surfaces this user's view of
  // its top posts.
  const { profiles } = await resolveCreatorProfiles(sb, {
    userId: auth.userId,
    creatorId: auth.creatorLink.creator_id,
  });
  const ids = profiles.map((p) => p.id);

  // Top posts across those profiles, by views.
  let posts: PostRow[] = [];
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
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 21V9M10 21V4M16 21v-7M22 21H2" />
            </svg>
          }
          title="No posts to rank yet"
          description={
            ids.length === 0
              ? "You're not tracking any profiles yet. Add one and your highest-viewed posts will appear here."
              : 'Your top posts appear here once the first daily scrape collects them — usually within 24 hours.'
          }
          action={ids.length === 0 ? { href: '/me/profiles', label: 'Add a profile' } : undefined}
        />
      ) : (
        <ol className="space-y-2">
          {posts.map((p, i) => {
            const thumb =
              p.media_url && p.media_url.startsWith('http')
                ? `/api/proxy-image?url=${encodeURIComponent(p.media_url)}`
                : null;
            const isWinner = i === 0;
            return (
              <li
                key={p.external_post_id + i}
                className="glass-elevated rounded-xl p-4 flex items-center gap-4"
              >
                <span
                  className={`text-section w-10 text-right tabular-nums ${
                    isWinner ? 'text-aurora-cta font-semibold' : 'text-fgSubtle'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="relative size-14 rounded-md overflow-hidden bg-customColor1 shrink-0">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- proxied, dims vary by platform
                    <img
                      src={thumb}
                      alt={p.caption_excerpt ?? 'Post thumbnail'}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-caption text-fgSubtle">
                      —
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body text-fg truncate">
                    {p.caption_excerpt ?? '(no caption)'}
                  </p>
                  <p className="text-caption text-fgMuted">
                    {p.posted_at ? new Date(p.posted_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-5 shrink-0 text-right tabular-nums">
                  <PostStat label="views" value={p.views} strong />
                  <PostStat label="likes" value={p.likes} />
                  <PostStat label="comments" value={p.comments} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function PostStat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number | null;
  strong?: boolean;
}) {
  return (
    <div className={label === 'views' ? '' : 'hidden sm:block'}>
      <div className={`text-body tabular-nums ${strong ? 'text-fg' : 'text-fgMuted'}`}>
        {value != null ? Intl.NumberFormat().format(value) : '—'}
      </div>
      <div className="text-caption text-fgSubtle">{label}</div>
    </div>
  );
}
