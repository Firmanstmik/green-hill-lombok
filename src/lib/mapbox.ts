/**
 * Mapbox Geocoding Service Layer
 * Handles address geocoding, reverse geocoding, and location validation
 * with caching, debouncing, and error handling
 */

export interface GeocodingResult {
  address: string;           // Short form (e.g., "123 Main St")
  formattedAddress: string;  // Full address from Mapbox
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  countryCode?: string;      // ISO country code (e.g., "NL", "BE", "US")
  placeType: string;        // 'address', 'place', 'region', etc.
}

interface MapboxGeocodeResponse {
  features: Array<{
    id: string;
    text: string;
    place_name: string;
    place_type: string[];
    center: [number, number];
    context?: Array<{
      id: string;
      text: string;
      short_code?: string;
    }>;
    geometry?: {
      type: string;
      coordinates: [number, number];
    };
  }>;
}

// Cache for geocoding results (5-minute TTL)
const geocodeCache = new Map<string, {
  result: GeocodingResult[];
  timestamp: number;
}>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// World bounds for coordinate validation
const WORLD_BOUNDS = {
  minLat: -90,
  maxLat: 90,
  minLng: -180,
  maxLng: 180,
};

/**
 * Geocode an address string to coordinates using Mapbox Geocoding API
 * Results are cached for 5 minutes to reduce API usage
 */
export async function geocodeAddress(
  address: string,
  options?: {
    proximity?: [number, number];
    country?: string;
    limit?: number;
  }
): Promise<GeocodingResult[]> {
  if (!address || address.length < 3) {
    return [];
  }

  // Check cache first
  const cacheKey = address.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  try {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      throw new Error('Mapbox token not configured');
    }

    // Build Mapbox Geocoding API URL
    const params = new URLSearchParams({
      access_token: token,
      limit: (options?.limit || 8).toString(),
      autocomplete: 'true',
      language: 'en',
      // Include all result types: addresses, POIs, places, localities, neighborhoods
      types: 'address,poi,place,locality,neighborhood',
    });

    // Add country constraint if provided in options
    if (options?.country) {
      params.append('country', options.country);
    }

    // Add proximity bias if provided
    if (options?.proximity) {
      params.append('proximity', options.proximity.join(','));
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      }
      if (response.status === 401) {
        throw new Error('Map service authentication failed');
      }
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxGeocodeResponse = await response.json();

    // Transform Mapbox response to our format
    const results = data.features
      .slice(0, 5)
      .map((feature) => ({
        address: feature.text,
        formattedAddress: feature.place_name,
        latitude: feature.geometry?.coordinates[1] || feature.center[1],
        longitude: feature.geometry?.coordinates[0] || feature.center[0],
        city: extractCity(feature),
        country: extractCountry(feature),
        countryCode: extractCountryCode(feature),
        placeType: feature.place_type[0] || 'place',
      }));

    // Cache the result
    geocodeCache.set(cacheKey, { result: results, timestamp: Date.now() });

    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Geocoding error:', message);
    throw new Error(`Could not search addresses: ${message}`);
  }
}

/**
 * Reverse geocode coordinates to address using Mapbox Geocoding API
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    if (!isValidCoordinates(latitude, longitude)) {
      return null;
    }

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      throw new Error('Mapbox token not configured');
    }

    const params = new URLSearchParams({
      access_token: token,
      limit: '1',
    });

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxGeocodeResponse = await response.json();

    if (data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    return {
      address: feature.text,
      formattedAddress: feature.place_name,
      latitude: feature.geometry?.coordinates[1] || feature.center[1],
      longitude: feature.geometry?.coordinates[0] || feature.center[0],
      city: extractCity(feature),
      country: extractCountry(feature),
      countryCode: extractCountryCode(feature),
      placeType: feature.place_type[0] || 'place',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reverse geocoding error:', message);
    return null;
  }
}

/**
 * Validate that coordinates are within world bounds
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    latitude >= WORLD_BOUNDS.minLat &&
    latitude <= WORLD_BOUNDS.maxLat &&
    longitude >= WORLD_BOUNDS.minLng &&
    longitude <= WORLD_BOUNDS.maxLng
  );
}

/**
 * Extract city name from Mapbox feature context
 */
function extractCity(feature: MapboxGeocodeResponse['features'][0]): string | undefined {
  if (!feature.context) return undefined;

  const place = feature.context.find((ctx) =>
    ctx.id.startsWith('place.')
  );
  return place?.text;
}

/**
 * Extract country name from Mapbox feature context
 */
function extractCountry(feature: MapboxGeocodeResponse['features'][0]): string | undefined {
  if (!feature.context) return undefined;

  const country = feature.context.find((ctx) =>
    ctx.id.startsWith('country.')
  );
  return country?.text;
}

/**
 * Extract country code from Mapbox feature context
 */
function extractCountryCode(feature: MapboxGeocodeResponse['features'][0]): string | undefined {
  if (!feature.context) return undefined;

  const country = feature.context.find((ctx) =>
    ctx.id.startsWith('country.')
  );
  return country?.short_code?.toUpperCase();
}

/**
 * Clear geocoding cache (useful for testing or manual refresh)
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: geocodeCache.size,
    entries: Array.from(geocodeCache.keys()),
  };
}
