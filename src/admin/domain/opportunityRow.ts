import type { JSONContent } from '@/lib/tiptap-utils';
import type { NearbyPOI } from '@/types/poi';
import {
  DISCLOSURE_KEYS,
  OPPORTUNITY_TYPES,
  STATUS_LABEL,
  emptyOpportunity,
  formatArea,
  publicLocationLine,
  type Disclosure,
  type Opportunity,
  type OpportunityCurrency,
  type OpportunityStatus,
  type OpportunityType,
} from './opportunity';

/**
 * Mapping between the admin model and the `properties` row.
 *
 * The public memo (PropertyDetail, OpportunityCard, archive filters) was built
 * against legacy column names. Rather than redesign those pages, the admin
 * writes the new source columns *and* the compatibility columns they read:
 *   type / property_type, address, m2 + surface_area (land), building_area,
 *   ownership (tenure), features (Status, Type, Zoning, Development status,
 *   Lease term), image_url, price (derived EUR reference, display only).
 * Source values (price_amount/price_currency, land_size, …) are never
 * overwritten by derived ones.
 */

export type Row = Record<string, unknown>;

const LENS_TYPE: Partial<Record<OpportunityType, string>> = {
  Land: 'Land',
  Villa: 'Villa',
  Development: 'Development',
  'Off-plan': 'Development',
};

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function positive(value: unknown): number | null {
  const n = num(value);
  return n != null && n > 0 ? n : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function areaFromLabel(value: unknown): number | null {
  const raw = text(value).replace(/[^\d.]/g, '');
  return positive(raw);
}

function asStatus(value: unknown): OpportunityStatus {
  const raw = text(value).toLowerCase();
  if (raw === 'active') return 'available';
  if (raw === 'under_offer') return 'reserved';
  if (raw === 'available' || raw === 'reserved' || raw === 'sold' || raw === 'archived' || raw === 'draft') return raw;
  return 'draft';
}

function asType(value: unknown): OpportunityType | '' {
  const raw = text(value).toLowerCase();
  const match = OPPORTUNITY_TYPES.find((type) => type.toLowerCase() === raw);
  return match ?? '';
}

function asCurrency(value: unknown): OpportunityCurrency {
  const raw = text(value).toUpperCase();
  return raw === 'USD' || raw === 'GBP' || raw === 'EUR' ? raw : 'IDR';
}

function stringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, v]) => typeof v === 'string') as [string, string][],
  );
}

function disclosureOf(value: unknown): Disclosure {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  return Object.fromEntries(DISCLOSURE_KEYS.filter((key) => source[key] === true).map((key) => [key, true]));
}

function features(o: Opportunity): Record<string, string> {
  const out: Record<string, string> = {};
  if (o.status !== 'draft' && o.status !== 'archived') out.Status = STATUS_LABEL[o.status];
  const lens = o.type ? LENS_TYPE[o.type] : undefined;
  if (lens) out.Type = lens;
  if (o.zoning) out.Zoning = o.zoning;
  if (o.developmentStatus) out['Development status'] = o.developmentStatus;
  if (o.leaseYears && o.leaseYears > 0 && o.tenure && o.tenure !== 'Freehold') out['Term remaining'] = `${o.leaseYears} years`;
  if (o.furnishing) out.Furnishing = o.furnishing;
  if (o.visibility === 'private') out.Private = 'true';
  return out;
}

export type DerivedValues = {
  /** Display/sort reference only, computed from today's rate. Null when no usable rate. */
  priceEUR: number | null;
};

