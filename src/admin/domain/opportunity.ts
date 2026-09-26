import type { JSONContent } from '@/lib/tiptap-utils';
import type { NearbyPOI } from '@/types/poi';
import { isPrivateRef } from './media';

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const OPPORTUNITY_STATUSES = ['draft', 'available', 'reserved', 'sold', 'archived'] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

/** Statuses that are "live" (published). Visibility decides who sees them. */
export const LIVE_STATUSES: OpportunityStatus[] = ['available', 'reserved', 'sold'];

export const STATUS_LABEL: Record<OpportunityStatus, string> = {
  draft: 'Draft',
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  archived: 'Archived',
};

export type Visibility = 'public' | 'private';

export const OPPORTUNITY_TYPES = ['Land', 'Villa', 'Development', 'Off-plan', 'Private Investment'] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

/** Empty string always means "Not specified". Nothing is ever defaulted to a claim. */
export const TENURES = ['Freehold', 'Leasehold', 'HGB', 'Hak Pakai', 'Other'] as const;
export const TERM_TENURES = ['Leasehold', 'HGB', 'Hak Pakai'];
export const ZONINGS = ['Residential', 'Tourism', 'Commercial', 'Mixed use', 'Agricultural', 'Other'] as const;
export const DEVELOPMENT_STATUSES = [
  'Undeveloped land',
  'Planning',
  'Permits in progress',
  'Under construction',
  'Completed',
  'Operating',
] as const;
export const FURNISHINGS = ['Unfurnished', 'Part furnished', 'Furnished'] as const;
export const REGION_SUGGESTIONS = [
  'South Lombok',
  'Central Lombok',
  'West Lombok',
  'North Lombok',
  'East Lombok',
  'Gili Islands',
];

export const PRICE_CURRENCIES = ['IDR', 'USD', 'GBP'] as const;
export type OpportunityCurrency = (typeof PRICE_CURRENCIES)[number] | 'EUR';

export const MAX_IMAGES = 8;

/**
 * What a Green Hill Private teaser shows publicly (brief §18). Everything is
 * hidden until Reece switches it on. For a public opportunity only
 * `brochure` and `masterplan` apply: whether the document is offered on the memo.
 */
export const DISCLOSURE_KEYS = ['price', 'location', 'map', 'tenure', 'developer', 'masterplan', 'brochure'] as const;
export type DisclosureKey = (typeof DISCLOSURE_KEYS)[number];
export type Disclosure = Partial<Record<DisclosureKey, boolean>>;

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export interface Opportunity {
  id: string | null;
  reference: string;
  slug: string;
  title: string;
  type: OpportunityType | '';
  status: OpportunityStatus;
  visibility: Visibility;
  featured: boolean;
  summary: string;

  region: string;
  area: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  nearbyAmenities: NearbyPOI[];
  roadAccess: string;
  utilities: string;

  landSize: number | null;
  buildingArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  tenure: string;
  leaseYears: number | null;
  zoning: string;
  developmentStatus: string;
  stories: number | null;
  yearBuilt: string;
  furnishing: string;
  /** Seller or developer. Never public unless disclosed on a teaser. */
  developerName: string;

  descriptionJson: JSONContent | null;
  whyGreenHill: string;
  developmentPotential: string;
  /** Known facts vs still to verify. Admin only, never public. */
  verificationNotes: string;

  images: string[];
  imageAlt: Record<string, string>;
  videoUrl: string;
  brochureUrl: string;
  masterplanUrl: string;
  /** Investment Memorandum PDF, sent after qualification. Never public. */
  memorandumUrl: string;

  /** Private only: show a teaser page on Green Hill Private. */
  privateTeaser: boolean;
  disclosure: Disclosure;

  priceOnRequest: boolean;
  priceAmount: number | null;
  priceCurrency: OpportunityCurrency;

  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  canonicalUrl: string;

  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
}

