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
