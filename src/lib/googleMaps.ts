/**
 * Optional Google Maps for an opportunity.
 * A pasted Maps link is preferred. Coordinates already stored on the record
 * are enough on their own. With neither, the page shows only the place name.
 *
 * The embed never receives a raw Maps URL as its search. That query opens
 * the world map and Google's "custom content could not be displayed" banner.
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

function pair(value: string): string {
  const match = value.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return '';
  return pointOf(Number(match[1]), Number(match[2]));
}

function pointInLink(url: string): string {
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return pointOf(Number(at[1]), Number(at[2]));
  const data = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (data) return pointOf(Number(data[1]), Number(data[2]));
  try {
    const params = new URL(url).searchParams;
    for (const key of ['ll', 'center', 'q', 'query']) {
      const found = pair(params.get(key) || '');
      if (found) return found;
    }
  } catch {
    // A short link has no coordinates to read.
  }
  return '';
}

function searchPlace(place: string): string {
  const cleaned = place
    .replace(/[—–-]\s*sample location/gi, '')
    .replace(/\bsample location\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return /indonesia/i.test(cleaned) ? cleaned : `${cleaned}, Indonesia`;
}

function textInLink(url: string): string {
  try {
    const params = new URL(url).searchParams;
    const query = (params.get('q') || params.get('query') || '').trim();
    if (!query || /^https?:/i.test(query) || pair(query)) return '';
    return query.slice(0, 120);
  } catch {
    return '';
  }
}

export function googleMapsView(input: {
  url?: string;
  latitude?: number;
  longitude?: number;
  place?: string;
}): { href: string; embed: string; centered: boolean } | null {
  const link = input.url && isGoogleMapsLink(input.url) ? input.url.trim() : '';
  const point = pointInLink(link) || pointOf(input.latitude, input.longitude);
  const place = textInLink(link) || searchPlace(input.place || '');
  if (!link && !point && !place) return null;

  const href = link || (point
    ? `https://www.google.com/maps?q=${point}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`);

  // The plain embed is the one that actually draws tiles. Hybrid (`t=h`) and a
  // bare `ll=` centre come back as an empty grey frame.
  const embed = point
    ? `https://maps.google.com/maps?q=${encodeURIComponent(point)}&z=14&output=embed`
    : place
      ? `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=12&output=embed`
      : '';

  if (!embed) return { href, embed: '', centered: false };
  return { href, embed, centered: Boolean(point) };
}