export function emptyOpportunity(reference = ''): Opportunity {
  return {
    id: null,
    reference,
    slug: '',
    title: '',
    type: '',
    status: 'draft',
    visibility: 'public',
    featured: false,
    summary: '',
    region: '',
    area: '',
    address: '',
    latitude: null,
    longitude: null,
    nearbyAmenities: [],
    roadAccess: '',
    utilities: '',
    landSize: null,
    buildingArea: null,
    bedrooms: null,
    bathrooms: null,
    tenure: '',
    leaseYears: null,
    zoning: '',
    developmentStatus: '',
    stories: null,
    yearBuilt: '',
    furnishing: '',
    developerName: '',
    descriptionJson: null,
    whyGreenHill: '',
    developmentPotential: '',
    verificationNotes: '',
    images: [],
    imageAlt: {},
    videoUrl: '',
    brochureUrl: '',
    masterplanUrl: '',
    memorandumUrl: '',
    privateTeaser: false,
    disclosure: {},
    priceOnRequest: true,
    priceAmount: null,
    priceCurrency: 'IDR',
    seoTitle: '',
    seoDescription: '',
    ogImage: '',
    canonicalUrl: '',
    createdAt: null,
    updatedAt: null,
    publishedAt: null,
    archivedAt: null,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function isLive(status: OpportunityStatus): boolean {
  return LIVE_STATUSES.includes(status);
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const REFERENCE_PATTERN = /^GH-LOM-(\d+)$/i;

/** Next Green Hill reference, e.g. GH-LOM-007. */
export function nextReference(existing: string[]): string {
  const highest = existing.reduce((max, ref) => {
    const match = REFERENCE_PATTERN.exec(ref.trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `GH-LOM-${String(highest + 1).padStart(3, '0')}`;
}

/** The one-line place shown publicly: explicit address, otherwise "Area, Region". */
export function publicLocationLine(o: Pick<Opportunity, 'address' | 'area' | 'region'>): string {
  const explicit = o.address.trim();
  if (explicit) return explicit;
  return [o.area.trim(), o.region.trim()].filter(Boolean).join(', ');
}

export function formatArea(m2: number | null): string {
  return m2 && m2 > 0 ? `${Math.round(m2).toLocaleString('en-US')} m²` : '';
}

export function primaryImage(o: Pick<Opportunity, 'images'>): string {
  return o.images[0] || '';
}

/** A fresh draft copy. Nothing that identifies the original on the public site is carried over. */
export function duplicateOpportunity(source: Opportunity, reference: string): Opportunity {
  return {
    ...source,
    id: null,
    reference,
    slug: '',
    title: source.title ? `Copy of ${source.title}` : '',
    status: 'draft',
    featured: false,
    privateTeaser: false,
    createdAt: null,
    updatedAt: null,
    publishedAt: null,
    archivedAt: null,
  };
}

/* ------------------------------------------------------------------ */
/* Readiness                                                           */
/* ------------------------------------------------------------------ */

export type StepId = 'basics' | 'location' | 'specifications' | 'media' | 'story' | 'seo' | 'review';

export type Check = { id: string; label: string; done: boolean; step: StepId };

export function requiredChecks(o: Opportunity): Check[] {
  return [
    { id: 'title', label: 'Title', done: o.title.trim().length >= 3, step: 'basics' },
    { id: 'type', label: 'Opportunity type', done: Boolean(o.type), step: 'basics' },
    { id: 'summary', label: 'Summary', done: o.summary.trim().length >= 20, step: 'basics' },
    {
      id: 'price',
      label: 'Price or price on request',
      done: o.priceOnRequest || (o.priceAmount ?? 0) > 0,
      step: 'basics',
    },
    {
      id: 'location',
      label: 'Location',
      done: Boolean(o.area.trim() || o.region.trim() || o.address.trim()),
      step: 'location',
    },
    { id: 'image', label: 'Primary image', done: o.images.length > 0, step: 'media' },
  ];
}

export function optionalChecks(o: Opportunity): Check[] {
  const primary = primaryImage(o);
  return [
    { id: 'landSize', label: 'Land size', done: (o.landSize ?? 0) > 0, step: 'specifications' },
    { id: 'tenure', label: 'Tenure', done: Boolean(o.tenure), step: 'specifications' },
    { id: 'access', label: 'Road access', done: Boolean(o.roadAccess.trim()), step: 'location' },
    { id: 'utilities', label: 'Utilities', done: Boolean(o.utilities.trim()), step: 'location' },
    { id: 'gallery', label: 'Gallery (3 or more photographs)', done: o.images.length >= 3, step: 'media' },
    { id: 'alt', label: 'Primary image description', done: Boolean(primary && o.imageAlt[primary]?.trim()), step: 'media' },
    { id: 'description', label: 'Main description', done: hasRichText(o.descriptionJson), step: 'story' },
    { id: 'why', label: 'Why Green Hill likes it', done: o.whyGreenHill.trim().length > 0, step: 'story' },
    { id: 'seoDescription', label: 'SEO description', done: o.seoDescription.trim().length > 0, step: 'seo' },
    { id: 'video', label: 'Video', done: Boolean(o.videoUrl.trim()), step: 'media' },
    { id: 'brochure', label: 'Brochure', done: Boolean(o.brochureUrl.trim()), step: 'media' },
    { id: 'masterplan', label: 'Masterplan', done: Boolean(o.masterplanUrl.trim()), step: 'media' },
  ];
}

export function isReadyToPublish(o: Opportunity): boolean {
  return requiredChecks(o).every((check) => check.done);
}

export function hasRichText(json: JSONContent | null): boolean {
  if (!json) return false;
  const walk = (node: JSONContent): boolean =>
    (typeof node.text === 'string' && node.text.trim().length > 0) ||
    (Array.isArray(node.content) && node.content.some(walk));
  return walk(json);
}

/* ------------------------------------------------------------------ */
/* Save preparation                                                    */
/* ------------------------------------------------------------------ */

/** Lifecycle timestamps follow the status. Called on every save. */
export function withLifecycle(o: Opportunity): Opportunity {
  const now = new Date().toISOString();
  return {
    ...o,
    publishedAt: isLive(o.status) ? o.publishedAt ?? now : o.status === 'draft' ? null : o.publishedAt,
    archivedAt: o.status === 'archived' ? o.archivedAt ?? now : null,
    slug: o.slug.trim() || slugify(o.title),
  };
}

/** Field-level validation that must hold even for drafts (so saving never fails on the server). */
export function draftErrors(o: Opportunity): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (o.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.slug)) {
    errors.slug = 'Use lowercase letters, numbers and single hyphens only.';
  }
  if (o.latitude != null && (o.latitude < -90 || o.latitude > 90)) errors.latitude = 'Latitude must be between -90 and 90.';
  if (o.longitude != null && (o.longitude < -180 || o.longitude > 180)) errors.longitude = 'Longitude must be between -180 and 180.';
  for (const [key, value] of [
    ['videoUrl', o.videoUrl],
    ['brochureUrl', o.brochureUrl],
    ['masterplanUrl', o.masterplanUrl],
    ['memorandumUrl', o.memorandumUrl],
    ['canonicalUrl', o.canonicalUrl],
  ] as const) {
    if (value.trim() && !isPrivateRef(value) && !/^https?:\/\/\S+$/i.test(value.trim())) {
      errors[key] = 'Enter a full link starting with https://';
    }
  }
  if (!o.priceOnRequest && o.priceAmount != null && o.priceAmount < 0) errors.priceAmount = 'Price cannot be negative.';
  if (o.images.length > MAX_IMAGES) errors.images = `Maximum ${MAX_IMAGES} photographs.`;
  return errors;
}
