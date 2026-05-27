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
