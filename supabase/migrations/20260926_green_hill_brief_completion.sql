-- Green Hill — brief completion (Phase 7)
-- Brief §6, §9, §17–§23: memo facts, investor qualification, Green Hill
-- Private teaser pages with disclosure controls, private Investment
-- Memorandum. Runs after 20260925_green_hill_cms.sql.

-- ============================================================
-- 1. OPPORTUNITY FIELDS
-- ============================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS road_access TEXT,
  ADD COLUMN IF NOT EXISTS utilities TEXT,
  ADD COLUMN IF NOT EXISTS developer_name TEXT,          -- never public unless disclosed
  ADD COLUMN IF NOT EXISTS development_potential TEXT,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,      -- admin only, never public
  ADD COLUMN IF NOT EXISTS memorandum_url TEXT,          -- admin only, never public
  -- A private opportunity may have a public teaser page on Green Hill Private.
  ADD COLUMN IF NOT EXISTS private_teaser BOOLEAN NOT NULL DEFAULT false,
  -- Per-opportunity disclosure switches (all hidden by default):
  -- price, location, map, masterplan, brochure, developer, tenure.
  -- For a public opportunity only brochure/masterplan apply ("show on memo").
  ADD COLUMN IF NOT EXISTS disclosure JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Is this record visible to visitors in any form?
CREATE OR REPLACE FUNCTION public.opportunity_exposed(p_visibility TEXT, p_status TEXT, p_teaser BOOLEAN)
RETURNS BOOLEAN AS $$
  SELECT p_status IN ('available', 'reserved', 'sold')
     AND (p_visibility = 'public' OR (p_visibility = 'private' AND COALESCE(p_teaser, false)));
$$ LANGUAGE sql IMMUTABLE SET search_path = public;

