import type { Property } from '@/data/mockData';

/**
 * Deterministic homepage curation.
 * Prefer this explicit Green Hill demo set when present;
 * otherwise featured-first fill (never random).
 */
export const HOMEPAGE_CURATED_IDS = ['gh-1', 'gh-2', 'gh-4', 'gh-3'] as const;

export const HOMEPAGE_CURATED_COUNT = 4;

export function selectCuratedOpportunities(
  properties: Property[],
  count = HOMEPAGE_CURATED_COUNT,
): Property[] {
  if (!properties.length || count <= 0) return [];

  const byId = new Map(properties.map((p) => [String(p.id), p]));
  const explicit = HOMEPAGE_CURATED_IDS.map((id) => byId.get(id)).filter(
    (p): p is Property => Boolean(p),
  );

  if (explicit.length >= Math.min(3, count)) {
    return explicit.slice(0, count);
  }

  const featured = properties.filter((p) => Boolean((p as Property & { is_featured?: boolean }).featured));
  if (featured.length >= count) {
    return featured.slice(0, count);
  }

  const featuredIds = new Set(featured.map((p) => String(p.id)));
  const rest = properties.filter((p) => !featuredIds.has(String(p.id)));
  return [...featured, ...rest].slice(0, count);
}

export function opportunityLandSize(property: Property): string | null {
  if (property.surfaceArea) return property.surfaceArea;
  const m2 = Number(property.sqft);
  if (Number.isFinite(m2) && m2 > 0) {
    return `${m2.toLocaleString('en-US')} m²`;
  }
  return null;
}

export function opportunityImage(property: Property): string {
  return (
    property.image ||
    (property as Property & { image_url?: string }).image_url ||
    ''
  );
}
