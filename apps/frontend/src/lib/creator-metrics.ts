/**
 * Creator dashboard metrics — server-side aggregation for /me.
 *
 * Source of truth for *which* profiles a user sees is profile_claim
 * (confirmed owner + tracker), mirroring /me and /me/profiles. Falls back to
 * profile.creator_id for users who predate the claim backfill so the page is
 * never empty for them.
 *
 * All reads go through the cookie-aware client passed in by the caller (NOT
 * service-role) — the data tables are public-read for the showcase, so the
 * worst-case leak is bounded by what an anon visitor already sees, and the
 * claim/creator filter narrows to this user's own rows at the query level.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// How many days of daily snapshots to pull when computing latest-vs-previous
// deltas. Daily cron → 2 rows is enough for a delta, but a small window keeps
// us robust to a missed scrape day and is still a tiny result set.
const SNAPSHOT_WINDOW_DAYS = 14;
const TOP_POSTS_LIMIT = 5;
// Over-fetch posts before de-duping to the latest row per post, then trim.
const POST_FETCH_LIMIT = 60;

export interface ProfileMetric {
  profileId: string;
  platform: string;
  handle: string | null;
  displayName: string | null;
  profileUrl: string;
  scrapeStatus: string;
  followers: number | null;
  followersDelta: number | null;
  views: number | null;
  posts: number | null;
}

export interface TopPost {
  externalPostId: string;
  platform: string;
  caption: string | null;
  postedAt: string | null;
  mediaUrl: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  /** (likes + comments + shares) / views, as a fraction. null when views is 0/absent. */
  engagement: number | null;
}

export interface CreatorMetrics {
  hasProfiles: boolean;
  source: 'claims' | 'creator_id';
  totals: {
    followers: number;
    followersGainedToday: number;
    views: number;
    likes: number;
    posts: number;
    /** account engagement = likes / views, as a fraction (null when views is 0) */
    engagement: number | null;
  };
  profiles: ProfileMetric[];
  topPosts: TopPost[];
}

export interface ResolvedProfile {
  id: string;
  platform: string;
  handle: string | null;
  display_name: string | null;
  profile_url: string;
  scrape_status: string;
}

interface SnapshotRow {
  profile_id: string;
  captured_date: string;
  followers: number | null;
  total_posts: number | null;
  total_views: number | null;
  total_likes: number | null;
}

interface PostRow {
  profile_id: string;
  external_post_id: string;
  caption_excerpt: string | null;
  posted_at: string | null;
  media_url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  captured_date: string;
}

/**
 * The set of profiles a creator user should see, and where it came from.
 *
 * Source of truth is profile_claim (confirmed owner + tracker), with a
 * legacy profile.creator_id fallback for users who predate the claim
 * backfill. Shared by /me and /me/leaderboard so both stay consistent.
 */
export async function resolveCreatorProfiles(
  sb: SupabaseClient,
  args: { userId: string; creatorId: string | null },
): Promise<{ profiles: ResolvedProfile[]; source: 'claims' | 'creator_id' }> {
  // Confirmed owner + tracker claims (pending stays on /me/profiles).
  const claimsRes = await sb
    .from('profile_claim')
    .select(
      'profile:profile_id(id, platform, handle, display_name, profile_url, scrape_status)',
    )
    .eq('user_id', args.userId)
    .in('claim_kind', ['owner', 'tracker'])
    .not('confirmed_at', 'is', null);

  const claimed = ((claimsRes.data ?? []) as unknown as { profile: ResolvedProfile | null }[])
    .map((c) => c.profile)
    .filter((p): p is ResolvedProfile => p != null);

  if (claimed.length > 0) return { profiles: claimed, source: 'claims' };

  if (args.creatorId) {
    const { data } = await sb
      .from('profile')
      .select('id, platform, handle, display_name, profile_url, scrape_status')
      .eq('creator_id', args.creatorId);
    return { profiles: (data ?? []) as ResolvedProfile[], source: 'creator_id' };
  }

  return { profiles: [], source: 'claims' };
}

