/**
 * Server-side query helpers — feed the public showcase pages.
 *
 * All functions:
 *   - Use the publishable-key client (read-only, RLS-permitted public read)
 *   - Are async (called from Server Components)
 *   - Return shapes designed for the existing showcase components so we
 *     don't have to rewrite every page to switch from demo data
 *
 * When DB has zero matching rows, returns null so callers can fall back to
 * demo data (during early-development) or render an empty state (Task 5
 * polish).
 */

import { getSupabaseRead } from './supabase-server';
import type { PlatformKey } from '@gitroom/frontend/components/ui/platform-icons';

// DB stores 'rednote'; showcase uses 'xiaohongshu' — single map point.
function dbPlatformToKey(platform: string): PlatformKey {
  return platform === 'rednote' ? 'xiaohongshu' : (platform as PlatformKey);
}

export interface LiveCreatorRow {
  rank: number;
  handle: string;
  primaryPlatform: PlatformKey;
  followers: number;
  /** 0 when tracked <14 days (spec §4 insufficient-data guard). */
  growth30d: number;
  /** 0 when no posts yet OR no followers. (likes + comments + shares) / followers × 100 */
  engagementRate: number;
  /** When true, growth/engagement cells should render an empty-state in the UI. */
  insufficient: boolean;
}

export interface SiteSummary {
  trackedCreators: number;
  combinedFollowers: number;
  combinedFollowersDelta30d: number;
  combinedFollowersDelta30dPct: number;
}

/**
 * Aggregate counts shown in the hero strip and dashboard summary cards.
 *
 * - trackedCreators: distinct creators with at least one profile
 * - combinedFollowers: SUM of latest follower count per profile across all
 *   active profiles (one row per profile from its newest snapshot)
 * - combinedFollowersDelta30d: net add over the last 30 days (today vs 30d ago)
 *
 * Returns null if there are no creators yet — caller decides fallback.
 */
export async function getSiteSummary(): Promise<SiteSummary | null> {
  const sb = getSupabaseRead();

  // Distinct creators with at least one profile.
  const creatorsRes = await sb
    .from('creator')
    .select('id', { count: 'exact', head: true });
  if (creatorsRes.error) {
    console.error('[queries] getSiteSummary creator count failed', creatorsRes.error);
    return null;
  }
  const trackedCreators = creatorsRes.count ?? 0;
  if (trackedCreators === 0) return null;

  // Latest snapshot per profile (followers). For v1 we keep it simple:
  // sum the most recent snapshot per profile_id. Postgres distinct on
  // would be ideal — using a small in-memory roll-up here since the
  // hero query fires once per request and v1 scale is <100 profiles.
  const snaps = await sb
    .from('profile_snapshot')
    .select('profile_id, captured_at, followers')
    .order('captured_at', { ascending: false })
    .limit(2000);
  if (snaps.error) {
    console.error('[queries] getSiteSummary snapshots failed', snaps.error);
    return null;
  }

  const latestPerProfile = new Map<string, number>();
  const earliestPerProfile = new Map<string, { ts: string; followers: number }>();
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  for (const row of snaps.data ?? []) {
    const id = row.profile_id as string;
    const followers = (row.followers as number | null) ?? 0;
    if (!latestPerProfile.has(id)) {
      latestPerProfile.set(id, followers);
    }
    // earliest snapshot within the last 30d window
    const ts = row.captured_at as string;
    if (ts <= thirtyDaysAgoIso) continue;
    const cur = earliestPerProfile.get(id);
    if (!cur || ts < cur.ts) {
      earliestPerProfile.set(id, { ts, followers });
    }
  }

  let combinedFollowers = 0;
  for (const v of latestPerProfile.values()) combinedFollowers += v;

  let priorCombined = 0;
  for (const [id, snapshot] of earliestPerProfile.entries()) {
    if (!latestPerProfile.has(id)) continue;
    priorCombined += snapshot.followers;
  }
  const combinedFollowersDelta30d = priorCombined ? combinedFollowers - priorCombined : 0;
  const combinedFollowersDelta30dPct =
    priorCombined > 0 ? (combinedFollowersDelta30d / priorCombined) * 100 : 0;

  return {
    trackedCreators,
    combinedFollowers,
    combinedFollowersDelta30d,
    combinedFollowersDelta30dPct,
  };
}