export function toRow(o: Opportunity, derived: DerivedValues): Row {
  const images = o.images.slice(0, 8);
  const imageAlt = Object.fromEntries(
    images.filter((src) => o.imageAlt[src]?.trim()).map((src) => [src, o.imageAlt[src].trim()]),
  );
  const priceAmount = o.priceOnRequest ? null : o.priceAmount && o.priceAmount > 0 ? o.priceAmount : null;

  return {
    title: o.title.trim(),
    slug: o.slug.trim() || null,
    listing_code: o.reference.trim() || null,
    type: o.type || null,
    property_type: o.type || null,
    status: o.status,
    visibility: o.visibility,
    // A private record can never be featured on the public homepage.
    featured: o.featured && o.visibility === 'public',
    summary: o.summary.trim() || null,

    region: o.region.trim() || null,
    area: o.area.trim() || null,
    address: publicLocationLine(o) || null,
    formatted_address: o.address.trim() || null,
    latitude: o.latitude,
    longitude: o.longitude,
    nearby_amenities: o.nearbyAmenities,
    road_access: o.roadAccess.trim() || null,
    utilities: o.utilities.trim() || null,

    land_size: o.landSize,
    m2: o.landSize ?? 0,
    surface_area: formatArea(o.landSize) || null,
    building_area: formatArea(o.buildingArea) || null,
    bedrooms: o.bedrooms ?? 0,
    bathrooms: o.bathrooms ?? 0,
    ownership: o.tenure || null,
    lease_years: o.leaseYears,
    zoning: o.zoning || null,
    development_status: o.developmentStatus || null,
    stories: o.stories,
    year_built: o.yearBuilt.trim() || null,
    furnishing: o.furnishing || null,
    developer_name: o.developerName.trim() || null,
    features: features(o),

    // The memo prefers plain `description` over rich JSON; keep it empty so the
    // formatted description is what appears publicly.
    description: null,
    description_json: o.descriptionJson,
    why_green_hill: o.whyGreenHill.trim() || null,
    development_potential: o.developmentPotential.trim() || null,
    verification_notes: o.verificationNotes.trim() || null,

    images,
    image_url: images[0] ?? null,
    image_alt: imageAlt,
    video_url: o.videoUrl.trim() || null,
    brochure_url: o.brochureUrl.trim() || null,
    masterplan_url: o.masterplanUrl.trim() || null,
    memorandum_url: o.memorandumUrl.trim() || null,

    // A teaser only exists for a private record.
    private_teaser: o.visibility === 'private' && o.privateTeaser,
    disclosure: disclosureOf(o.disclosure),

    price_on_request: o.priceOnRequest,
    price_amount: priceAmount,
    price_currency: o.priceCurrency,
    price_display: o.priceOnRequest ? 'exact' : o.priceDisplay,
    price_amount_max: !o.priceOnRequest && o.priceDisplay === 'range' && o.priceAmountMax && o.priceAmountMax > 0 ? o.priceAmountMax : null,
    price: priceAmount == null ? 0 : derived.priceEUR != null ? Math.round(derived.priceEUR) : 0,
    price_type: 'sale',

    seo_title: o.seoTitle.trim() || null,
    seo_description: o.seoDescription.trim() || null,
    og_image: o.ogImage.trim() || null,
    canonical_url: o.canonicalUrl.trim() || null,

    published_at: o.publishedAt,
    archived_at: o.archivedAt,
  };
}

export function fromRow(row: Row): Opportunity {
  const base = emptyOpportunity();
  const images = Array.isArray(row.images)
    ? [...new Set((row.images as unknown[]).map(text).filter(Boolean))].slice(0, 8)
    : [];
  const cover = text(row.image_url);
  const legacyFeatures = stringMap(row.features);
  const priceAmount = positive(row.price_amount);
  const legacyPrice = positive(row.price);
  const onRequest =
    row.price_on_request === true || (row.price_on_request == null && priceAmount == null && legacyPrice == null);

  return {
    ...base,
    id: text(row.id) || null,
    reference: text(row.listing_code),
    slug: text(row.slug),
    title: text(row.title),
    type: asType(row.type) || asType(row.property_type),
    status: asStatus(row.status),
    visibility: text(row.visibility) === 'private' ? 'private' : 'public',
    featured: Boolean(row.featured),
    summary: text(row.summary),

    region: text(row.region),
    area: text(row.area),
    address: text(row.formatted_address) || (row.region || row.area ? '' : text(row.address)),
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    nearbyAmenities: Array.isArray(row.nearby_amenities) ? (row.nearby_amenities as NearbyPOI[]) : [],
    roadAccess: text(row.road_access),
    utilities: text(row.utilities),

    landSize: positive(row.land_size) ?? areaFromLabel(row.surface_area),
    buildingArea: areaFromLabel(row.building_area),
    bedrooms: positive(row.bedrooms),
    bathrooms: positive(row.bathrooms),
    tenure: text(row.ownership),
    leaseYears: positive(row.lease_years),
    zoning: text(row.zoning),
    developmentStatus: text(row.development_status),
    stories: positive(row.stories),
    yearBuilt: text(row.year_built),
    furnishing: text(row.furnishing) || legacyFeatures.Furnishing || '',
    developerName: text(row.developer_name),

    descriptionJson: (row.description_json as JSONContent | null) ?? null,
    whyGreenHill: text(row.why_green_hill),
    developmentPotential: text(row.development_potential),
    verificationNotes: text(row.verification_notes),

    images: images.length > 0 ? images : cover ? [cover] : [],
    imageAlt: stringMap(row.image_alt),
    videoUrl: text(row.video_url),
    brochureUrl: text(row.brochure_url),
    masterplanUrl: text(row.masterplan_url),
    memorandumUrl: text(row.memorandum_url),
    privateTeaser: row.private_teaser === true,
    disclosure: disclosureOf(row.disclosure),

    priceOnRequest: onRequest,
    priceAmount: priceAmount ?? legacyPrice,
    priceCurrency: priceAmount != null ? asCurrency(row.price_currency) : legacyPrice != null ? 'EUR' : asCurrency(row.price_currency),
    priceDisplay: row.price_display === 'from' || row.price_display === 'range' ? row.price_display : 'exact',
    priceAmountMax: positive(row.price_amount_max),

    seoTitle: text(row.seo_title),
    seoDescription: text(row.seo_description),
    ogImage: text(row.og_image),
    canonicalUrl: text(row.canonical_url),

    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
    publishedAt: text(row.published_at) || null,
    archivedAt: text(row.archived_at) || null,
  };
}
