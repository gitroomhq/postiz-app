/**
 * POST /api/profiles/claim — accept an Auto-Discovery candidate.
 *
 * Body: { profile_id: string }
 *
 * Adds the caller as a claimant of the given profile. claim_kind decision:
 *  - 'owner' if the profile's handle matches one of the caller's known handles
 *  - 'pending' otherwise (admin must approve)
 *
 * Idempotent — if a (user_id, profile_id) claim already exists, we return it
 * unchanged.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  addProfileClaim,
  decideInitialClaimKind,
  validateProfileUrl,
  type Platform,
} from '@d3/database';

import { getSupabaseRoute } from '../../../../lib/supabase-route';

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
  profile_id: z.string().uuid(),
});

function jsonError(status: number, error: string): Response {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request): Promise<Response> {
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

  const route = await getSupabaseRoute();
  const {
    data: { user },
    error: userErr,
  } = await route.auth.getUser();
  if (userErr || !user) return jsonError(401, 'unauthorized');

  // Load the profile to extract its handle for the auto-confirm comparison.
  const profileRes = await route
    .from('profile')
    .select('id, handle')
    .eq('id', parsed.data.profile_id)
    .maybeSingle();
  if (profileRes.error) {
    return jsonError(500, `profile lookup failed: ${profileRes.error.message}`);
  }
  if (!profileRes.data) return jsonError(404, 'profile not found');

  const linkRes = await route
    .from('creator_link')
    .select('dashboard_url, leaderboard_url')
    .eq('user_id', user.id)
    .maybeSingle();
  if (linkRes.error) {
    return jsonError(500, `creator_link lookup failed: ${linkRes.error.message}`);
  }

  // Build the user's known handles for auto-confirm: claimed-profile handles
  // + handles extracted from their onboarding URLs.
  const handlesFromClaims = await route
    .from('profile_claim')
    .select('profile:profile_id(handle)')
    .eq('user_id', user.id);
  const ownHandles: string[] = [];
  // supabase-js types the embedded to-one `profile` as an array; it's a single
  // row at runtime. Cast through `unknown` (codebase convention) to correct it.
  for (const c of (handlesFromClaims.data ?? []) as unknown as Array<{
    profile: { handle: string | null } | null;
  }>) {
    if (c.profile?.handle) ownHandles.push(c.profile.handle);
  }
  for (const url of [linkRes.data?.dashboard_url, linkRes.data?.leaderboard_url]) {
    if (!url) continue;
    for (const p of PLATFORMS) {
      const v = validateProfileUrl(p, url);
      if (v.ok === true) {
        ownHandles.push(v.handle);
        break;
      }
    }
  }

  const claimKind = decideInitialClaimKind({
    created: false,
    profileHandle: profileRes.data.handle,
    onboardingHandles: ownHandles,
  });

  const claimRes = await addProfileClaim({
    user_id: user.id,
    profile_id: profileRes.data.id,
    claim_kind: claimKind,
    claimed_via: 'auto_discovery',
  });
  if (claimRes.ok !== true) return jsonError(500, claimRes.error);

  return NextResponse.json({ ok: true, claim: claimRes.value }, { status: 200 });
}
