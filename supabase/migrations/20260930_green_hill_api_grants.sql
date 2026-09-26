-- Green Hill: explicit table privileges for the Data API.
--
-- Newer Supabase projects no longer grant table access to `anon` and
-- `authenticated` by default (found on the production project: only
-- TRUNCATE/REFERENCES/TRIGGER). Without explicit grants the website could not
-- read published opportunities, content or notes, and the admin could not
-- save anything. These grants make the privileges independent of project
-- defaults. Row level security still decides WHICH rows each role sees:
--   visitors: published public opportunities, published content and notes
--   the admin (is_admin()): everything below
--   any other signed-in account: the same as a visitor, plus its own profile
-- Enquiries from visitors arrive only through submit_enquiry() (SECURITY
-- DEFINER); visitors get no privilege on enquiry tables.

REVOKE ALL ON
  public.properties, public.enquiries, public.enquiry_activity, public.notes,
  public.site_content, public.user_profiles, public.poi_cache
FROM anon, authenticated;

GRANT SELECT ON public.properties, public.notes, public.site_content TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.properties, public.notes, public.site_content,
  public.enquiries, public.enquiry_activity, public.poi_cache
TO authenticated;

GRANT SELECT ON public.user_profiles TO authenticated;

-- The nearby-places cache (admin Location step) had row level security off.
-- Only the admin uses it.
ALTER TABLE public.poi_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manages the nearby places cache" ON public.poi_cache;
CREATE POLICY "Admin manages the nearby places cache" ON public.poi_cache
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
GRANT USAGE, SELECT ON SEQUENCE public.poi_cache_id_seq TO authenticated;

-- SECURITY DEFINER functions must not depend on the caller's search_path.
ALTER FUNCTION public.protect_role_column() SET search_path = public;
