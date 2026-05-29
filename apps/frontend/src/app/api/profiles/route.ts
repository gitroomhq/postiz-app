/**
 * POST /api/profiles — creator-initiated add-or-claim flow.
 *
 * The single entry point for "I want to track this URL". Behaviour:
 *  1. Auth — cookie-aware client; 401 if no session.
 *  2. Find or create the canonical profile row (race-safe; see findOrCreateProfile).
 *  3. Decide claim_kind: 'owner' if newly created OR the URL's handle matches
 *     one of the caller's known handles; otherwise 'pending'.
 *  4. INSERT profile_claim (idempotent on (user_id, profile_id)).
 *  5. Fire the first scrape if the profile is newly created. Best-effort,
 *     fire-and-forget — the daily cron will pick it up tomorrow regardless.
 *
 * The auth surface here is INTENTIONALLY tighter than the spec wording. The
 * route never accepts an explicit creator_id from the request body — it uses
 * the caller's own creator_link.creator_id as the fallback owner-creator when
 * a new profile row needs to be inserted. Admin assignment to other creators
 * is a separate flow (/api/admin/profiles, not implemented in this commit).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  addProfileClaim,
  decideInitialClaimKind,
  ensureCreatorForUser,
  findOrCreateProfile,
  validateProfileUrl,
  type Platform,
} from '@d3/database';

import { getSupabaseRoute } from '../../../lib/supabase-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLATFORMS: ReadonlyArray<Platform> = [
  'instagram',
  'tiktok',
  'facebook',
  'rednote',
  'douyin',
];

const BodySchema = z.object({
  platform: z.enum(PLATFORMS as [Platform, ...Platform[]]),
  profile_url: z.string().min(1).max(2048),
});

function jsonError(status: number, error: string): Response {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Walks the caller's existing claims + onboarding URLs to collect every handle
 * we know to be theirs. Used by decideInitialClaimKind to auto-confirm a new
 * claim when the URL's handle matches.
 */
async function collectOwnHandles(
  userId: string,
  link: { dashboard_url: string | null; leaderboard_url: string | null } | null,
): Promise<string[]> {
  const route = await getSupabaseRoute();
  const handles: string[] = [];

  // Handles from already-claimed profiles (any kind, including pending).
  const claims = await route
    .from('profile_claim')
    .select('profile:profile_id(handle)')
    .eq('user_id', userId);
  if (!claims.error) {
    // supabase-js types the embedded to-one `profile` as an array; it's a
    // single row at runtime. Cast through `unknown` (codebase convention).
    for (const c of (claims.data ?? []) as unknown as Array<{ profile: { handle: string | null } | null }>) {
      const h = c.profile?.handle;
      if (h) handles.push(h);
    }
  }

  // Handles parsed out of the user's onboarding URLs (their attested presence).
  for (const url of [link?.dashboard_url, link?.leaderboard_url]) {
    if (!url) continue;
    for (const p of PLATFORMS) {
      const v = validateProfileUrl(p, url);
      if (v.ok === true) {
        handles.push(v.handle);
        break;
      }
    }
  }

  return handles;
}

export async function POST(request: Request): Promise<Response> {
  // 1. Parse + validate.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid JSON body');
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { platform, profile_url } = parsed.data;

  // 2. Auth.
  const route = await getSupabaseRoute();
  const {
    data: { user },
    error: userErr,
  } = await route.auth.getUser();
  if (userErr || !user) {
    return jsonError(401, 'unauthorized');
  }

  // 3. Load caller's creator_link — needed both for fallback creator_id and
  //    for the auto-confirm onboarding-handle list.
  const linkRes = await route
    .from('creator_link')
    .select('creator_id, dashboard_url, leaderboard_url, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();
  if (linkRes.error) {
    return jsonError(500, `creator_link lookup failed: ${linkRes.error.message}`);
  }
  const link = linkRes.data;

  // No onboarding wall: lazily provision the caller's creator identity if they
  // don't have one yet, so anyone signed in can start tracking URLs immediately.
  let creatorId = link?.creator_id ?? null;
  if (!creatorId) {
    const ensured = await ensureCreatorForUser({ user_id: user.id });
    if (ensured.ok !== true) {
      return jsonError(500, `could not provision creator: ${ensured.error}`);
    }
    creatorId = ensured.value.creator_id;
  }

  // 4. Find or create canonical profile.
  const foc = await findOrCreateProfile({
    platform,
    profile_url,
    fallback_creator_id: creatorId,
  });
  if (foc.ok !== true) {
    return jsonError(400, foc.error);
  }
  const { profile, created } = foc.value;

  // 5. Decide claim kind. created=true → auto-owner (first claimant rule).
  const ownHandles = await collectOwnHandles(user.id, {
    dashboard_url: link.dashboard_url,
    leaderboard_url: link.leaderboard_url,
  });
  const claimKind = decideInitialClaimKind({
    created,
    profileHandle: profile.handle,
    onboardingHandles: ownHandles,
  });

  const claimRes = await addProfileClaim({
    user_id: user.id,
    profile_id: profile.id,
    claim_kind: claimKind,
    claimed_via: 'manual',
  });
  if (claimRes.ok !== true) {
    return jsonError(500, claimRes.error);
  }

  // 6. Fire first scrape if newly created. Fire-and-forget — the daily cron
  //    will retry if this Function dies before the scrape returns.
  if (created) {
    const origin = new URL(request.url).origin;
    // `void` so we don't await; the route can return immediately.
    void fetch(`${origin}/api/scrape/${profile.id}`, {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') ?? '' },
    }).catch(() => {});
  }

  return NextResponse.json(
    {
      ok: true,
      profile,
      claim: claimRes.value,
      created,
    },
    { status: created ? 201 : 200 },
  );
}
