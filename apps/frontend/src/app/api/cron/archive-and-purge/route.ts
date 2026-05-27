/**
 * Daily archive + purge — runs 02:30 UTC via Vercel Cron (30 min ahead of
 * the pg_cron safety net at 03:00 UTC).
 *
 * Honors per-profile retention_months. For each profile, selects snapshot
 * rows older than that profile's retention window, writes them as JSONL to
 * Supabase Storage bucket 'snapshot-archive', then DELETEs them.
 *
 * If the Vercel route fails or is skipped, pg_cron at 03:00 UTC still
 * enforces retention (without the archive — bare purge).
 *
 * Auth: Bearer ${CRON_SECRET} (same pattern as daily-snapshot).
 *
 * Wire in Vercel project Cron Jobs:
 *   Path:     /api/cron/archive-and-purge
 *   Schedule: 30 2 * * *
 *   Header:   Authorization: Bearer <CRON_SECRET>
 */

import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@d3/database';

const ARCHIVE_BUCKET = 'snapshot-archive';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function assertAuth(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on the server' },
      { status: 500 },
    );
  }
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

interface ExpiringRow {
  // Common shape between profile_snapshot and post_snapshot — both have
  // profile_id + captured_date + a primary key.
  id: number;
  profile_id: string;
  captured_date: string;
}

function toJsonl(rows: unknown[]): string {
  return rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

async function archiveAndPurgeTable<T extends ExpiringRow>(
  table: 'profile_snapshot' | 'post_snapshot',
  runId: number,
): Promise<{ archived: number; deleted: number }> {
  const sb = getSupabaseAdmin();

  // Pull rows past their per-profile retention window. Server-side filter
  // via the same expression the pg_cron job uses, but expressed as a join
  // through profile.retention_months.
  // Cannot do that in PostgREST directly — fall back to an RPC or raw SQL.
  // Easiest: select all snapshot rows + a derived expired flag via RPC.
  //
  // Without RPC: do it in two steps — fetch each profile's retention, then
  // query expiring rows per profile. v1 has few profiles so this is fine.
  const profiles = await sb.from('profile').select('id, retention_months');
  if (profiles.error) throw new Error(`profile fetch: ${profiles.error.message}`);

  let totalArchived = 0;
  let totalDeleted = 0;

  for (const p of profiles.data ?? []) {
    const months = (p.retention_months as number) ?? 6;
    // captured_date < current_date - interval N months
    // Postgres date arithmetic — use the rest endpoint's filter syntax.
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    const cutoffIso = cutoff.toISOString().slice(0, 10);

    const expired = await sb
      .from(table)
      .select('*')
      .eq('profile_id', p.id as string)
      .lt('captured_date', cutoffIso);
    if (expired.error) throw new Error(`${table} select: ${expired.error.message}`);
    const rows = (expired.data ?? []) as T[];
    if (rows.length === 0) continue;

    // Write JSONL to Storage. Path:
    //   snapshot-archive/<table>/<profile_id>/run-<runId>.jsonl
    const path = `${table}/${p.id}/run-${runId}.jsonl`;
    const body = toJsonl(rows);
    const up = await sb.storage.from(ARCHIVE_BUCKET).upload(path, body, {
      contentType: 'application/x-ndjson',
      upsert: true,
    });
    if (up.error) throw new Error(`storage upload (${path}): ${up.error.message}`);
    totalArchived += rows.length;

    // Delete the now-archived rows by id. Chunked because PostgREST .in()
    // can choke on huge lists.
    const ids = rows.map((r) => r.id);
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const del = await sb.from(table).delete().in('id', slice);
      if (del.error) throw new Error(`${table} delete: ${del.error.message}`);
      totalDeleted += slice.length;
    }
  }

  return { archived: totalArchived, deleted: totalDeleted };
}

export async function GET(request: Request): Promise<Response> {
  const authFail = assertAuth(request);
  if (authFail) return authFail;

  const sb = getSupabaseAdmin();

  // Start a run row up front so we can update with results / errors.
  const created = await sb
    .from('archive_run')
    .insert({})
    .select('id')
    .single();
  if (created.error || !created.data) {
    return NextResponse.json(
      { error: 'failed to create archive_run row', detail: created.error?.message },
      { status: 500 },
    );
  }
  const runId = created.data.id as number;

  try {
    const profResult = await archiveAndPurgeTable('profile_snapshot', runId);
    const postResult = await archiveAndPurgeTable('post_snapshot', runId);

    const finishedAt = new Date().toISOString();
    await sb
      .from('archive_run')
      .update({
        finished_at: finishedAt,
        status: 'ok',
        profile_snapshots_archived: profResult.archived,
        post_snapshots_archived: postResult.archived,
        profile_snapshots_deleted: profResult.deleted,
        post_snapshots_deleted: postResult.deleted,
      })
      .eq('id', runId);

    return NextResponse.json({
      run_id: runId,
      status: 'ok',
      profile_snapshots: profResult,
      post_snapshots: postResult,
      finished_at: finishedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sb
      .from('archive_run')
      .update({
        finished_at: new Date().toISOString(),
        status: 'failed',
        error_message: msg,
      })
      .eq('id', runId);
    return NextResponse.json(
      { run_id: runId, status: 'failed', error: msg },
      { status: 500 },
    );
  }
}
