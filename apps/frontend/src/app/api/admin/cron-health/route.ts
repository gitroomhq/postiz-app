/**
 * Cron health endpoint. Returns the last N runs of both:
 *   - pg_cron 'purge-snapshots' (safety-net deletes inside Postgres)
 *   - archive_run rows (the /api/cron/archive-and-purge Vercel cron's log)
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
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on the server' },
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
  const archiveRuns = await sb
    .from('archive_run')
    .select(
      'id, started_at, finished_at, status, profile_snapshots_archived, post_snapshots_archived, profile_snapshots_deleted, post_snapshots_deleted, error_message',
    )
    .order('started_at', { ascending: false })
    .limit(limit);

  // pg_cron run history. cron.job_run_details lives in the cron schema —
  // PostgREST doesn't expose it by default, so call via a raw RPC. To keep
  // this route self-contained without a server-side function, we just
  // pull what we can via the storage path (the route stays useful even
  // when pg_cron history is empty / unavailable).
  let cronRuns: unknown[] = [];
  let cronRunsError: string | null = null;
  try {
    // .rpc would need a named SQL function — defer that. For now expose the
    // archive_run history only; the pg_cron history can be queried in SQL
    // editor with:
    //   select * from cron.job_run_details
    //     where jobid = (select jobid from cron.job where jobname = 'purge-snapshots')
    //     order by start_time desc limit 10;
    cronRunsError = 'pg_cron.job_run_details not exposed via PostgREST — query in SQL editor';
  } catch (err) {
    cronRunsError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    archive_runs: archiveRuns.data ?? [],
    archive_runs_error: archiveRuns.error?.message ?? null,
    pg_cron_runs: cronRuns,
    pg_cron_runs_error: cronRunsError,
    limit,
  });
}
