/**
 * Profile claim helpers.
 *
 * Layered on top of profile.creator_id ownership: a profile row has exactly
 * one canonical owner creator (FK), but many auth.users can attach to it via
 * profile_claim (claim_kind in 'owner' | 'tracker' | 'pending').
 *
 * Three responsibilities:
 *  1. findOrCreateProfile — race-safe canonical lookup-or-insert. Returns the
 *     existing row when (platform, lower(profile_url)) already exists, so a
 *     creator pasting a URL the admin already added does NOT trigger a second
 *     scrape job.
 *  2. addProfileClaim — INSERTs into profile_claim with the auto-confirm rule
 *     (claim_kind='owner' when the URL's extracted handle matches the user's
 *     onboarding-stated handle; otherwise 'pending').
 *  3. findCandidatesByHandle — cross-platform fuzzy match for Auto-Discovery,
 *     using pg_trgm + the folded-handle expression index from migration
 *     20260529000001_profile_claim.sql.
 *
 * All writes use the service-role client and bypass RLS. HTTP routes that wrap
 * these are responsible for the auth check.
 */

import { getSupabaseAdmin } from './supabase-server';
import { normalizeHandle, validateProfileUrl } from './profile-url';
import type {
  ClaimedVia,
  ClaimKind,
  DiscoveryCandidate,
  Platform,
  ProfileClaimRow,
  ProfileRow,
  Result,
} from './types';

const UNIQUE_VIOLATION = '23505';

export interface FindOrCreateInput {
  platform: Platform;
  profile_url: string;
  /** Required when a new profile row needs to be inserted. Ignored on hit. */
  fallback_creator_id?: string;
}

export interface FindOrCreateResult {
  profile: ProfileRow;
  /** true if we inserted; false if we returned a pre-existing canonical row. */
  created: boolean;
}

/**
 * Race-safe canonical profile lookup-or-insert.
 *
 * Sequence:
 *  1. Validate the URL (returns normalizedUrl + handle).
 *  2. SELECT by (platform, lower(profile_url)) — fast path for the common
 *     "URL already known" case.
 *  3. If miss, INSERT. On a unique-violation race (two requests inserting
 *     simultaneously), the second one catches 23505 and re-selects.
 *
 * Why not Supabase upsert? The unique index is on the expression
 * `lower(profile_url)`, not a column. PostgREST upsert requires onConflict to
 * reference column names or a named constraint. We could ALTER COLUMN
 * profile_url TYPE citext, but that's a bigger change with downstream type
 * implications. The SELECT-then-INSERT pattern with a unique-violation catch
 * is both simpler and more explicit about the race.
 */
export async function findOrCreateProfile(
  input: FindOrCreateInput,
): Promise<Result<FindOrCreateResult>> {
  const validation = validateProfileUrl(input.platform, input.profile_url);
  if (validation.ok !== true) {
    return { ok: false, error: validation.error };
  }

  const supabase = getSupabaseAdmin();

  // 1. Fast path — case-insensitive URL match.
  const existing = await supabase
    .from('profile')
    .select('*')
    .eq('platform', input.platform)
    .ilike('profile_url', validation.normalizedUrl)
    .maybeSingle();

  if (existing.error && existing.error.code !== 'PGRST116') {
    return { ok: false, error: `Lookup failed: ${existing.error.message}` };
  }
  if (existing.data) {
    return { ok: true, value: { profile: existing.data as ProfileRow, created: false } };
  }

  // 2. Miss — need to insert. Caller must have provided a creator_id.
  if (!input.fallback_creator_id) {
    return {
      ok: false,
      error: 'fallback_creator_id is required when the URL is not yet tracked',
    };
  }

  const insert = await supabase
    .from('profile')
    .insert({
      creator_id: input.fallback_creator_id,
      platform: input.platform,
      profile_url: validation.normalizedUrl,
      handle: validation.handle,
      scrape_status: 'pending',
    })
    .select()
    .single();

  if (insert.error) {
    // 3. Race: another request inserted between our SELECT and INSERT.
    //    Re-fetch and return the winner instead of bubbling the constraint error.
    if (insert.error.code === UNIQUE_VIOLATION) {
      const retry = await supabase
        .from('profile')
        .select('*')
        .eq('platform', input.platform)
        .ilike('profile_url', validation.normalizedUrl)
        .maybeSingle();
      if (retry.error) {
        return { ok: false, error: `Race recovery failed: ${retry.error.message}` };
      }
      if (!retry.data) {
        return { ok: false, error: 'Race recovery returned no row' };
      }
      return { ok: true, value: { profile: retry.data as ProfileRow, created: false } };
    }
    return { ok: false, error: `Insert failed: ${insert.error.message}` };
  }
  if (!insert.data) {
    return { ok: false, error: 'Insert returned no row' };
  }

  return { ok: true, value: { profile: insert.data as ProfileRow, created: true } };
}

export interface AddClaimInput {
  user_id: string;
  profile_id: string;
  claim_kind: ClaimKind;
  claimed_via: ClaimedVia;
}

/**
 * Insert a profile_claim row. Idempotent: if the (user_id, profile_id) pair
 * already exists, returns the existing row without error (so retries are safe).
 */
