/**
 * Daily snapshot cron — runs once every 24h via Vercel Cron.
 *
 * Schedule lives in vercel.json. v1 picks 02:00 UTC (mid-window of spec's
 * 00:00-06:00 stagger). The spec's 6-hour staggered window is deferred to
 * Plan-wins-over-spec MVP.
 *
 * Auth model:
 *   Production: Vercel Cron requests carry x-vercel-cron-signature; we ALSO
 *   require Authorization: Bearer ${CRON_SECRET}. Set CRON_SECRET in Vercel
 *   project env, then add it as the cron's header in vercel.json. Local
 *   manual runs just use curl with the same bearer.
 *
 * Failure semantics:
 *   Sequential per profile. One profile's failure does NOT abort the loop.
 *   Each profile's status is updated to the appropriate scrape_status code
 *   so the UI can surface badges (Task 5 step 2).
 */

import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { runScraper, ScrapeError } from '@d3/scrapers';
import {
  listScrapeableProfiles,
  setProfileStatus,
  upsertPostSnapshots,
  upsertProfileSnapshot,
} from '@d3/database';

// Cap dev/manual invocations to a reasonable budget. Vercel Functions
// default 300s timeout; spec says max 5 parallel concurrent Apify runs.
// We run SEQUENTIAL in v1 — at ~50s per IG scrape, that's ~6 profiles max
// per cron invocation before the function times out. Acceptable for MVP.
export const maxDuration = 300;

// Server-only — never prerender at build time.
export const dynamic = 'force-dynamic';

interface ProfileResult {
  profile_id: string;
  platform: string;
  handle: string | null;
  status: 'ok' | 'failed' | 'private' | 'not_found' | 'throttled' | 'handle_changed';
  posts_written?: number;
  error?: string;
}

function assertAuth(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Be loud — never let a misconfigured prod silently accept anonymous traffic.
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on the server' },
      { status: 500 },
    );
  }
  const auth = request.headers.get('authorization') || '';
  const expectedFull = `Bearer ${expected}`;
  // Length check first so timingSafeEqual doesn't throw on mismatched buffers.
  // The length-mismatch path leaks only "wrong length", not which character —
  // an acceptable oracle for a high-entropy random secret.
  if (
    auth.length !== expectedFull.length ||
    !timingSafeEqual(Buffer.from(auth, 'utf8'), Buffer.from(expectedFull, 'utf8'))
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  const authFail = assertAuth(request);
  if (authFail) return authFail;

  const startedAt = new Date();
  let profiles;
  try {
    profiles = await listScrapeableProfiles();
  } catch (err) {
    return NextResponse.json(
      { error: 'listScrapeableProfiles failed', detail: (err as Error).message },
      { status: 500 },
    );
  }

  const results: ProfileResult[] = [];

  for (const profile of profiles) {
    try {
      const { profile: snap, posts } = await runScraper(
        profile.platform,
        profile.profile_url,
      );

      await upsertProfileSnapshot(profile.id, snap);
      const { written } = await upsertPostSnapshots(profile.id, posts);
      await setProfileStatus(profile.id, 'ok');

      results.push({
        profile_id: profile.id,
        platform: profile.platform,
        handle: profile.handle,
        status: 'ok',
        posts_written: written,
      });
    } catch (err) {
      const status = err instanceof ScrapeError ? err.status : 'failed';
      try {
        await setProfileStatus(profile.id, status);
      } catch {
        // Status update itself failed — swallow so the loop continues.
      }
      results.push({
        profile_id: profile.id,
        platform: profile.platform,
        handle: profile.handle,
        status,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const finishedAt = new Date();
  const summary = {
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    elapsed_ms: finishedAt.getTime() - startedAt.getTime(),
    total: profiles.length,
    by_status: results.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {}),
    results,
  };

  return NextResponse.json(summary, { status: 200 });
}
