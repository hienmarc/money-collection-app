-- Run from a trusted SQL client with database privileges to update profiles.is_admin.
-- Replace the UUID below with the target user's auth.users.id.
DO $grant_admin$
DECLARE
  target_user_id uuid := '00000000-0000-0000-0000-000000000000';
  make_admin boolean := true;
  rows_updated integer;
BEGIN
  IF NOT has_column_privilege(current_user, 'public.profiles', 'is_admin', 'UPDATE') THEN
    RAISE EXCEPTION 'Current database role cannot update public.profiles.is_admin';
  END IF;

  UPDATE public.profiles
  SET is_admin = make_admin
  WHERE id = target_user_id;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'No profile found for auth user UUID %', target_user_id;
  END IF;

  RAISE NOTICE 'Set is_admin=% for auth user %', make_admin, target_user_id;
END
$grant_admin$;