const INSUFFICIENT_DAYS = 14;

/**
 * Build CreatorRow-shaped rows from the DB. One row per creator, ranked by
 * combined followers across that creator's profiles.
 *
 * Returns null if DB has zero creators (caller falls back to demo data).
 *
 * Sparse-data behavior (per spec §4):
 *   - growth30d  = 0 when <14 days of snapshots OR no prior data
 *   - engagementRate = 0 when no posts or zero followers
 *   - insufficient = true so UI can blank those cells
 */
export async function getLiveCreatorRows(): Promise<LiveCreatorRow[] | null> {
  const sb = getSupabaseRead();

  // 1. Creators + their profiles (joined)
  const creators = await sb.from('creator').select('id, display_name, avatar_url');
  if (creators.error || !creators.data || creators.data.length === 0) {
    if (creators.error) console.error('[queries] getLiveCreatorRows creators', creators.error);
    return null;
  }

  const profiles = await sb
    .from('profile')
    .select('id, creator_id, platform, handle, created_at');
  if (profiles.error) {
    console.error('[queries] getLiveCreatorRows profiles', profiles.error);
    return null;
  }
  const profilesByCreator = new Map<string, typeof profiles.data>();
  for (const p of profiles.data ?? []) {
    if (!profilesByCreator.has(p.creator_id)) profilesByCreator.set(p.creator_id, []);
    profilesByCreator.get(p.creator_id)!.push(p);
  }

  // 2. Latest snapshot per profile (followers) + earliest snapshot in 30d
  // window for growth.
  const snaps = await sb
    .from('profile_snapshot')
    .select('profile_id, captured_at, captured_date, followers')
    .order('captured_at', { ascending: false })
    .limit(5000);
  if (snaps.error) {
    console.error('[queries] getLiveCreatorRows snaps', snaps.error);
    return null;
  }
  const latestSnap = new Map<string, number>();
  const earliest30d = new Map<string, number>();
  const earliestEver = new Map<string, string>();
  const thirty = new Date(Date.now() - 30 * 86400_000).toISOString();
  for (const s of snaps.data ?? []) {
    if (!latestSnap.has(s.profile_id)) latestSnap.set(s.profile_id, s.followers ?? 0);
    if (s.captured_at > thirty) earliest30d.set(s.profile_id, s.followers ?? 0);
    earliestEver.set(s.profile_id, s.captured_at);
  }

  // 3. Recent posts → engagement (limit to last 30 per profile)
  const posts = await sb
    .from('post_snapshot')
    .select('profile_id, likes, comments, shares')
    .order('captured_at', { ascending: false })
    .limit(5000);
  if (posts.error) {
    console.error('[queries] getLiveCreatorRows posts', posts.error);
    return null;
  }
  const engagementByProfile = new Map<string, { totalEng: number; count: number }>();
  for (const p of posts.data ?? []) {
    const cur = engagementByProfile.get(p.profile_id) || { totalEng: 0, count: 0 };
    cur.totalEng += (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);
    cur.count += 1;
    engagementByProfile.set(p.profile_id, cur);
  }

  // 4. Roll up per creator
  const now = Date.now();
  const rows: Omit<LiveCreatorRow, 'rank'>[] = [];
  for (const c of creators.data) {
    const cProfiles = profilesByCreator.get(c.id) ?? [];
    if (cProfiles.length === 0) continue;

    let followers = 0;
    let prior = 0;
    let priorSeen = false;
    let totalEng = 0;
    let totalPosts = 0;
    let mostRecentProfile = cProfiles[0];

    for (const p of cProfiles) {
      followers += latestSnap.get(p.id) ?? 0;
      const e = engagementByProfile.get(p.id);
      if (e) {
        totalEng += e.totalEng;
        totalPosts += e.count;
      }
      const priorVal = earliest30d.get(p.id);
      if (priorVal !== undefined) {
        prior += priorVal;
        priorSeen = true;
      }
      if (
        new Date(p.created_at).getTime() <
        new Date(mostRecentProfile.created_at).getTime()
      ) {
        mostRecentProfile = p;
      }
    }

    // Tracked-days from earliest snapshot of any profile of this creator
    let trackedDays = 0;
    for (const p of cProfiles) {
      const e = earliestEver.get(p.id);
      if (e) {
        const days = (now - new Date(e).getTime()) / 86400_000;
        if (days > trackedDays) trackedDays = days;
      }
    }
    const insufficient = trackedDays < INSUFFICIENT_DAYS;

    const growth30d = priorSeen && !insufficient ? followers - prior : 0;
    const engagementRate =
      followers > 0 && totalPosts > 0
        ? (totalEng / totalPosts / followers) * 100
        : 0;

    rows.push({
      handle: mostRecentProfile.handle ?? c.display_name ?? c.id.slice(0, 8),
      primaryPlatform: dbPlatformToKey(mostRecentProfile.platform),
      followers,
      growth30d,
      engagementRate,
      insufficient,
    });
  }

  if (rows.length === 0) return null;

  // 5. Rank by followers
  rows.sort((a, b) => b.followers - a.followers);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ---------- Creator detail (Task 5 step 3) ----------

export interface CreatorPlatformSlot {
  platform: PlatformKey;
  /** The DB platform string (e.g. 'rednote' even when key is 'xiaohongshu'). */
  dbPlatform: string;
  handle: string | null;
  nickname: string | null;
  profileUrl: string;
  followers: number | null;
  following: number | null;
  totalViews: number | null;
  totalLikes: number | null;
  capturedAt: string | null;
  scrapeStatus: string;
}

export interface CreatorDetail {
  /** UUID of the creator row */
  creatorId: string;
  /** Best display name found (creator.display_name → snapshot.raw.fullName → handle) */
  displayName: string;
  /** Best avatar URL we have (from latest snapshot.raw.profilePicUrlHD / profilePicUrl) */
  avatarUrl: string | null;
  /** Bio pulled from snapshot.raw.biography */
  biography: string | null;
  /** Sum of latest followers across all profiles */
  totalFollowers: number;
  platforms: CreatorPlatformSlot[];
}

/**
 * Pick the latest snapshot per profile_id from a recent slice of snapshots.
 * Shared between getCreatorByHandle and getCreatorPlatformDetail.
 */
async function latestSnapshotsForProfiles(
  profileIds: string[],
): Promise<Map<string, { followers: number | null; following: number | null; total_views: number | null; total_likes: number | null; captured_at: string; raw: unknown }>> {
  const map = new Map<string, { followers: number | null; following: number | null; total_views: number | null; total_likes: number | null; captured_at: string; raw: unknown }>();
  if (profileIds.length === 0) return map;
  const sb = getSupabaseRead();
  const res = await sb
    .from('profile_snapshot')
    .select('profile_id, followers, following, total_views, total_likes, captured_at, raw')
    .in('profile_id', profileIds)
    .order('captured_at', { ascending: false });
  if (res.error) {
    console.error('[queries] latestSnapshotsForProfiles', res.error);
    return map;
  }
  for (const row of res.data ?? []) {
    if (!map.has(row.profile_id)) {
      map.set(row.profile_id, {
        followers: row.followers,
        following: row.following,
        total_views: row.total_views,
        total_likes: row.total_likes,
        captured_at: row.captured_at,
        raw: row.raw,
      });
    }
  }
  return map;
}

/**
 * Pull profile pic + display name + bio from the snapshot.raw blob if present.
 * Apify's instagram-scraper puts these on each post item.
 */
function extractRawProfileFields(raw: unknown): {
  avatarUrl: string | null;
  fullName: string | null;
  biography: string | null;
} {
  if (!raw || typeof raw !== 'object') {
    return { avatarUrl: null, fullName: null, biography: null };
  }
  const r = raw as Record<string, unknown>;
  // Apify post item carries the profile fields. profile_snapshot.raw on the
  // other hand is our own summary blob, which only has username/fullName.
  // post_snapshot.raw is the richer source — see getCreatorByHandle for the
  // fallback chain.
  return {
    avatarUrl:
      (typeof r.profilePicUrlHD === 'string' && r.profilePicUrlHD) ||
      (typeof r.profilePicUrl === 'string' && r.profilePicUrl) ||
      null,
    fullName: typeof r.fullName === 'string' ? r.fullName : null,
    biography: typeof r.biography === 'string' ? r.biography : null,
  };
}

/**
 * Resolve a creator by any of their profile handles. Returns null when no
 * profile.handle matches and no creator.display_name matches.
 */
export async function getCreatorByHandle(
  handle: string,
): Promise<CreatorDetail | null> {
  const sb = getSupabaseRead();

  // 1. Find profile by handle (case-insensitive)
  const profileRes = await sb
    .from('profile')
    .select('id, creator_id, platform, profile_url, handle, nickname, scrape_status')
    .ilike('handle', handle)
    .limit(1)
    .maybeSingle();
  if (profileRes.error) {
    console.error('[queries] getCreatorByHandle profile lookup', profileRes.error);
    return null;
  }
  if (!profileRes.data) return null;

  // 2. Pull every profile for that creator
  const allProfilesRes = await sb
    .from('profile')
    .select('id, platform, profile_url, handle, nickname, scrape_status')
    .eq('creator_id', profileRes.data.creator_id);
  if (allProfilesRes.error) {
    console.error('[queries] getCreatorByHandle all-profiles', allProfilesRes.error);
    return null;
  }
  const allProfiles = allProfilesRes.data ?? [];

  // 3. Latest snapshots
  const profileIds = allProfiles.map((p) => p.id);
  const latest = await latestSnapshotsForProfiles(profileIds);

  // 4. Pull most-recent post per profile so we get fresh profilePicUrl/biography
  const recentPostRes = await sb
    .from('post_snapshot')
    .select('profile_id, raw, captured_at')
    .in('profile_id', profileIds)
    .order('captured_at', { ascending: false })
    .limit(profileIds.length * 2);
  const postRawByProfile = new Map<string, unknown>();
  for (const r of recentPostRes.data ?? []) {
    if (!postRawByProfile.has(r.profile_id)) {
      postRawByProfile.set(r.profile_id, r.raw);
    }
  }

  // 5. Creator row (display_name)
  const creatorRes = await sb
    .from('creator')
    .select('id, display_name, avatar_url')
    .eq('id', profileRes.data.creator_id)
    .maybeSingle();
  if (creatorRes.error || !creatorRes.data) {
    console.error('[queries] getCreatorByHandle creator', creatorRes.error);
    return null;
  }

  // 6. Roll up
  let totalFollowers = 0;
  let bestAvatar: string | null = creatorRes.data.avatar_url ?? null;
  let bestFullName: string | null = creatorRes.data.display_name;
  let bestBio: string | null = null;
  const slots: CreatorPlatformSlot[] = [];

  for (const p of allProfiles) {
    const snap = latest.get(p.id);
    if (snap?.followers) totalFollowers += snap.followers;

    const rawFromPost = postRawByProfile.get(p.id);
    const rawFromSnap = snap?.raw;
    const fromPost = extractRawProfileFields(rawFromPost);
    const fromSnap = extractRawProfileFields(rawFromSnap);
    if (!bestAvatar) bestAvatar = fromPost.avatarUrl ?? fromSnap.avatarUrl;
    if (!bestFullName) bestFullName = fromPost.fullName ?? fromSnap.fullName;
    if (!bestBio) bestBio = fromPost.biography ?? fromSnap.biography;

    slots.push({
      platform: dbPlatformToKey(p.platform),
      dbPlatform: p.platform,
      handle: p.handle,
      nickname: p.nickname,
      profileUrl: p.profile_url,
      followers: snap?.followers ?? null,
      following: snap?.following ?? null,
      totalViews: snap?.total_views ?? null,
      totalLikes: snap?.total_likes ?? null,
      capturedAt: snap?.captured_at ?? null,
      scrapeStatus: p.scrape_status,
    });
  }

  return {
    creatorId: creatorRes.data.id,
    displayName: bestFullName || handle,
    avatarUrl: bestAvatar,
    biography: bestBio,
    totalFollowers,
    platforms: slots,
  };
}

// ---------- Per-platform detail (recent posts) ----------

export interface PlatformPostRow {
  externalId: string;
  url: string;
  type: 'image' | 'video' | 'reel' | 'carousel' | 'note' | 'text';
  thumbnailUrl: string | null;
  caption: string;
  hashtags: string[];
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  views: number | null;
  mediaCount: number | null;
  durationSec: number | null;
}

export interface CreatorPlatformDetail {
  creator: CreatorDetail;
  /** The slot for this specific platform, or null if creator has no profile there. */
  slot: CreatorPlatformSlot | null;
  /** Posts (from post_snapshot). Empty array when nothing scraped yet. */
  posts: PlatformPostRow[];
}

function mapPostSnapshotToRow(raw: unknown, content_type: string | null, post: { external_post_id: string; posted_at: string | null; caption_excerpt: string | null; likes: number | null; comments: number | null; shares: number | null; views: number | null; media_url: string | null }): PlatformPostRow {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const hashtags = Array.isArray(r.hashtags) ? (r.hashtags as string[]) : [];
  const shortCode = typeof r.shortCode === 'string' ? r.shortCode : post.external_post_id;
  const childPosts = Array.isArray(r.childPosts) ? (r.childPosts as unknown[]) : [];
  const ct = (content_type ?? 'image').toLowerCase();
  const type: PlatformPostRow['type'] =
    ct === 'reel' ? 'reel'
      : ct === 'video' ? 'video'
        : childPosts.length > 0 ? 'carousel'
          : 'image';

  return {
    externalId: post.external_post_id,
    url: typeof r.url === 'string' ? r.url : `https://www.instagram.com/p/${shortCode}/`,
    type,
    thumbnailUrl: post.media_url,
    caption: post.caption_excerpt ?? '',
    hashtags,
    publishedAt: post.posted_at ?? new Date().toISOString(),
    likes: post.likes ?? 0,
    comments: post.comments ?? 0,
    shares: post.shares ?? 0,
    views: post.views,
    mediaCount: childPosts.length > 0 ? childPosts.length + 1 : null,
    durationSec: null, // IG actor doesn't surface duration; future adapters may
  };
}

/**
 * Per-platform creator view. Returns null when the creator handle resolves
 * to nothing; returns CreatorPlatformDetail with empty posts when the
 * creator exists but has no scraped data for the requested platform yet.
 */
export async function getCreatorPlatformDetail(
  handle: string,
  platformKey: PlatformKey,
): Promise<CreatorPlatformDetail | null> {
  const creator = await getCreatorByHandle(handle);
  if (!creator) return null;
  const slot = creator.platforms.find((p) => p.platform === platformKey) ?? null;
  if (!slot) return { creator, slot: null, posts: [] };

  const sb = getSupabaseRead();
  const postsRes = await sb
    .from('post_snapshot')
    .select(
      'external_post_id, posted_at, caption_excerpt, likes, comments, shares, views, media_url, content_type, raw',
    )
    .eq('profile_id', (
      await sb.from('profile').select('id')
        .eq('creator_id', creator.creatorId)
        .eq('platform', slot.dbPlatform)
        .limit(1).single()
    ).data?.id ?? '')
    .order('captured_at', { ascending: false })
    .limit(60);

  if (postsRes.error) {
    console.error('[queries] getCreatorPlatformDetail posts', postsRes.error);
    return { creator, slot, posts: [] };
  }

  // Dedupe by external_post_id (we have up to 2 days × 30 = 60 rows; keep newest)
  const seen = new Set<string>();
  const rows: PlatformPostRow[] = [];
  for (const r of postsRes.data ?? []) {
    if (seen.has(r.external_post_id)) continue;
    seen.add(r.external_post_id);
    rows.push(mapPostSnapshotToRow(r.raw, r.content_type, r));
    if (rows.length >= 30) break;
  }
  return { creator, slot, posts: rows };
}