-- ============================================================
-- 2. PUBLIC DOCUMENTS BUCKET
-- Brochure/masterplan PDFs are copied here only while the opportunity is
-- exposed AND the document is disclosed. The memorandum never is.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('opportunity-files', 'opportunity-files', true, 26214400, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admin reads opportunity media" ON storage.objects;
CREATE POLICY "Admin reads opportunity media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files') AND public.is_admin());

DROP POLICY IF EXISTS "Admin uploads opportunity media" ON storage.objects;
CREATE POLICY "Admin uploads opportunity media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files') AND public.is_admin());

DROP POLICY IF EXISTS "Admin updates opportunity media" ON storage.objects;
CREATE POLICY "Admin updates opportunity media"
  ON storage.objects FOR UPDATE
  USING (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files') AND public.is_admin())
  WITH CHECK (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files') AND public.is_admin());

DROP POLICY IF EXISTS "Admin deletes opportunity media" ON storage.objects;
CREATE POLICY "Admin deletes opportunity media"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('opportunity-media', 'property-images', 'opportunity-files') AND public.is_admin());

-- ============================================================
-- 3. MEDIA GUARD (replaces the Phase 6I constraint)
-- Exposed records may not carry private references in visible media; hidden
-- records may not point at any public copy; the memorandum is never public;
-- a public document copy requires its disclosure switch.
-- ============================================================
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_media_matches_visibility;
ALTER TABLE public.properties ADD CONSTRAINT properties_media_matches_visibility CHECK (
  COALESCE(memorandum_url, '') NOT LIKE '%/storage/v1/object/public/%'
  AND CASE
    WHEN public.opportunity_exposed(visibility, status, private_teaser) THEN
      COALESCE(images::text, '') NOT LIKE '%private-media:%'
      AND COALESCE(image_url, '') NOT LIKE 'private-media:%'
      AND COALESCE(og_image, '') NOT LIKE 'private-media:%'
      AND (COALESCE(brochure_url, '') NOT LIKE '%/storage/v1/object/public/%'
           OR COALESCE((disclosure->>'brochure')::boolean, false))
      AND (COALESCE(masterplan_url, '') NOT LIKE '%/storage/v1/object/public/%'
           OR COALESCE((disclosure->>'masterplan')::boolean, false))
    ELSE
      COALESCE(images::text, '') NOT LIKE '%/storage/v1/object/public/%'
      AND COALESCE(image_url, '') NOT LIKE '%/storage/v1/object/public/%'
      AND COALESCE(og_image, '') NOT LIKE '%/storage/v1/object/public/%'
      AND COALESCE(brochure_url, '') NOT LIKE '%/storage/v1/object/public/%'
      AND COALESCE(masterplan_url, '') NOT LIKE '%/storage/v1/object/public/%'
  END
) NOT VALID;

-- ============================================================
-- 4. GREEN HILL PRIVATE TEASERS
-- Private rows stay unreadable through RLS. Visitors get only what Reece
-- disclosed, built here on the server. Hidden fields are never sent.
-- ============================================================
CREATE OR REPLACE FUNCTION public.teaser_json(p public.properties)
RETURNS JSONB AS $$
DECLARE
  d JSONB := COALESCE(p.disclosure, '{}'::jsonb);
  show_price BOOLEAN := COALESCE((d->>'price')::boolean, false);
  show_location BOOLEAN := COALESCE((d->>'location')::boolean, false);
  show_map BOOLEAN := show_location AND COALESCE((d->>'map')::boolean, false);
  show_tenure BOOLEAN := COALESCE((d->>'tenure')::boolean, false);
  feats JSONB := COALESCE(p.features, '{}'::jsonb) - 'Private';
BEGIN
  IF NOT show_tenure THEN
    feats := feats - 'Term remaining';
  END IF;
  RETURN jsonb_build_object(
    'id', p.id,
    'listing_code', p.listing_code,
    'slug', p.slug,
    'title', p.title,
    'type', p.type,
    'status', p.status,
    'visibility', 'private',
    'private_teaser', true,
    'summary', p.summary,
    'why_green_hill', p.why_green_hill,
    'description_json', p.description_json,
    'development_status', p.development_status,
    'development_potential', p.development_potential,
    'zoning', p.zoning,
    'road_access', CASE WHEN show_location THEN p.road_access END,
    'utilities', p.utilities,
    'land_size', p.land_size,
    'm2', p.m2,
    'surface_area', p.surface_area,
    'building_area', p.building_area,
    'features', feats,
    'region', p.region,
    'area', CASE WHEN show_location THEN p.area END,
    'address', CASE WHEN show_location THEN p.address ELSE COALESCE(NULLIF(p.region, ''), 'South Lombok') END,
    'latitude', CASE WHEN show_map THEN p.latitude END,
    'longitude', CASE WHEN show_map THEN p.longitude END,
    'nearby_amenities', CASE WHEN show_location THEN p.nearby_amenities ELSE '[]'::jsonb END,
    'ownership', CASE WHEN show_tenure THEN p.ownership END,
    'lease_years', CASE WHEN show_tenure THEN p.lease_years END,
    'developer_name', CASE WHEN COALESCE((d->>'developer')::boolean, false) THEN p.developer_name END,
    'price_on_request', CASE WHEN show_price THEN p.price_on_request ELSE true END,
    'price_amount', CASE WHEN show_price THEN p.price_amount END,
    'price_currency', CASE WHEN show_price THEN p.price_currency END,
    'price', CASE WHEN show_price THEN p.price ELSE 0 END,
    'brochure_url', CASE WHEN COALESCE((d->>'brochure')::boolean, false) THEN p.brochure_url END,
    'masterplan_url', CASE WHEN COALESCE((d->>'masterplan')::boolean, false) THEN p.masterplan_url END,
    'images', p.images,
    'image_url', p.image_url,
    'image_alt', p.image_alt,
    'video_url', p.video_url,
    'seo_title', p.seo_title,
    'seo_description', p.seo_description,
    'og_image', p.og_image,
    'published_at', p.published_at,
    'created_at', p.created_at
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.teaser_json(public.properties) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.private_teasers()
RETURNS SETOF JSONB AS $$
  SELECT public.teaser_json(p)
  FROM public.properties p
  WHERE p.visibility = 'private' AND p.private_teaser
    AND p.status IN ('available', 'reserved', 'sold')
  ORDER BY p.featured DESC, p.published_at DESC NULLS LAST;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.private_teaser(p_key TEXT)
RETURNS JSONB AS $$
  SELECT public.teaser_json(p)
  FROM public.properties p
  WHERE p.visibility = 'private' AND p.private_teaser
    AND p.status IN ('available', 'reserved', 'sold')
    AND (lower(p.listing_code) = lower(p_key) OR p.slug = p_key OR p.id::text = p_key)
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.private_teasers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.private_teaser(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.private_teasers() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.private_teaser(TEXT) TO anon, authenticated;

-- ============================================================
-- 5. INVESTOR QUALIFICATION (brief §9, §21)
-- ============================================================
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS company TEXT CHECK (company IS NULL OR char_length(company) <= 160),
  ADD COLUMN IF NOT EXISTS budget TEXT CHECK (budget IS NULL OR char_length(budget) <= 60),
  ADD COLUMN IF NOT EXISTS investor_type TEXT CHECK (investor_type IS NULL OR char_length(investor_type) <= 60),
  ADD COLUMN IF NOT EXISTS interests TEXT[] CHECK (interests IS NULL OR cardinality(interests) <= 12),
  ADD COLUMN IF NOT EXISTS objective TEXT CHECK (objective IS NULL OR char_length(objective) <= 60),
  ADD COLUMN IF NOT EXISTS timeframe TEXT CHECK (timeframe IS NULL OR char_length(timeframe) <= 60);

DROP FUNCTION IF EXISTS public.submit_enquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.submit_enquiry(
  p_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_country TEXT,
  p_enquiry_type TEXT,
  p_message TEXT,
  p_source TEXT,
  p_opportunity_id UUID,
  p_company TEXT DEFAULT NULL,
  p_budget TEXT DEFAULT NULL,
  p_investor_type TEXT DEFAULT NULL,
  p_interests TEXT[] DEFAULT NULL,
  p_objective TEXT DEFAULT NULL,
  p_timeframe TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_name TEXT := NULLIF(btrim(p_name), '');
  v_email TEXT := NULLIF(lower(btrim(p_email)), '');
  v_whatsapp TEXT := NULLIF(btrim(p_whatsapp), '');
  v_source TEXT := COALESCE(NULLIF(p_source, ''), 'general');
  v_interests TEXT[];
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

  -- Only an opportunity the visitor could actually see may be attached.
  IF p_opportunity_id IS NOT NULL THEN
    SELECT title INTO v_title FROM public.properties
    WHERE id = p_opportunity_id
      AND public.opportunity_exposed(visibility, status, private_teaser);
  END IF;

  SELECT array_agg(left(btrim(x), 60)) INTO v_interests
  FROM unnest(COALESCE(p_interests, '{}'::TEXT[])) AS x
  WHERE NULLIF(btrim(x), '') IS NOT NULL;
  IF cardinality(v_interests) > 12 THEN
    v_interests := v_interests[1:12];
  END IF;

  INSERT INTO public.enquiries (
    name, email, whatsapp, country, enquiry_type, message, source,
    opportunity_id, opportunity_title,
    company, budget, investor_type, interests, objective, timeframe
  ) VALUES (
    left(v_name, 160), left(v_email, 254), left(v_whatsapp, 40),
    left(NULLIF(btrim(p_country), ''), 80), left(NULLIF(btrim(p_enquiry_type), ''), 60),
    left(NULLIF(btrim(p_message), ''), 4000), v_source,
    CASE WHEN v_title IS NULL THEN NULL ELSE p_opportunity_id END, v_title,
    left(NULLIF(btrim(p_company), ''), 160), left(NULLIF(btrim(p_budget), ''), 60),
    left(NULLIF(btrim(p_investor_type), ''), 60), v_interests,
    left(NULLIF(btrim(p_objective), ''), 60), left(NULLIF(btrim(p_timeframe), ''), 60)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.submit_enquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_enquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) TO anon, authenticated;
