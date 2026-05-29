-- D3 Creator — profile_claim junction + auto-discovery indexes (2026-05-29)
-- Many-to-many between auth.users and profile, layered on top of profile.creator_id
-- (which remains the canonical "owner creator" of the profile row).
--
-- claim_kind:
--   owner    — this user is the creator behind the profile (full control)
--   tracker  — this user watches the profile (read-only, e.g. agency staff)
--   pending  — claimed but awaiting admin approval (handle did not auto-match)
--
-- claimed_via tracks provenance for audit:
--   manual          — user typed/pasted the URL
--   auto_discovery  — user accepted a suggested cross-platform match
--   admin_assigned  — admin attached the user to a pre-existing profile

create extension if not exists pg_trgm;

create table public.profile_claim (
  user_id      uuid not null references auth.users(id) on delete cascade,
  profile_id   uuid not null references public.profile(id) on delete cascade,
  claim_kind   text not null check (claim_kind in ('owner','tracker','pending')),
  claimed_via  text not null check (claimed_via in ('manual','auto_discovery','admin_assigned')),
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  primary key (user_id, profile_id)
);

create index profile_claim_profile_idx on public.profile_claim (profile_id);
create index profile_claim_user_kind_idx on public.profile_claim (user_id, claim_kind);

-- Only one confirmed owner per profile. tracker/pending users may stack.
create unique index profile_claim_one_owner
  on public.profile_claim (profile_id)
  where claim_kind = 'owner';

-- Discovery indexes on profile (added here, not on the init migration, to keep
-- pg_trgm dependency isolated to the discovery feature)
create index profile_handle_trgm
  on public.profile using gin (lower(handle) gin_trgm_ops)
  where handle is not null;

-- Stripped/folded handle index for exact-after-fold match (e.g. "j.smith_" → "jsmith")
create index profile_handle_folded
  on public.profile (regexp_replace(lower(handle), '[._\-]+', '', 'g'))
  where handle is not null;

-- RLS
alter table public.profile_claim enable row level security;

create policy "user reads own claims"
  on public.profile_claim for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user inserts own claims"
  on public.profile_claim for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user deletes own claims"
  on public.profile_claim for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Note: no update policy for non-admins. claim_kind is set at insert; transitioning
-- from pending → owner is an admin operation (or app-server-mediated via service role).
create policy "admin manages claims"
  on public.profile_claim for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Allow creator-role users to SELECT any profile they have a claim on.
-- The base "public read profile" policy already permits SELECT for anon+authenticated
-- (D3 is a public showcase), so this is additive and doesn't reduce access. It's
-- listed here for clarity; if "public read profile" is ever removed, this becomes
-- the load-bearing read for /me.
create policy "user reads claimed profiles"
  on public.profile for select to authenticated
  using (
    id in (select profile_id from public.profile_claim where user_id = (select auth.uid()))
  );

comment on table public.profile_claim is
  'Many-to-many between auth.users and profile. Decouples user→data linkage from profile.creator_id ownership so multiple users (e.g. agency + creator) can attach to the same canonical scrape target without duplicating the profile row.';
