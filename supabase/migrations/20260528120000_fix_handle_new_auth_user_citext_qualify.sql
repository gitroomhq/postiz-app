-- Fix: handle_new_auth_user runs with `SET search_path TO ''` (security default)
-- so the unqualified `citext` cast resolved against an empty namespace and
-- failed with "type citext does not exist". This broke every POST /auth/v1/signup
-- since 20260528000001_admin_email_table.sql landed. Schema-qualify the cast to
-- public.citext.
--
-- Root cause: defense-in-depth `set search_path to ''` (Supabase best practice)
-- requires EVERY identifier in the function body to be schema-qualified — types
-- as well as tables. The original migration qualified the tables but not the
-- type cast.
--
-- Applied live against project wmesjldkqvbzrcpitclu on 2026-05-28 via Supabase
-- MCP after the production deploy's first signup attempt surfaced the error.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_is_admin boolean;
  v_role text;
begin
  select exists (
    select 1 from public.admin_email where email = new.email::public.citext
  ) into v_is_admin;

  v_role := case when v_is_admin then 'admin' else 'creator' end;

  insert into public.user_role (user_id, role) values (new.id, v_role);
  insert into public.creator_link (user_id) values (new.id);

  return new;
end;
$function$;
