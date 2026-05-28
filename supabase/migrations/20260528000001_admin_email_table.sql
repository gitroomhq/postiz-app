-- Replace the Postgres-setting based admin bootstrap with a real table.
-- Supabase blocks ALTER DATABASE for the pooler user, so we keep the
-- allowlist as a row set instead. Add an admin with:
--   insert into public.admin_email (email, note) values ('a@b.com', 'why');

create extension if not exists citext;

create table public.admin_email (
  email citext primary key,
  added_at timestamptz not null default now(),
  note text
);

alter table public.admin_email enable row level security;
create policy "admin reads admin_email" on public.admin_email
  for select to authenticated using (public.is_admin());
create policy "admin writes admin_email" on public.admin_email
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Replace the trigger to consult the table.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_role text;
begin
  select exists (
    select 1 from public.admin_email where email = new.email::citext
  ) into v_is_admin;

  v_role := case when v_is_admin then 'admin' else 'creator' end;

  insert into public.user_role (user_id, role) values (new.id, v_role);
  insert into public.creator_link (user_id) values (new.id);

  return new;
end;
$$;

-- Seed the first admin manually after applying this migration. Do NOT
-- commit personal addresses here — pre-migration seeds end up in every
-- clone of the repo. To add yourself:
--
--   insert into public.admin_email (email, note)
--   values ('you@yourdomain.com', 'project owner')
--   on conflict (email) do nothing;
--
-- Existing users created before this migration won't be auto-promoted by
-- the trigger (the trigger only runs at signup). Promote them manually:
--
--   update public.user_role
--   set role = 'admin'
--   where user_id = (select id from auth.users where email = 'you@yourdomain.com');
