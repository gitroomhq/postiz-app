-- 6-month retention cap for snapshot tables.
-- Runs daily 03:00 UTC via pg_cron. Deletes profile_snapshot + post_snapshot
-- rows older than 6 months, bounded by captured_date.
--
-- Today (2026-05-28) the v1 schema is fresh so first run deletes 0 rows.
-- Steady-state: yesterday's data lands today, drops out of the table on the
-- 183rd day after capture (no upper-bound surprises).

create extension if not exists pg_cron;

-- Indexes to speed up the daily DELETE scan. The existing UNIQUE index is on
-- (profile_id, captured_date) — leftmost-column rule means a pure scan on
-- captured_date alone wouldn't use it.
create index if not exists profile_snapshot_captured_date_idx
  on public.profile_snapshot (captured_date);
create index if not exists post_snapshot_captured_date_idx
  on public.post_snapshot (captured_date);

-- Idempotent: drop any previous schedule with the same name before re-creating.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-snapshots-6mo') then
    perform cron.unschedule('purge-snapshots-6mo');
  end if;
end$$;

select cron.schedule(
  'purge-snapshots-6mo',
  '0 3 * * *',
  $job$
    delete from public.profile_snapshot
      where captured_date < (current_date - interval '6 months');
    delete from public.post_snapshot
      where captured_date < (current_date - interval '6 months');
  $job$
);
