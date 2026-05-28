-- Audit and reconcile admin role assignments.
--
-- Background: the FIRST migration (20260528000000) used substring matching in
-- handle_new_auth_user() to detect admin emails:
--   position(lower(new.email) in lower(v_admin_emails)) > 0
-- That meant signing up with e.g. "admin-impostor@example.com" against a
-- setting like "admin@d3.com" would promote the impostor to admin because
-- "admin" appears as a substring in the longer email.
--
-- The SECOND migration (20260528000001) replaced the trigger with exact
-- citext equality against public.admin_email, but did not retroactively
-- correct any existing user_role rows. Any user created in the gap between
-- the two migrations (or in a misconfigured environment) might still be
-- holding an admin role they shouldn't have.
--
-- This migration:
--   1. Demotes any user_role.role='admin' row whose corresponding auth user
--      email is NOT in public.admin_email.
--   2. Logs the demoted user IDs for audit. (raise notice — visible in
--      Supabase migration output.)
--
-- This is idempotent and safe to re-run.

do $$
declare
  v_demoted record;
begin
  for v_demoted in
    select ur.user_id, u.email
    from public.user_role ur
    join auth.users u on u.id = ur.user_id
    where ur.role = 'admin'
      and not exists (
        select 1 from public.admin_email ae where ae.email = u.email::citext
      )
  loop
    raise notice '[admin_audit] demoting user_id=% email=% (not in admin_email)',
      v_demoted.user_id, v_demoted.email;
    update public.user_role
    set role = 'creator', updated_at = now()
    where user_id = v_demoted.user_id;
  end loop;
end$$;
