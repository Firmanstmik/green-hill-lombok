-- Green Hill Admin CMS
-- One authenticated role: admin (user_profiles.role = 'admin', checked by public.is_admin()).
-- Public visitors may read published public opportunities and submit enquiries. Nothing else.
--
-- To make an account an admin (run once, in the SQL editor, as the project owner):
--   INSERT INTO public.user_profiles (id, role) VALUES ('<auth user uuid>', 'admin')
--   ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- ============================================================
-- 1. OPPORTUNITY COLUMNS
-- ============================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS why_green_hill TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS development_status TEXT,
  -- Source price. `price` (legacy, EUR) is written as a derived reference only.
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS price_currency TEXT NOT NULL DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS price_on_request BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS image_alt JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS brochure_url TEXT,
  ADD COLUMN IF NOT EXISTS masterplan_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Legacy vocabulary → Green Hill vocabulary
UPDATE public.properties SET status = 'available' WHERE status = 'active';
UPDATE public.properties SET status = 'reserved' WHERE status = 'under_offer';

-- Legacy prices were stored in EUR. Keep them as the source, labelled as EUR.
UPDATE public.properties
  SET price_amount = price, price_currency = 'EUR'
  WHERE price_amount IS NULL AND price IS NOT NULL AND price > 0;

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check
  CHECK (status IN ('draft', 'available', 'reserved', 'sold', 'archived'));

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_visibility_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_visibility_check
  CHECK (visibility IN ('public', 'private'));

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_price_currency_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_price_currency_check
  CHECK (price_currency IN ('IDR', 'USD', 'GBP', 'EUR'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug_unique
  ON public.properties (slug) WHERE slug IS NOT NULL AND slug <> '';
CREATE INDEX IF NOT EXISTS idx_properties_status_visibility
  ON public.properties (status, visibility);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_properties_touch ON public.properties;
CREATE TRIGGER trg_properties_touch
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 2. OPPORTUNITY ACCESS
-- Replaces the inherited "anyone reads everything, any user writes own rows".
-- ============================================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON public.properties;
DROP POLICY IF EXISTS "Owners can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Public reads published public opportunities" ON public.properties;
DROP POLICY IF EXISTS "Admin reads all opportunities" ON public.properties;
DROP POLICY IF EXISTS "Admin inserts opportunities" ON public.properties;
DROP POLICY IF EXISTS "Admin updates opportunities" ON public.properties;
DROP POLICY IF EXISTS "Admin deletes draft opportunities" ON public.properties;

CREATE POLICY "Public reads published public opportunities"
  ON public.properties FOR SELECT
  USING (visibility = 'public' AND status IN ('available', 'reserved', 'sold'));

CREATE POLICY "Admin reads all opportunities"
  ON public.properties FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin inserts opportunities"
  ON public.properties FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin updates opportunities"
  ON public.properties FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Archive is the normal lifecycle. Hard delete is limited to drafts.
CREATE POLICY "Admin deletes draft opportunities"
  ON public.properties FOR DELETE
  USING (public.is_admin() AND status = 'draft');

-- Private opportunities are never sent to the browser. The public Private
-- page only needs to know whether any exist.
CREATE OR REPLACE FUNCTION public.private_opportunity_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.properties
  WHERE visibility = 'private' AND status IN ('available', 'reserved');
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.private_opportunity_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 3. ENQUIRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 254),
  whatsapp TEXT CHECK (whatsapp IS NULL OR char_length(whatsapp) <= 40),
  country TEXT CHECK (country IS NULL OR char_length(country) <= 80),
  enquiry_type TEXT CHECK (enquiry_type IS NULL OR char_length(enquiry_type) <= 60),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 4000),
  source TEXT NOT NULL DEFAULT 'general'
    CHECK (source IN ('private', 'opportunity', 'general', 'manual')),
  opportunity_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  opportunity_title TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'viewing', 'negotiating', 'completed', 'closed')),
  CONSTRAINT enquiries_contact_present CHECK (email IS NOT NULL OR whatsapp IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries (status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON public.enquiries (created_at DESC);

CREATE TABLE IF NOT EXISTS public.enquiry_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('created', 'status', 'note')),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 4000),
  from_status TEXT,
  to_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_enquiry_activity_enquiry
  ON public.enquiry_activity (enquiry_id, created_at);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages enquiries" ON public.enquiries;
