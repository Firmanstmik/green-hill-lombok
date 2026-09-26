-- Green Hill: trigger functions are not API endpoints.
--
-- Found by the Supabase security advisor on the production project: these
-- SECURITY DEFINER trigger functions were executable over /rest/v1/rpc by
-- anon and authenticated (Postgres grants EXECUTE to PUBLIC by default).
-- Triggers keep firing without it; nobody needs to call them directly.
-- Intentionally public functions stay executable: submit_enquiry(),
-- private_teaser(), private_teasers(), private_opportunity_count(), is_admin().

REVOKE ALL ON FUNCTION public.log_enquiry_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_role_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_role_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
