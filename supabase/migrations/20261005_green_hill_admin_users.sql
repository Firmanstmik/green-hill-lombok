-- Green Hill: Users & Admins.
--
-- No new tables or columns. The one role stays `user_profiles.role = 'admin'`,
-- decided by public.is_admin(). Browsers still cannot write user_profiles
-- directly; admins manage profiles and access only through the functions
-- below, each of which checks is_admin() first. Auth accounts themselves are
-- created by the `admin-users` Edge Function through the Supabase Admin API,
-- never with SQL, and passwords are never stored or returned here.

-- ============================================================
-- 1. Green Hill always keeps at least one admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.keep_one_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM 'admin') THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE role = 'admin' AND id <> OLD.id) THEN
      RAISE EXCEPTION 'gh:last_admin' USING DETAIL = 'Green Hill needs at least one admin.';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.keep_one_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS keep_one_admin ON public.user_profiles;
CREATE TRIGGER keep_one_admin
  BEFORE UPDATE OF role OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.keep_one_admin();

-- ============================================================
-- 2. List the people who can (or could) sign in
-- Returns only what the Users & Admins page shows: never passwords,
-- tokens or other Auth internals.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  preferred_language TEXT,
  is_admin BOOLEAN,
  is_self BOOLEAN,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ
) AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'gh:not_admin' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id,
           u.email::TEXT,
           p.full_name,
           COALESCE(p.preferred_language, 'en'),
           COALESCE(p.role = 'admin', FALSE),
           u.id = auth.uid(),
           u.created_at,
           u.last_sign_in_at,
           u.email_confirmed_at,
           u.invited_at
      FROM auth.users u
      LEFT JOIN public.user_profiles p ON p.id = u.id
     WHERE u.deleted_at IS NULL
     ORDER BY COALESCE(p.role = 'admin', FALSE) DESC, u.created_at;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. Look an account up by email (used by the admin-users Edge Function
-- before inviting, so an existing account is never duplicated)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_find_user(p_email TEXT)
RETURNS TABLE (id UUID, is_admin BOOLEAN) AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'gh:not_admin' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, COALESCE(p.role = 'admin', FALSE)
      FROM auth.users u
      LEFT JOIN public.user_profiles p ON p.id = u.id
     WHERE lower(u.email) = lower(trim(p_email)) AND u.deleted_at IS NULL
     LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Edit a profile (creates the profile row if it is missing)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_save_profile(p_id UUID, p_full_name TEXT, p_preferred_language TEXT)
RETURNS VOID AS $$
DECLARE
  clean_name TEXT := NULLIF(trim(COALESCE(p_full_name, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'gh:not_admin' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = p_id) THEN
    RAISE EXCEPTION 'gh:no_user';
  END IF;
  IF COALESCE(p_preferred_language, '') NOT IN ('en', 'id', 'nl', 'es') THEN
    RAISE EXCEPTION 'gh:bad_language';
  END IF;
  IF length(COALESCE(clean_name, '')) > 120 THEN
    RAISE EXCEPTION 'gh:name_too_long';
  END IF;

  INSERT INTO public.user_profiles (id, full_name, preferred_language)
  VALUES (p_id, clean_name, p_preferred_language)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        preferred_language = EXCLUDED.preferred_language,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. Give or remove admin access
-- Nobody removes their own access (another admin can), and the
-- keep_one_admin trigger guarantees at least one admin remains.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_access(p_id UUID, p_enabled BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'gh:not_admin' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = p_id) THEN
    RAISE EXCEPTION 'gh:no_user';
  END IF;
  IF NOT p_enabled AND p_id = auth.uid() THEN
    RAISE EXCEPTION 'gh:self_access';
  END IF;

  INSERT INTO public.user_profiles (id, role)
  VALUES (p_id, CASE WHEN p_enabled THEN 'admin' END)
  ON CONFLICT (id) DO UPDATE
    SET role = CASE WHEN p_enabled THEN 'admin' END,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 6. Only signed-in accounts can call them (each checks is_admin())
-- ============================================================
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_find_user(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_profile(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_access(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_find_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_access(UUID, BOOLEAN) TO authenticated;