export async function getCreatorMetrics(
  sb: SupabaseClient,
  args: { userId: string; creatorId: string | null },
): Promise<CreatorMetrics> {
  const { profiles: profileRows, source } = await resolveCreatorProfiles(sb, args);
  const ids = profileRows.map((p) => p.id);
  const platformById = new Map(profileRows.map((p) => [p.id, p.platform]));

  if (ids.length === 0) {
    return {
      hasProfiles: false,
      source,
      totals: {
        followers: 0,
        followersGainedToday: 0,
        views: 0,
        likes: 0,
        posts: 0,
        engagement: null,
      },
      profiles: [],
      topPosts: [],
    };
  }

  // --- Snapshots: latest + previous per profile -------------------------
  const sinceIso = new Date(Date.now() - SNAPSHOT_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data: snapData } = await sb
    .from('profile_snapshot')
    .select('profile_id, captured_date, followers, total_posts, total_views, total_likes')
    .in('profile_id', ids)
    .gte('captured_date', sinceIso)
    .order('captured_date', { ascending: false });

  const snapshots = (snapData ?? []) as SnapshotRow[];
  // Group by profile, preserving captured_date DESC ordering from the query.
  const byProfile = new Map<string, SnapshotRow[]>();
  for (const s of snapshots) {
    const arr = byProfile.get(s.profile_id);
    if (arr) arr.push(s);
    else byProfile.set(s.profile_id, [s]);
  }

  const profileMetrics: ProfileMetric[] = profileRows.map((p) => {
    const rows = byProfile.get(p.id) ?? [];
    const latest = rows[0];
    const prev = rows[1];
    const followers = latest?.followers ?? null;
    const followersDelta =
      latest?.followers != null && prev?.followers != null
        ? Number(latest.followers) - Number(prev.followers)
        : null;
    return {
      profileId: p.id,
      platform: p.platform,
      handle: p.handle,
      displayName: p.display_name,
      profileUrl: p.profile_url,
      scrapeStatus: p.scrape_status,
      followers: followers != null ? Number(followers) : null,
      followersDelta,
      views: latest?.total_views != null ? Number(latest.total_views) : null,
      posts: latest?.total_posts != null ? Number(latest.total_posts) : null,
    };
  });

  const sum = (pick: (m: ProfileMetric) => number | null): number =>
    profileMetrics.reduce((acc, m) => acc + (pick(m) ?? 0), 0);

  const totalFollowers = sum((m) => m.followers);
  const totalViews = sum((m) => m.views);
  const totalPosts = sum((m) => m.posts);
  const followersGainedToday = sum((m) => m.followersDelta);
  // total_likes is cumulative on the latest snapshot per profile.
  const totalLikes = profileMetrics.reduce((acc, m) => {
    const rows = byProfile.get(m.profileId) ?? [];
    const likes = rows[0]?.total_likes;
    return acc + (likes != null ? Number(likes) : 0);
  }, 0);
  const engagement = totalViews > 0 ? totalLikes / totalViews : null;

  // --- Top posts (peak views per distinct post) -------------------------
  const { data: postData } = await sb
    .from('post_snapshot')
    .select(
      'profile_id, external_post_id, caption_excerpt, posted_at, media_url, views, likes, comments, shares, captured_date',
    )
    .in('profile_id', ids)
    .order('views', { ascending: false, nullsFirst: false })
    .limit(POST_FETCH_LIMIT);

  const postRows = (postData ?? []) as PostRow[];
  // Rows are views DESC, so the first time we see an external_post_id it is
  // that post's peak-views snapshot — keep it, drop later duplicates.
  const seen = new Set<string>();
  const topPosts: TopPost[] = [];
  for (const r of postRows) {
    if (seen.has(r.external_post_id)) continue;
    seen.add(r.external_post_id);
    const views = r.views != null ? Number(r.views) : null;
    const likes = r.likes != null ? Number(r.likes) : null;
    const comments = r.comments != null ? Number(r.comments) : null;
    const shares = r.shares != null ? Number(r.shares) : null;
    const interactions = (likes ?? 0) + (comments ?? 0) + (shares ?? 0);
    topPosts.push({
      externalPostId: r.external_post_id,
      platform: platformById.get(r.profile_id) ?? 'instagram',
      caption: r.caption_excerpt,
      postedAt: r.posted_at,
      mediaUrl: r.media_url,
      views,
      likes,
      comments,
      shares,
      engagement: views && views > 0 ? interactions / views : null,
    });
    if (topPosts.length >= TOP_POSTS_LIMIT) break;
  }

  return {
    hasProfiles: true,
    source,
    totals: {
      followers: totalFollowers,
      followersGainedToday,
      views: totalViews,
      likes: totalLikes,
      posts: totalPosts,
      engagement,
    },
    profiles: profileMetrics,
    topPosts,
  };
}

// --- Formatters -------------------------------------------------------------

const compactFmt = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

export function formatCompact(n: number | null): string {
  if (n == null) return '—';
  return compactFmt.format(n);
}

/** Signed compact delta, e.g. "+1.2K" / "-340" / "0". */
export function formatDelta(n: number | null): string {
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${compactFmt.format(n)}`;
}

/** Fraction → percent string, e.g. 0.0423 → "4.2%". */
export function formatPercent(fraction: number | null): string {
  if (fraction == null) return '—';
  return `${(fraction * 100).toFixed(1)}%`;
}