CREATE POLICY "Admin manages enquiries"
  ON public.enquiries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manages enquiry activity" ON public.enquiry_activity;
CREATE POLICY "Admin manages enquiry activity"
  ON public.enquiry_activity FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_enquiries_touch ON public.enquiries;
CREATE TRIGGER trg_enquiries_touch
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.log_enquiry_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.enquiry_activity (enquiry_id, kind, to_status, created_by)
    VALUES (NEW.id, 'created', NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.enquiry_activity (enquiry_id, kind, from_status, to_status, created_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enquiries_activity ON public.enquiries;
CREATE TRIGGER trg_enquiries_activity
  AFTER INSERT OR UPDATE OF status ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.log_enquiry_activity();

-- Public submission: insert-only, validated, lightly rate limited.
-- Visitors can never read enquiries back.
CREATE OR REPLACE FUNCTION public.submit_enquiry(
  p_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_country TEXT,
  p_enquiry_type TEXT,
  p_message TEXT,
  p_source TEXT,
  p_opportunity_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_name TEXT := NULLIF(btrim(p_name), '');
  v_email TEXT := NULLIF(lower(btrim(p_email)), '');
  v_whatsapp TEXT := NULLIF(btrim(p_whatsapp), '');
  v_source TEXT := COALESCE(NULLIF(p_source, ''), 'general');
  v_title TEXT;
  v_id UUID;
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF v_email IS NULL AND v_whatsapp IS NULL THEN
    RAISE EXCEPTION 'Email or WhatsApp is required';
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Email is not valid';
  END IF;
  IF v_source NOT IN ('private', 'opportunity', 'general') THEN
    v_source := 'general';
  END IF;

  IF (
    SELECT COUNT(*) FROM public.enquiries
    WHERE created_at > now() - INTERVAL '1 hour'
      AND ((v_email IS NOT NULL AND email = v_email)
        OR (v_whatsapp IS NOT NULL AND whatsapp = v_whatsapp))
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many enquiries, please try again later';
  END IF;

  IF p_opportunity_id IS NOT NULL THEN
    SELECT title INTO v_title FROM public.properties
    WHERE id = p_opportunity_id AND visibility = 'public'
      AND status IN ('available', 'reserved', 'sold');
  END IF;

  INSERT INTO public.enquiries (
    name, email, whatsapp, country, enquiry_type, message, source,
    opportunity_id, opportunity_title
  ) VALUES (
    left(v_name, 160), left(v_email, 254), left(v_whatsapp, 40),
    left(NULLIF(btrim(p_country), ''), 80), left(NULLIF(btrim(p_enquiry_type), ''), 60),
    left(NULLIF(btrim(p_message), ''), 4000), v_source,
    CASE WHEN v_title IS NULL THEN NULL ELSE p_opportunity_id END, v_title
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.submit_enquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_enquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

-- ============================================================
-- 4. MEDIA
-- Two buckets:
--   opportunity-media  PRIVATE. Every upload lands here: photographs under
--                      images/, brochures and masterplans under documents/.
--                      Only the admin can read (signed URLs) or write.
--   property-images    PUBLIC. Holds copies of the photographs of public,
--                      live opportunities only. The admin copies them in on
--                      publish and deletes them on unpublish / archive /
--                      move to private. Anyone can fetch a file by its
--                      public URL (that is what a public bucket is), but
--                      nobody except the admin can list, upload or delete.
-- Documents are never copied to the public bucket.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('opportunity-media', 'opportunity-media', false, 26214400,
        ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-images', 'property-images', true, 26214400,
        ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- An earlier draft of this migration created a public documents bucket.
-- If it exists, make it private; nothing uses it any more.
UPDATE storage.buckets SET public = false WHERE id = 'opportunity-documents';

DROP POLICY IF EXISTS "Public reads opportunity media" ON storage.objects;
DROP POLICY IF EXISTS "Admin reads opportunity media" ON storage.objects;
CREATE POLICY "Admin reads opportunity media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('opportunity-media', 'property-images') AND public.is_admin());

DROP POLICY IF EXISTS "Admin uploads opportunity media" ON storage.objects;
CREATE POLICY "Admin uploads opportunity media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('opportunity-media', 'property-images') AND public.is_admin());

DROP POLICY IF EXISTS "Admin updates opportunity media" ON storage.objects;
CREATE POLICY "Admin updates opportunity media"
  ON storage.objects FOR UPDATE
  USING (bucket_id IN ('opportunity-media', 'property-images') AND public.is_admin())
  WITH CHECK (bucket_id IN ('opportunity-media', 'property-images') AND public.is_admin());

DROP POLICY IF EXISTS "Admin deletes opportunity media" ON storage.objects;
CREATE POLICY "Admin deletes opportunity media"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('opportunity-media', 'property-images') AND public.is_admin());

-- Database guard: a record that is not public AND live may never point at
-- the public bucket (the admin must have moved it back to private media
-- first), and a public live record may never carry a private reference.
-- NOT VALID: applies to every new write without failing on inherited rows.
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_media_matches_visibility;
ALTER TABLE public.properties ADD CONSTRAINT properties_media_matches_visibility CHECK (
  CASE
    WHEN visibility = 'public' AND status IN ('available', 'reserved', 'sold') THEN
      COALESCE(images::text, '') NOT LIKE '%private-media:%'
      AND COALESCE(image_url, '') NOT LIKE 'private-media:%'
      AND COALESCE(og_image, '') NOT LIKE 'private-media:%'
    ELSE
      COALESCE(images::text, '') NOT LIKE '%/storage/v1/object/public/property-images/%'
      AND COALESCE(image_url, '') NOT LIKE '%/storage/v1/object/public/property-images/%'
      AND COALESCE(og_image, '') NOT LIKE '%/storage/v1/object/public/property-images/%'
  END
) NOT VALID;

-- ============================================================
-- 5. ROLE PROTECTION ON INSERT
-- The inherited trigger only guarded UPDATE. A signed-up user must never be
-- able to create their own profile row with role = 'admin'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_role_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS NOT NULL AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_user_role_insert ON public.user_profiles;
CREATE TRIGGER protect_user_role_insert
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_role_on_insert();

-- ============================================================
-- 6. HARDEN INHERITED ANALYTICS FUNCTIONS
-- ============================================================
ALTER FUNCTION public.increment_property_views(UUID) SET search_path = public;
ALTER FUNCTION public.increment_property_inquiries(UUID) SET search_path = public;

-- ============================================================
-- 7. CLOSE INHERITED SIDE DOORS INTO OPPORTUNITIES
-- RLS on `properties` is bypassed by SECURITY DEFINER functions. The inherited
-- marketplace messaging RPCs read `properties` directly, so any signed-in
-- account could open a "conversation" on a draft or private opportunity and
-- read back its title, image and address (and learn that the id exists).
-- Messaging is retired in Green Hill, so these RPCs are no longer callable
-- from the browser. The functions are kept, not dropped, so history is intact.
-- ============================================================

-- is_admin() is SECURITY DEFINER: pin its search_path.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.send_first_message(uuid, text)',
    'public.get_conversations_for_user()',
    'public.get_messages_for_conversation(uuid)',
    'public.mark_conversation_as_read(uuid)',
    'public.increment_property_views(uuid)',
    'public.increment_property_inquiries(uuid)',
    -- Retired seller / partner workflows (SECURITY DEFINER, unused by Green Hill).
    'public.get_seller_profile_for_property(uuid)',
    'public.get_seller_profiles_admin()',
    'public.review_partnership_application(uuid, text)',
    'public.get_partnership_applications_admin()'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    END IF;
  END LOOP;
END
$$;

-- Inherited seller profile uploads: any signed-in account could write files
-- into a public bucket. There are no sellers in Green Hill.
DROP POLICY IF EXISTS "Owner upload seller profile images" ON storage.objects;
DROP POLICY IF EXISTS "Owner update seller profile images" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete seller profile images" ON storage.objects;

-- Inherited per-listing counters were world-readable by opportunity id.
DO $$
BEGIN
  IF to_regclass('public.listing_analytics') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow public read" ON public.listing_analytics;
    DROP POLICY IF EXISTS "Admin reads listing analytics" ON public.listing_analytics;
    CREATE POLICY "Admin reads listing analytics"
      ON public.listing_analytics FOR SELECT
      USING (public.is_admin());
  END IF;
END
$$;
