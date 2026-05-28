-- D3 Creator — auth schema (2026-05-28)
-- Adds two tables on top of the v1 core:
--   user_role(user_id, role)                 → maps each auth user to admin|creator
--   creator_link(user_id, creator_id, ...)   → creator-role users' connected URLs + creator binding
--
-- Admin bootstrap is via the ADMIN_EMAILS database setting (comma-separated).
-- Set it once with:
--   alter database postgres set "app.admin_emails" = 'admin@example.com,owner@example.com';
-- New signups whose email matches get role='admin'; everyone else gets role='creator'.

-- 1. user_role
create table public.user_role (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'creator' check (role in ('admin', 'creator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_role_updated_at before update on public.user_role
  for each row execute function public.set_updated_at();

-- 2. creator_link
create table public.creator_link (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creator_id uuid references public.creator(id) on delete set null,
  dashboard_url text,
  leaderboard_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creator_link_creator_idx on public.creator_link (creator_id);

create trigger creator_link_updated_at before update on public.creator_link
  for each row execute function public.set_updated_at();

-- 3. signup trigger — assign role + create empty creator_link row.
-- security definer + empty search_path is mandatory for triggers on auth.users.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_emails text;
  v_role text := 'creator';
begin
  v_admin_emails := coalesce(current_setting('app.admin_emails', true), '');
  if v_admin_emails <> '' and position(lower(new.email) in lower(v_admin_emails)) > 0 then
    v_role := 'admin';
  end if;

  insert into public.user_role (user_id, role) values (new.id, v_role);
  insert into public.creator_link (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 4. RLS — users see/edit only their own rows; admins see all.
alter table public.user_role enable row level security;
alter table public.creator_link enable row level security;

-- helper: is_admin() based on the calling user's row in user_role
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_role
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create policy "user reads own role"
  on public.user_role for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "admin reads all roles"
  on public.user_role for select to authenticated
  using (public.is_admin());

create policy "user reads own creator_link"
  on public.creator_link for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user updates own creator_link"
  on public.creator_link for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "admin reads all creator_links"
  on public.creator_link for select to authenticated
  using (public.is_admin());

-- 5. Tighten existing tables: keep public reads (D3 is public showcase), no writes for non-service-role.
-- (Existing migration already created select policies; no insert/update/delete policies = denied by default.)
-- We also let admins manage everything.
create policy "admin manages client"           on public.client           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages creator"          on public.creator          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages profile"          on public.profile          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages profile_snapshot" on public.profile_snapshot for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages post_snapshot"    on public.post_snapshot    for all to authenticated using (public.is_admin()) with check (public.is_admin());
