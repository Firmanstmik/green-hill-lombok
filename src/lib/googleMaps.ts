/**
 * Optional Google Maps for an opportunity.
 * A pasted Maps link is preferred. Coordinates already stored on the record
 * are enough on their own. With neither, the page shows only the place name.
 */
export function isGoogleMapsLink(value: string): boolean {
  const url = value.trim();
  return /^https:\/\/((www|maps)\.)?google\.[a-z.]+\/maps([/?#]|$)/i.test(url)
    || /^https:\/\/maps\.app\.goo\.gl\//i.test(url)
    || /^https:\/\/goo\.gl\/maps\//i.test(url);
}

function pointOf(latitude?: number, longitude?: number): string {
  if (latitude == null || longitude == null) return '';
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return '';
  if (latitude === 0 && longitude === 0) return '';
  return `${latitude},${longitude}`;
}

function pointInLink(url: string): string {
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return `${at[1]},${at[2]}`;
  try {
    const query = new URL(url).searchParams.get('q') || '';
    if (/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(query)) return query;
  } catch {
    // A short link has no coordinates to read.
  }
  return '';
}

export function googleMapsView(input: {
  url?: string;
  latitude?: number;
  longitude?: number;
}): { href: string; embed: string } | null {
  const link = input.url && isGoogleMapsLink(input.url) ? input.url.trim() : '';
  const query = pointInLink(link) || pointOf(input.latitude, input.longitude);
  if (!link && !query) return null;
  const href = link || `https://www.google.com/maps?q=${query}`;
  const embedQuery = query || link;
  return {
    href,
    embed: `https://maps.google.com/maps?q=${encodeURIComponent(embedQuery)}&z=14&output=embed`,
  };
}
