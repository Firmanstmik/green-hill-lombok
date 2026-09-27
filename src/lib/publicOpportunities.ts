import { supabasePublic } from './supabase';

/** Statuses a visitor may see. Drafts and archived records never leave the admin. */
export const PUBLIC_OPPORTUNITY_STATUSES = ['available', 'reserved', 'sold'] as const;

/**
 * Every public read of opportunities goes through here.
 * RLS already enforces the same rule; the explicit filter keeps a signed-in
 * admin browsing the public site from seeing drafts or private records.
 */
/**
 * Columns a visitor may read (the same list is granted to `anon` in
 * supabase/migrations/20261003_green_hill_hide_internal_columns.sql).
 * Internal columns are left out: verification_notes, memorandum_url,
 * user_id, updated_by. Adding a column to properties means deciding here.
 */
export const PUBLIC_OPPORTUNITY_COLUMNS = [
  'id', 'title', 'description', 'address', 'price', 'bedrooms', 'bathrooms', 'm2', 'status',
  'property_type', 'surface_area', 'building_area', 'created_at', 'nearby_amenities',
  'poi_fetched_at', 'poi_source', 'formatted_address', 'latitude', 'longitude', 'price_type',
  'ownership', 'year_built', 'listing_code', 'featured', 'land_size', 'zoning', 'furnishing',
  'stories', 'lease_years', 'video_url', 'images', 'image_url', 'published_at', 'last_modified_at',
  'description_json', 'type', 'slug', 'visibility', 'summary', 'why_green_hill', 'region', 'area',
  'development_status', 'price_amount', 'price_currency', 'price_on_request', 'features',
  'image_alt', 'brochure_url', 'masterplan_url', 'seo_title', 'seo_description', 'og_image',
  'canonical_url', 'archived_at', 'updated_at', 'road_access', 'utilities', 'developer_name',
  'development_potential', 'private_teaser', 'disclosure', 'price_display', 'price_amount_max',
] as const;

const PUBLIC_SELECT = PUBLIC_OPPORTUNITY_COLUMNS.join(',');

export function publicOpportunities() {
  return supabasePublic
    .from('properties')
    // Type-only cast: supabase-js cannot parse a list built at runtime; rows keep the same untyped shape as before.
    .select(PUBLIC_SELECT as '*')
    .eq('visibility', 'public')
    .in('status', [...PUBLIC_OPPORTUNITY_STATUSES]);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Memo URLs accept either the record id or its slug. */
export function publicOpportunityByKey(key: string) {
  const query = publicOpportunities();
  return UUID_PATTERN.test(key) ? query.eq('id', key) : query.eq('slug', key);
}

/** Count only. Private records themselves are never sent to the browser. */
export async function privateOpportunityCount(): Promise<number> {
  const { data, error } = await supabasePublic.rpc('private_opportunity_count');
  if (error || typeof data !== 'number') return 0;
  return data;
}
