import { isSupabaseConfigured, supabase } from './supabase';
import { loadLocalStore } from '@/admin/data/localLoader';

/**
 * Green Hill Private teaser pages (brief §17–§18).
 * With a database, the server builds each teaser and leaves out everything
 * Reece has not disclosed (`private_teasers()` / `private_teaser(key)`).
 * Private rows themselves stay unreadable. Without a database (development
 * preview only) the local store applies the same rules.
 */
export type TeaserRow = Record<string, unknown>;

export async function fetchPrivateTeasers(): Promise<TeaserRow[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('private_teasers');
      if (error || !Array.isArray(data)) return [];
      return data as TeaserRow[];
    }
    if (loadLocalStore) {
      const { localPrivateTeasers } = await loadLocalStore();
      return localPrivateTeasers();
    }
  } catch {
    // A teaser list is never worth breaking the Private page for.
  }
  return [];
}

export async function fetchPrivateTeaser(key: string): Promise<TeaserRow | null> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('private_teaser', { p_key: key });
      return error || !data ? null : (data as TeaserRow);
    }
    if (loadLocalStore) {
      const { localPrivateTeaser } = await loadLocalStore();
      return localPrivateTeaser(key);
    }
  } catch {
    // Treated as not found.
  }
  return null;
}

/**
 * The disclosure rules, mirrored from `public.teaser_json` for the local
 * preview. Keep the two in step (tests cover both).
 */
export function teaserFromRow(p: Record<string, unknown>): TeaserRow {
  const d = (p.disclosure && typeof p.disclosure === 'object' ? p.disclosure : {}) as Record<string, unknown>;
  const on = (key: string) => d[key] === true;
  const showLocation = on('location');
  const showMap = showLocation && on('map');
  const showPrice = on('price');
  const showTenure = on('tenure');
  const features = { ...((p.features as Record<string, string>) ?? {}) };
  delete features.Private;
  if (!showTenure) delete features['Term remaining'];
  const region = typeof p.region === 'string' && p.region.trim() ? p.region : 'South Lombok';
  return {
    id: p.id,
    listing_code: p.listing_code,
    slug: p.slug,
    title: p.title,
    type: p.type,
    status: p.status,
    visibility: 'private',
    private_teaser: true,
    summary: p.summary,
    why_green_hill: p.why_green_hill,
    description_json: p.description_json,
    development_status: p.development_status,
    development_potential: p.development_potential,
    zoning: p.zoning,
    road_access: showLocation ? p.road_access : null,
    utilities: p.utilities,
    land_size: p.land_size,
    m2: p.m2,
    surface_area: p.surface_area,
    building_area: p.building_area,
    features,
    region: p.region,
    area: showLocation ? p.area : null,
    address: showLocation ? p.address : region,
    latitude: showMap ? p.latitude : null,
    longitude: showMap ? p.longitude : null,
    nearby_amenities: showLocation ? p.nearby_amenities : [],
    ownership: showTenure ? p.ownership : null,
    lease_years: showTenure ? p.lease_years : null,
    developer_name: on('developer') ? p.developer_name : null,
    price_on_request: showPrice ? p.price_on_request : true,
    price_amount: showPrice ? p.price_amount : null,
    price_currency: showPrice ? p.price_currency : null,
    price_display: showPrice ? p.price_display ?? 'exact' : 'exact',
    price_amount_max: showPrice ? p.price_amount_max ?? null : null,
    price: showPrice ? p.price : 0,
    brochure_url: on('brochure') ? p.brochure_url : null,
    masterplan_url: on('masterplan') ? p.masterplan_url : null,
    images: p.images,
    image_url: p.image_url,
    image_alt: p.image_alt,
    video_url: p.video_url,
    seo_title: p.seo_title,
    seo_description: p.seo_description,
    og_image: p.og_image,
    published_at: p.published_at,
    created_at: p.created_at,
  };
}
