-- Green Hill: remove the inherited Ukon Estate marketplace schema.
--
-- Plan: docs/green-hill-database-cleanup-plan.md. Audited on the production
-- project before writing this migration: every table below is empty, nothing
-- in Green Hill references it (no foreign key into it, no view, no policy, no
-- Green Hill function or trigger), and no application code uses it.
--
-- No CASCADE anywhere: if an unexpected dependency existed, the migration
-- would stop instead of silently removing Green Hill objects.
-- Kept: properties, enquiries, enquiry_activity, notes, site_content,
-- user_profiles, poi_cache, and every Green Hill function and policy.

-- 1. Marketplace messaging (messages first: it references conversations).
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.conversations;

-- 2. Agent partnerships, seller and buyer accounts, notification settings.
DROP TABLE IF EXISTS public.partnership_applications;
DROP TABLE IF EXISTS public.seller_lead_settings;
DROP TABLE IF EXISTS public.seller_settings;
DROP TABLE IF EXISTS public.seller_profiles;
DROP TABLE IF EXISTS public.buyer_settings;
DROP TABLE IF EXISTS public.buyer_profiles;
DROP TABLE IF EXISTS public.user_notification_preferences;

-- 3. Per-listing "performance" counters (views/inquiries).
DROP TABLE IF EXISTS public.listing_analytics;

-- 4. Only present on some inherited databases.
DROP TABLE IF EXISTS public.saved_listings;
DROP TABLE IF EXISTS public.search_alerts;

-- 5. Functions that only served the tables above.
DROP FUNCTION IF EXISTS public.send_first_message(uuid, text);
DROP FUNCTION IF EXISTS public.get_conversations_for_user();
DROP FUNCTION IF EXISTS public.get_messages_for_conversation(uuid);
DROP FUNCTION IF EXISTS public.mark_conversation_as_read(uuid);
DROP FUNCTION IF EXISTS public.update_last_message_timestamp();
DROP FUNCTION IF EXISTS public.increment_property_views(uuid);
DROP FUNCTION IF EXISTS public.increment_property_inquiries(uuid);
DROP FUNCTION IF EXISTS public.get_seller_profile_for_property(uuid);
DROP FUNCTION IF EXISTS public.get_seller_profiles_admin();
DROP FUNCTION IF EXISTS public.review_partnership_application(uuid, text);
DROP FUNCTION IF EXISTS public.get_partnership_applications_admin();

-- 6. Seller avatar storage: the public-read policy goes here. The (empty)
--    bucket itself is removed through the Storage API, because Supabase
--    blocks direct deletes from storage tables.
DROP POLICY IF EXISTS "Public read seller profile images" ON storage.objects;

-- 7. One role only: admin. Fails (and stops the migration) if any profile
--    still carried a marketplace role; the audit found none.
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (role IS NULL OR role = 'admin');

-- 8. Marketplace/rental listing columns never written or read by Green Hill
--    (including ROI and rental income estimates, which Green Hill must never
--    show). Columns still read by the code (price_type, bedrooms, bathrooms,
--    stories, furnishing, property_type, user_id, …) stay.
ALTER TABLE public.properties
  DROP COLUMN IF EXISTS parking_spaces,
  DROP COLUMN IF EXISTS parking_type,
  DROP COLUMN IF EXISTS hoa_fees,
  DROP COLUMN IF EXISTS property_tax,
  DROP COLUMN IF EXISTS lot_size,
  DROP COLUMN IF EXISTS is_investment,
  DROP COLUMN IF EXISTS rental_income_estimate,
  DROP COLUMN IF EXISTS roi_percent,
  DROP COLUMN IF EXISTS last_renovated,
  DROP COLUMN IF EXISTS available_date,
  DROP COLUMN IF EXISTS interior_features,
  DROP COLUMN IF EXISTS appliances,
  DROP COLUMN IF EXISTS hvac_type,
  DROP COLUMN IF EXISTS outdoor_features,
  DROP COLUMN IF EXISTS community_amenities,
  DROP COLUMN IF EXISTS lifestyle_tags,
  DROP COLUMN IF EXISTS energy_rating,
  DROP COLUMN IF EXISTS virtual_tour_url;
