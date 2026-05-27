-- Per-profile retention + archive infrastructure.
--
-- Adds:
--   1. profile.retention_months — per-profile cap. Default 6mo (matches the
--      earlier global rule). High-value profiles can be bumped to 12/24/etc.
--      via direct SQL update; no UI for now.
--   2. Storage bucket 'snapshot-archive' — JSONL dumps of expiring rows land
--      here before the daily purge. Private; service_role only.
--   3. archive_run table — one row per archive+purge pass, with counts +
--      status + error_message. Read by /api/admin/cron-health.
--   4. Updated pg_cron job — now honors per-profile retention_months. Kept
--      as a safety net; the new Vercel route at /api/cron/archive-and-purge
--      runs first at 02:30 UTC (archives then deletes), pg_cron at 03:00 UTC
--      picks up anything the Vercel route missed.

-- 1. Per-profile retention column.
alter table public.profile
  add column if not exists retention_months smallint not null default 6
  check (retention_months >= 1);
comment on column public.profile.retention_months is
  'How many months of snapshot history to keep for this profile. Default 6. Used by the daily archive+purge cron.';

-- 2. Archive bucket. Private — only service_role can read/write.
insert into storage.buckets (id, name, public)
  values ('snapshot-archive', 'snapshot-archive', false)
  on conflict (id) do nothing;

-- 3. archive_run log table.
create table if not exists public.archive_run (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running','ok','failed')),
  profile_snapshots_archived int not null default 0,
  post_snapshots_archived int not null default 0,
  profile_snapshots_deleted int not null default 0,
  post_snapshots_deleted int not null default 0,
  error_message text
);
create index if not exists archive_run_started_at_idx
  on public.archive_run (started_at desc);

-- RLS — server-only writes via service_role. No public read; cron-health
-- route uses the service_role client which bypasses RLS.
alter table public.archive_run enable row level security;

-- 4. Re-schedule the pg_cron job with per-profile retention.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-snapshots-6mo') then
    perform cron.unschedule('purge-snapshots-6mo');
  end if;
end$$;

select cron.schedule(
  'purge-snapshots',
  '0 3 * * *',
  $job$
    delete from public.profile_snapshot ps
      using public.profile p
      where ps.profile_id = p.id
        and ps.captured_date < (current_date - make_interval(months => p.retention_months));

    delete from public.post_snapshot psn
      using public.profile p
      where psn.profile_id = p.id
        and psn.captured_date < (current_date - make_interval(months => p.retention_months));
  $job$
);
