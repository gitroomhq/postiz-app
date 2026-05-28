/**
 * Manual / first-scrape trigger.
 *
 * POST /api/scrape/[profileId]
 *
 * Use cases:
 *   1. Right after addProfile() — user adds a creator's IG handle and expects
 *      data within seconds, not 24h. The UI fires POST here so the first
 *      snapshot lands before the daily cron's next tick.
 *   2. Admin retries of `failed` / `throttled` profiles without waiting for
 *      the next cron cycle.
 *
 * Auth: cookie-aware Supabase client (NOT service-role). The route accepts:
 *   - The authenticated user IFF the profile's creator_id matches the user's
 *     own creator_link.creator_id (creators may trigger scrapes on their own
 *     profiles).
 *   - Admins (public.is_admin() === true) — override, allowed on any profile.
 * Anonymous requests get 401. Mismatched non-admin users get 403.
 *
 * Writes use the service-role admin client (RLS would block snapshot inserts
 * for cookie-auth users). The auth check above is the gate.
 *
 * Runs in a Vercel Function with maxDuration=300 — same budget as the daily
 * cron. The Facebook adapter is capped to 240s internally so it still throws
 * a clean ScrapeError before the Function dies (libraries/scrapers/src/adapters/facebook.ts).
 *
 * See https://vercel.com/docs/functions for the Route Handler runtime model.
 */

import { NextResponse } from 'next/server';

import { runScraper, ScrapeError } from '@d3/scrapers';
import {
  getSupabaseAdmin,
  setProfileStatus,
  upsertPostSnapshots,
  upsertProfileSnapshot,
  type ProfileRow,
  type ScrapeStatus,
} from '@d3/database';

import { getSupabaseRoute } from '../../../../lib/supabase-route';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';
// Service-role writes + scraper SDKs require the Node runtime.
export const runtime = 'nodejs';

interface RouteContext {
  // Next 15+ App Router: params is a Promise in dynamic routes.
  params: Promise<{ profileId: string }>;
}

function jsonError(status: number, error: string): Response {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(
  _request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const { profileId } = await ctx.params;
  if (!profileId || typeof profileId !== 'string') {
    return jsonError(400, 'profileId is required');
  }

  // 1. Auth — who is calling?
  const route = await getSupabaseRoute();
  const {
    data: { user },
    error: userErr,
  } = await route.auth.getUser();
  if (userErr || !user) {
    return jsonError(401, 'unauthorized');
  }

  // is_admin() is a SECURITY DEFINER SQL function (see migration
  // 20260528000000_auth_user_role_and_creator_link.sql). It reads the
  // calling user's row in public.user_role and returns boolean.
  const adminCheck = await route.rpc('is_admin');
  if (adminCheck.error) {
    return jsonError(500, `is_admin check failed: ${adminCheck.error.message}`);
  }
  const isAdmin = adminCheck.data === true;

  // 2. Load the profile (admin client — RLS would deny cross-creator reads).
  const admin = getSupabaseAdmin();
  const profileRes = await admin
    .from('profile')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();
  if (profileRes.error) {
    return jsonError(500, `load profile failed: ${profileRes.error.message}`);
  }
  const profile = profileRes.data as ProfileRow | null;
  if (!profile) {
    return jsonError(404, 'profile not found');
  }

  // 3. Authorize — admins bypass; creators may scrape their own profiles.
  if (!isAdmin) {
    const linkRes = await route
      .from('creator_link')
      .select('creator_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (linkRes.error) {
      return jsonError(500, `creator_link lookup failed: ${linkRes.error.message}`);
    }
    const ownCreatorId = linkRes.data?.creator_id ?? null;
    if (!ownCreatorId || ownCreatorId !== profile.creator_id) {
      return jsonError(403, 'forbidden');
    }
  }

  // 4. Scrape + write. Mirrors the daily-cron status-mapping behavior so the
  //    UI badges stay consistent between cron-driven and user-driven scrapes.
  try {
    const { profile: snap, posts } = await runScraper(
      profile.platform,
      profile.profile_url,
    );

    const profileWrite = await upsertProfileSnapshot(profile.id, snap);
    const postsWrite = await upsertPostSnapshots(profile.id, posts);
    await setProfileStatus(profile.id, 'ok');

    return NextResponse.json(
      {
        ok: true,
        written: {
          profile: profileWrite.written,
          posts: postsWrite.written,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    const status: ScrapeStatus =
      err instanceof ScrapeError ? (err.status as ScrapeStatus) : 'failed';
    try {
      await setProfileStatus(profile.id, status);
    } catch {
      // Best-effort — surface the original scrape error below.
    }
    return NextResponse.json(
      {
        ok: false,
        status,
        error: err instanceof Error ? err.message : String(err),
      },
      // 200 because this is a "scrape attempted, here's what happened" envelope.
      // The `ok: false` in the body is the signal — keeps client code uniform
      // with the daily-cron response shape (results[].status).
      { status: 200 },
    );
  }
}