export async function addProfileClaim(
  input: AddClaimInput,
): Promise<Result<ProfileClaimRow>> {
  const supabase = getSupabaseAdmin();
  const confirmedAt = input.claim_kind === 'pending' ? null : new Date().toISOString();

  const insert = await supabase
    .from('profile_claim')
    .insert({
      user_id: input.user_id,
      profile_id: input.profile_id,
      claim_kind: input.claim_kind,
      claimed_via: input.claimed_via,
      confirmed_at: confirmedAt,
    })
    .select()
    .single();

  if (insert.error) {
    if (insert.error.code === UNIQUE_VIOLATION) {
      const existing = await supabase
        .from('profile_claim')
        .select('*')
        .eq('user_id', input.user_id)
        .eq('profile_id', input.profile_id)
        .single();
      if (existing.error || !existing.data) {
        return { ok: false, error: `Claim retry failed: ${existing.error?.message ?? 'no row'}` };
      }
      return { ok: true, value: existing.data as ProfileClaimRow };
    }
    return { ok: false, error: `Claim insert failed: ${insert.error.message}` };
  }
  if (!insert.data) {
    return { ok: false, error: 'Claim insert returned no row' };
  }
  return { ok: true, value: insert.data as ProfileClaimRow };
}

/**
 * Decide the initial claim_kind for a freshly-added profile.
 *
 * Rule (per design decision Q2):
 *  - The URL's extracted handle (after normalizeHandle()) matches the user's
 *    onboarding dashboard/leaderboard URL handles → 'owner' (auto-confirmed).
 *  - Otherwise → 'pending' (awaits admin approval).
 *
 * Exception: when the profile row was just created by this user (`created=true`
 * in FindOrCreateResult), they're the first claimant — we trust them as owner.
 * That removes friction for the legitimate "I'm adding myself for the first
 * time" case while still gating the "I'm claiming someone else's pre-seeded
 * URL" case.
 */
export function decideInitialClaimKind(opts: {
  created: boolean;
  profileHandle: string | null;
  onboardingHandles: ReadonlyArray<string | null | undefined>;
}): ClaimKind {
  if (opts.created) return 'owner';
  const target = normalizeHandle(opts.profileHandle);
  if (!target) return 'pending';
  for (const candidate of opts.onboardingHandles) {
    if (normalizeHandle(candidate) === target) return 'owner';
  }
  return 'pending';
}

/**
 * Cross-platform auto-discovery: given a seed handle from one platform, find
 * profiles on OTHER platforms that likely belong to the same person.
 *
 * Scoring tiers (see plan §3):
 *   1.00  exact lower(handle) match
 *   0.92  match on regexp_replace(lower(handle), '[._-]+', '', 'g')
 *   0.85  match on the same fold after stripping suffix conventions
 *   <0.85 pg_trgm similarity * 0.80
 *
 * Excludes:
 *   - profiles on the seed platform (cross-platform only)
 *   - profiles already claimed as 'owner' by ANY user (privacy + anti-squat,
 *     per decision Q3)
 *
 * Implemented as a single Postgres RPC to keep latency one round-trip. The
 * function is defined inline via execute_sql / pg in the migration; here we
 * just call it.
 */
export async function findCandidatesByHandle(input: {
  seedPlatform: Platform;
  seedHandle: string;
  excludeProfileIds?: string[];
  limit?: number;
}): Promise<Result<DiscoveryCandidate[]>> {
  const supabase = getSupabaseAdmin();
  const limit = input.limit ?? 10;
  const excludeIds = input.excludeProfileIds ?? [];

  const folded = normalizeHandle(input.seedHandle);
  const lowered = input.seedHandle.toLowerCase();

  // Pull a small pool of plausible matches across other platforms.
  // We do scoring app-side rather than SQL because (a) the variants are easy
  // to read in TS, (b) the candidate pool stays small (<=200 rows in practice),
  // (c) we can introduce a real RPC later without breaking the API.
  const pool = await supabase
    .from('profile')
    .select('*')
    .neq('platform', input.seedPlatform)
    .not('handle', 'is', null)
    .or(`handle.ilike.%${lowered}%,handle.ilike.%${folded}%`)
    .limit(200);

  if (pool.error) {
    return { ok: false, error: `Candidate pool query failed: ${pool.error.message}` };
  }

  // Hide profiles already owned by anyone else.
  const ownedRes = await supabase
    .from('profile_claim')
    .select('profile_id')
    .eq('claim_kind', 'owner');
  if (ownedRes.error) {
    return { ok: false, error: `Owner lookup failed: ${ownedRes.error.message}` };
  }
  const ownedIds = new Set((ownedRes.data ?? []).map((r) => r.profile_id as string));

  const candidates: DiscoveryCandidate[] = [];
  for (const row of (pool.data ?? []) as ProfileRow[]) {
    if (excludeIds.includes(row.id)) continue;
    if (ownedIds.has(row.id)) continue;

    const h = (row.handle ?? '').toLowerCase();
    const f = normalizeHandle(row.handle);

    let score = 0;
    let matchedOn: DiscoveryCandidate['matchedOn'] = 'trigram';

    if (h === lowered) {
      score = 1.0;
      matchedOn = 'exact';
    } else if (f === folded && folded !== '') {
      score = 0.92;
      matchedOn = 'folded';
    } else if (f && folded && (f.startsWith(folded) || folded.startsWith(f))) {
      score = 0.85;
      matchedOn = 'core';
    } else {
      // Cheap Dice-coefficient bigram approximation as a stand-in for pg_trgm.
      // The pool was already pre-filtered by ILIKE so any rows here are
      // textually close. Scale to <= 0.80 so it never beats a folded match.
      score = diceCoefficient(f || h, folded || lowered) * 0.8;
    }

    if (score >= 0.75) {
      candidates.push({
        profile: row,
        score,
        bucket: score >= 0.92 ? 'high' : 'review',
        matchedOn,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return { ok: true, value: candidates.slice(0, limit) };
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const aGrams = bigrams(a);
  const bGrams = bigrams(b);
  let intersection = 0;
  for (const [g, count] of aGrams) {
    const other = bGrams.get(g);
    if (other) intersection += Math.min(count, other);
  }
  const total = a.length - 1 + (b.length - 1);
  return (2 * intersection) / total;
}
