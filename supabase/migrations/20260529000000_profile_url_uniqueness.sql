-- D3 Creator — profile URL uniqueness (2026-05-29)
-- Single canonical profile row per (platform, URL). Prevents duplicate scrape targets.
-- Pre-flight audit on prod (2026-05-29): 1 profile row, 0 duplicate groups.
--
-- The constraint is expressed as a UNIQUE INDEX on (platform, lower(profile_url)) so
-- the existing text column type does not need to change. lower() is sufficient because
-- validateProfileUrl() in libraries/database/src/profile-url.ts already lower-cases the
-- host and strips trailing slashes — so two callers producing the same logical URL
-- normalize to byte-identical strings before insert.
--
-- The handle index is partial (WHERE handle IS NOT NULL) because handle is nullable;
-- Postgres unique indexes treat NULL as distinct anyway, but a partial index makes
-- intent explicit and skips storage for unhandled rows.

create unique index if not exists profile_platform_url_unique
  on public.profile (platform, lower(profile_url));

create unique index if not exists profile_platform_handle_unique
  on public.profile (platform, lower(handle))
  where handle is not null;
