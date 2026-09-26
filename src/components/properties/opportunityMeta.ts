import type { Property } from '@/data/mockData';

export type OpportunityLens = 'all' | 'land' | 'villa' | 'development' | 'private';

export function featureValue(property: Property, key: string): string {
  const features = property.features || {};
  const match = Object.entries(features).find(([k]) => k.toLowerCase() === key.toLowerCase());
  return match ? String(match[1] ?? '').trim() : '';
}

export function isPrivateOpportunity(property: Property): boolean {
  const record = property as Property & {
    isPrivate?: boolean;
    is_private?: boolean;
    visibility?: string;
  };
  if (record.isPrivate === true || record.is_private === true) return true;
  const feature = featureValue(property, 'Private').toLowerCase();
  if (feature === 'true' || feature === 'yes' || feature === 'private') return true;
  const type = featureValue(property, 'Type').toLowerCase();
  const visibility = String(record.visibility || '').toLowerCase();
  return type === 'private' || visibility === 'private';
}

/** Editorial category derived from existing fields. Never invents a type. */
export function opportunityLensOf(property: Property): Exclude<OpportunityLens, 'all'> | 'other' {
  if (isPrivateOpportunity(property)) return 'private';
  const feature = featureValue(property, 'Type').toLowerCase();
  const type = String(property.type || '').trim().toLowerCase();
  const title = String(property.title || '').toLowerCase();
  if (feature === 'development' || type.includes('develop') || title.includes('development')) {
    return 'development';
  }
  if (feature === 'villa' || type === 'villa' || type === 'house') return 'villa';
  if (
    feature === 'land' ||
    feature === 'investment' ||
    type === 'land' ||
    type === 'commercial'
  ) {
    return 'land';
  }
  return 'other';
}

export function lensesPresent(properties: Property[]): OpportunityLens[] {
  const found = new Set<OpportunityLens>();
  for (const property of properties) {
    const lens = opportunityLensOf(property);
    if (lens !== 'other') found.add(lens);
  }
  const order: OpportunityLens[] = ['land', 'villa', 'development', 'private'];
  return order.filter((lens) => found.has(lens));
}

export function landSizeM2(property: Property): number | null {
  if (property.surfaceArea) {
    const parsed = Number(String(property.surfaceArea).replace(/[^\d.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const m2 = Number(property.sqft);
  if (Number.isFinite(m2) && m2 > 0) return m2;
  return null;
}

export function landSizeLabel(property: Property): string | null {
  const m2 = landSizeM2(property);
  if (m2 == null) return null;
  // Large sites read in hectares first so their scale is clear (brief §19).
  if (m2 >= 10000) {
    const ha = (m2 / 10000).toLocaleString('en-US', { maximumFractionDigits: 2 });
    return `${ha} ha · ${Math.round(m2).toLocaleString('en-US')} m²`;
  }
  if (property.surfaceArea) return property.surfaceArea;
  return `${m2.toLocaleString('en-US')} m²`;
}

/** First photograph is the hero, on the memo and on the collection card. */
export function opportunityImage(property: Property): string {
  const record = property as Property & { image_url?: string };
  const ordered = Array.isArray(property.images)
    ? property.images.find((src) => typeof src === 'string' && src.trim())
    : '';
  return (ordered || '').trim() || property.image || record.image_url || '';
}

/** Map a stored status word to a translation key. Unknown values stay as written. */
export function statusTranslationKey(property: Property): string | null {
  const explicit = featureValue(property, 'Status');
  const raw = (explicit || String(property.status || property.priceType || '')).toLowerCase();
  if (!raw) return null;
  if (raw === 'available' || raw === 'sale' || raw === 'investment') {
    return 'properties.archive.statusAvailable';
  }
  if (raw === 'sold') return 'properties.archive.statusSold';
  if (raw === 'reserved') return 'properties.archive.statusReserved';
  if (raw === 'private') return 'properties.archive.privateLabel';
  return null;
}

export function rawStatus(property: Property): string {
  return featureValue(property, 'Status') || String(property.status || '');
}
