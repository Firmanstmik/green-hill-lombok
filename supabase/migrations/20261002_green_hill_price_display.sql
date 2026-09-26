-- Green Hill: how a price is shown (brief §17).
--
-- "Investment value can be POA, 'from USD X', a range, or fully disclosed
-- depending on the deal." POA is price_on_request; fully disclosed is
-- 'exact'. This adds 'from' and 'range'. The source price stays exactly as
-- entered (price_amount + price_currency); price_amount_max is the top of a
-- range, in the same currency. Nothing converts or overwrites either value.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS price_display TEXT NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS price_amount_max NUMERIC;

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_price_display_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_price_display_check CHECK (
    price_display IN ('exact', 'from', 'range')
    AND (price_amount_max IS NULL OR price_amount_max > 0)
    AND (
      price_display <> 'range'
      OR price_on_request
      OR (price_amount IS NOT NULL AND price_amount_max IS NOT NULL AND price_amount_max >= price_amount)
    )
  );

-- Teasers carry the display form only when Reece shows the price.
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
    'price_display', CASE WHEN show_price THEN p.price_display ELSE 'exact' END,
    'price_amount_max', CASE WHEN show_price THEN p.price_amount_max END,
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
