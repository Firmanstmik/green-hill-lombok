-- Green Hill: visitors never receive internal opportunity columns.
--
-- Found in the acceptance audit on the production project: visitors had a
-- table-wide SELECT on properties, and row level security limits rows, not
-- columns. For a public, live opportunity a visitor could therefore read
-- verification_notes (Reece's "known facts and what still needs
-- verification"), the memorandum's storage path and internal account ids
-- through the API. The files themselves were never reachable (private bucket).
--
-- Visitors now get every column except the internal ones. RLS still decides
-- which rows they see (public + available/reserved/sold). The website selects
-- exactly these columns (PUBLIC_OPPORTUNITY_COLUMNS in
-- src/lib/publicOpportunities.ts); a test keeps both lists identical.
-- Internal, never sent to visitors: user_id, updated_by, verification_notes, memorandum_url.
-- The only signed-in accounts are admins (sign-ups are disabled and
-- user_profiles.role allows only 'admin'), so `authenticated` keeps full access.

REVOKE SELECT ON public.properties FROM anon;
GRANT SELECT (
  id, title, description, address, price, bedrooms, bathrooms, m2, status,
  property_type, surface_area, building_area, created_at, nearby_amenities,
  poi_fetched_at, poi_source, formatted_address, latitude, longitude, price_type,
  ownership, year_built, listing_code, featured, land_size, zoning, furnishing,
  stories, lease_years, video_url, images, image_url, published_at,
  last_modified_at, description_json, type, slug, visibility, summary,
  why_green_hill, region, area, development_status, price_amount, price_currency,
  price_on_request, features, image_alt, brochure_url, masterplan_url, seo_title,
  seo_description, og_image, canonical_url, archived_at, updated_at, road_access,
  utilities, developer_name, development_potential, private_teaser, disclosure,
  price_display, price_amount_max
) ON public.properties TO anon;
