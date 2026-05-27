-- D3 Creator v1 core schema
-- Plan-wins-over-spec: 5 tables, no agency/scrape_log/user_*
-- Applied via Supabase MCP on 2026-05-27 to project wmesjldkqvbzrcpitclu.

-- 1. client (agency client)
create table public.client (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

-- 2. creator (influencer)
create table public.creator (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.client(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 3. profile (creator x platform)
create table public.profile (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator(id) on delete cascade,
  platform text not null check (platform in ('instagram','tiktok','facebook','rednote','douyin')),
  profile_url text not null,
  handle text,
  display_name text,
  nickname text,
  scrape_status text not null default 'pending' check (scrape_status in ('pending','ok','failed','private','not_found','throttled','handle_changed')),
  last_scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. profile_snapshot (daily time-series)
create table public.profile_snapshot (
  id bigserial primary key,
  profile_id uuid not null references public.profile(id) on delete cascade,
  captured_at timestamptz not null default now(),
  captured_date date not null default current_date,
  followers bigint,
  following bigint,
  total_posts bigint,
  total_views bigint,
  total_likes bigint,
  raw jsonb
);

-- 5. post_snapshot (per-post per-day)
create table public.post_snapshot (
  id bigserial primary key,
  profile_id uuid not null references public.profile(id) on delete cascade,
  external_post_id text not null,
  captured_at timestamptz not null default now(),
  captured_date date not null default current_date,
  posted_at timestamptz,
  caption_excerpt text,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  media_url text,
  content_type text,
  raw jsonb
);

-- Indexes
create index creator_client_idx on public.creator (client_id);
create index profile_creator_platform_idx on public.profile (creator_id, platform);
create index profile_snapshot_profile_time_idx on public.profile_snapshot (profile_id, captured_at desc);
create index post_snapshot_profile_time_idx on public.post_snapshot (profile_id, captured_at desc);
create unique index profile_snapshot_unique_day on public.profile_snapshot (profile_id, captured_date);
create unique index post_snapshot_unique_day on public.post_snapshot (profile_id, external_post_id, captured_date);

-- updated_at trigger for profile
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profile_updated_at before update on public.profile
  for each row execute function public.set_updated_at();

-- RLS: public read (D3 is public showcase); writes service_role only
alter table public.client enable row level security;
alter table public.creator enable row level security;
alter table public.profile enable row level security;
alter table public.profile_snapshot enable row level security;
alter table public.post_snapshot enable row level security;

create policy "public read client"           on public.client           for select to anon, authenticated using (true);
create policy "public read creator"          on public.creator          for select to anon, authenticated using (true);
create policy "public read profile"          on public.profile          for select to anon, authenticated using (true);
create policy "public read profile_snapshot" on public.profile_snapshot for select to anon, authenticated using (true);
create policy "public read post_snapshot"    on public.post_snapshot    for select to anon, authenticated using (true);
