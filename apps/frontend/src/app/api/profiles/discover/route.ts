/**
 * POST /api/profiles/discover — cross-platform Auto-Discovery.
 *
 * Given a logged-in user, looks at every profile they already have a claim on
 * and finds plausible cross-platform matches they haven't claimed yet. Returns
 * a ranked list bucketed into 'high' (>=0.92) and 'review' (>=0.75).
 *
 * Rate-limited: 5 requests / minute / user (Upstash, optional). The candidate
 * pool query is cheap, but enumeration could be used to fingerprint who's on
 * the platform — so we gate it.
 */

import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { findCandidatesByHandle, type DiscoveryCandidate } from '@d3/database';

import { getSupabaseRoute } from '../../../../lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ratelimit: Ratelimit | null =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, '60 s'),
        analytics: false,
        prefix: 'profiles-discover',
      })
    : null;

function jsonError(status: number, error: string): Response {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(_request: Request): Promise<Response> {
  const route = await getSupabaseRoute();
  const {
    data: { user },
    error: userErr,
  } = await route.auth.getUser();
  if (userErr || !user) return jsonError(401, 'unauthorized');

  if (ratelimit) {
    const rl = await ratelimit.limit(user.id);
    if (!rl.success) return jsonError(429, 'rate limit exceeded');
  }

  // Load every profile the caller already claims (any kind). Each is a seed
  // for cross-platform discovery, and also an exclusion (don't suggest a
  // profile they already track).
  const ownClaims = await route
    .from('profile_claim')
    .select('profile_id, profile:profile_id(id, platform, handle)')
    .eq('user_id', user.id);
  if (ownClaims.error) {
    return jsonError(500, `own claims query failed: ${ownClaims.error.message}`);
  }
  // supabase-js types the embedded to-one `profile` as an array; it's a single
  // row at runtime. Cast through `unknown` (codebase convention) to correct it.
  const seeds = ((ownClaims.data ?? []) as unknown as Array<{
    profile_id: string;
    profile: { id: string; platform: import('@d3/database').Platform; handle: string | null } | null;
  }>).filter((c) => c.profile?.handle);

  if (seeds.length === 0) {
    return NextResponse.json({ ok: true, candidates: [] }, { status: 200 });
  }

  const ownedIds = seeds.map((s) => s.profile_id);
  const merged = new Map<string, DiscoveryCandidate>();

  // Run discovery per seed and deduplicate by profile_id, keeping the highest
  // score across seeds. A creator with a known TikTok + Instagram will pull IG
  // candidates from the TT seed AND vice versa — we want the union, ranked.
  for (const seed of seeds) {
    if (!seed.profile?.handle) continue;
    const res = await findCandidatesByHandle({
      seedPlatform: seed.profile.platform,
      seedHandle: seed.profile.handle,
      excludeProfileIds: ownedIds,
      limit: 10,
    });
    if (res.ok !== true) continue;
    for (const c of res.value) {
      const existing = merged.get(c.profile.id);
      if (!existing || c.score > existing.score) merged.set(c.profile.id, c);
    }
  }

  const candidates = Array.from(merged.values()).sort((a, b) => b.score - a.score);

  return NextResponse.json({ ok: true, candidates }, { status: 200 });
}
