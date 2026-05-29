/**
 * Cron health endpoint. Returns the last N archive_run rows (the
 * /api/cron/archive-and-purge Vercel cron's log).
 *
 * pg_cron history is NOT exposed here — cron.job_run_details lives in the
 * cron schema and PostgREST does not surface it. Query it directly in the
 * Supabase SQL editor:
 *
 *   -- For pg_cron history query via Supabase SQL editor:
 *   select * from cron.job_run_details order by start_time desc limit 20;
 *
 * Auth: Bearer ${CRON_SECRET}. Same secret as the cron handlers themselves
 * — gates this admin endpoint behind a value only the operator should know.
 *
 * Curl:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://<host>/api/admin/cron-health?limit=10
 */

import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@d3/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function assertAuth(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error('[cron] CRON_SECRET not set — cron auth will fail');
    return NextResponse.json(
      {
        error:
          'CRON_SECRET not configured on the server — add it to Vercel project env vars',
      },
      { status: 500 },
    );
  }
  const auth = request.headers.get('authorization') || '';
  const expectedFull = `Bearer ${expected}`;
  if (
    auth.length !== expectedFull.length ||
    !timingSafeEqual(Buffer.from(auth, 'utf8'), Buffer.from(expectedFull, 'utf8'))
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

function clampLimit(raw: string | null): number {
  const n = raw ? Number(raw) : 10;
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(n, 100);
}

export async function GET(request: Request): Promise<Response> {
  const authFail = assertAuth(request);
  if (authFail) return authFail;

  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get('limit'));
  const sb = getSupabaseAdmin();

  // archive_run rows — most recent first.
  // For pg_cron history query via Supabase SQL editor:
  //   select * from cron.job_run_details order by start_time desc limit 20
  const archiveRuns = await sb
    .from('archive_run')
    .select(
      'id, started_at, finished_at, status, profile_snapshots_archived, post_snapshots_archived, profile_snapshots_deleted, post_snapshots_deleted, error_message',
    )
    .order('started_at', { ascending: false })
    .limit(limit);

  return NextResponse.json({
    archive_runs: archiveRuns.data ?? [],
    archive_runs_error: archiveRuns.error?.message ?? null,
    limit,
  });
}
