import type { JSONContent } from '@/lib/tiptap-utils';

export type ListingType = 'sale' | 'rent';

export interface ListingAIPayload {
  propertyType?: string;
  listingType?: ListingType;
  title?: string;
  listingCode?: string;
  status?: string;
  location: {
    address?: string;
    formattedAddress?: string;
    countryCode?: string;
    latitude?: number | null;
    longitude?: number | null;
    nearbyAmenities?: Array<{
      name?: string;
      category?: string;
      distanceMeters?: number;
      latitude?: number;
      longitude?: number;
      source?: string;
    }>;
  };
  pricing: {
    currency?: string;
    askingPrice?: number | null;
    askingPriceRaw?: string;
    askingPriceEur?: number | null;
    priceType?: ListingType;
  };
  propertyDetails: {
    bedrooms?: number | null;
    bathrooms?: number | null;
    m2?: number | null;
    ownership?: string;
    yearBuilt?: string;
    parkingSpaces?: number | null;
    parkingType?: string;
    hoaFees?: number | null;
    propertyTax?: number | null;
    lotSize?: number | null;
    landSize?: number | null;
    zoning?: string;
    furnishing?: string;
    hvacType?: string;
    energyRating?: string;
    stories?: number | null;
    lastRenovated?: number | null;
    leaseYears?: number | null;
    availableDate?: string | null;
    isInvestment?: boolean;
    rentalIncomeEstimate?: number | null;
    roiPercent?: number | null;
    virtualTourUrl?: string;
    videoUrl?: string;
    featured?: boolean;
  };
  amenities: {
    interiorFeatures?: string[];
    appliances?: string[];
    outdoorFeatures?: string[];
    communityAmenities?: string[];
  };
  lifestyleTags?: string[];
  uploadedImages: {
    coverImageUrl?: string;
    images: Array<{
      url: string;
      order: number;
      isCover: boolean;
    }>;
  };
  existingContent?: {
    descriptionSummary?: string;
    descriptionJson?: JSONContent | null;
  };
}

export interface BuildListingAIPayloadOptions {
  currency?: string;
  askingPriceEur?: number | null;
}

export type ListingFormDataLike = {
  title?: string;
  listing_code?: string;
  status?: string;
  property_type?: string;
  price_type?: string;
  price?: string;
  address?: string;
  formatted_address?: string;
  countryCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: string;
  bathrooms?: string;
  m2?: string;
  ownership?: string;
  year_built?: string;
  parking_spaces?: string;
  parking_type?: string;
  hoa_fees?: string;
  property_tax?: string;
  lot_size?: string;
  land_size?: string;
  zoning?: string;
  furnishing?: string;
  hvac_type?: string;
  energy_rating?: string;
  stories?: string;
  last_renovated?: string;
  lease_years?: string;
  available_date?: string;
  is_investment?: boolean;
  rental_income_estimate?: string;
  roi_percent?: string;
  virtual_tour_url?: string;
  video_url?: string;
  featured?: boolean;
  interior_features?: string[];
  appliances?: string[];
  outdoor_features?: string[];
  community_amenities?: string[];
  lifestyle_tags?: string[];
  images?: string[];
  image_url?: string;
  description_summary?: string;
  description_json?: JSONContent | null;
  nearby_amenities?: unknown[];
  poi_source?: string;
};

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function asListingType(value: unknown): ListingType | undefined {
  if (value === 'sale' || value === 'rent') return value;
  return undefined;
}

function toPoiSummary(poi: any, source?: string): ListingAIPayload['location']['nearbyAmenities'][number] | null {
  if (!poi || typeof poi !== 'object') return null;

  const name = typeof poi.name === 'string' ? poi.name : undefined;
  const category =
    typeof poi.category === 'string'
      ? poi.category
      : typeof poi.type === 'string'
        ? poi.type
        : typeof poi.amenity === 'string'
          ? poi.amenity
          : undefined;

  const distanceMeters =
    typeof poi.distance === 'number'
      ? poi.distance
      : typeof poi.distance_m === 'number'
        ? poi.distance_m
        : typeof poi.distanceMeters === 'number'
          ? poi.distanceMeters
          : parseNumber(poi.distance);

  const latitude =
    typeof poi.latitude === 'number'
      ? poi.latitude
      : typeof poi.lat === 'number'
        ? poi.lat
        : parseNumber(poi.latitude);

  const longitude =
    typeof poi.longitude === 'number'
      ? poi.longitude
      : typeof poi.lng === 'number'
        ? poi.lng
        : typeof poi.lon === 'number'
          ? poi.lon
          : parseNumber(poi.longitude);

  if (!name && !category) return null;

  return { name, category, distanceMeters: distanceMeters ?? undefined, latitude: latitude ?? undefined, longitude: longitude ?? undefined, source };
}

export function buildListingAIPayload(
  formData: ListingFormDataLike,
  options: BuildListingAIPayloadOptions = {}
): ListingAIPayload {
  const images = Array.isArray(formData.images) ? formData.images : [];
  const cover = (formData.image_url || images[0] || '').trim() || undefined;

  const nearbyAmenitiesRaw = Array.isArray(formData.nearby_amenities) ? formData.nearby_amenities : [];
  const nearbyAmenities = nearbyAmenitiesRaw
    .map((p) => toPoiSummary(p as any, typeof formData.poi_source === 'string' ? formData.poi_source : undefined))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const listingType = asListingType(formData.price_type);

  return {
    propertyType: typeof formData.property_type === 'string' ? formData.property_type : undefined,
    listingType,
    title: typeof formData.title === 'string' ? formData.title : undefined,
    listingCode: typeof formData.listing_code === 'string' ? formData.listing_code : undefined,
    status: typeof formData.status === 'string' ? formData.status : undefined,
    location: {
      address: typeof formData.address === 'string' ? formData.address : undefined,
      formattedAddress: typeof formData.formatted_address === 'string' ? formData.formatted_address : undefined,
      countryCode: typeof formData.countryCode === 'string' ? formData.countryCode : undefined,
      latitude: typeof formData.latitude === 'number' ? formData.latitude : formData.latitude ?? null,
      longitude: typeof formData.longitude === 'number' ? formData.longitude : formData.longitude ?? null,
      nearbyAmenities: nearbyAmenities.length ? nearbyAmenities : undefined,
    },
    pricing: {
      currency: options.currency,
      askingPrice: parseNumber(formData.price),
      askingPriceRaw: typeof formData.price === 'string' ? formData.price : undefined,
      askingPriceEur: options.askingPriceEur ?? null,
      priceType: listingType,
    },
    propertyDetails: {
      bedrooms: parseNumber(formData.bedrooms),
      bathrooms: parseNumber(formData.bathrooms),
      m2: parseNumber(formData.m2),
      ownership: typeof formData.ownership === 'string' ? formData.ownership : undefined,
      yearBuilt: typeof formData.year_built === 'string' ? formData.year_built : undefined,
      parkingSpaces: parseNumber(formData.parking_spaces),
      parkingType: typeof formData.parking_type === 'string' ? formData.parking_type : undefined,
      hoaFees: parseNumber(formData.hoa_fees),
      propertyTax: parseNumber(formData.property_tax),
      lotSize: parseNumber(formData.lot_size),
      landSize: parseNumber(formData.land_size),
      zoning: typeof formData.zoning === 'string' ? formData.zoning : undefined,
      furnishing: typeof formData.furnishing === 'string' ? formData.furnishing : undefined,
      hvacType: typeof formData.hvac_type === 'string' ? formData.hvac_type : undefined,
      energyRating: typeof formData.energy_rating === 'string' ? formData.energy_rating : undefined,
      stories: parseNumber(formData.stories),
      lastRenovated: parseNumber(formData.last_renovated),
      leaseYears: parseNumber(formData.lease_years),
      availableDate: typeof formData.available_date === 'string' ? formData.available_date : null,
      isInvestment: typeof formData.is_investment === 'boolean' ? formData.is_investment : undefined,
      rentalIncomeEstimate: parseNumber(formData.rental_income_estimate),
      roiPercent: parseNumber(formData.roi_percent),
      virtualTourUrl: typeof formData.virtual_tour_url === 'string' ? formData.virtual_tour_url : undefined,
      videoUrl: typeof formData.video_url === 'string' ? formData.video_url : undefined,
      featured: typeof formData.featured === 'boolean' ? formData.featured : undefined,
    },
    amenities: {
      interiorFeatures: Array.isArray(formData.interior_features) ? formData.interior_features : undefined,
      appliances: Array.isArray(formData.appliances) ? formData.appliances : undefined,
      outdoorFeatures: Array.isArray(formData.outdoor_features) ? formData.outdoor_features : undefined,
      communityAmenities: Array.isArray(formData.community_amenities) ? formData.community_amenities : undefined,
    },
    lifestyleTags: Array.isArray(formData.lifestyle_tags) ? formData.lifestyle_tags : undefined,
    uploadedImages: {
      coverImageUrl: cover,
      images: images.map((url, index) => ({
        url,
        order: index,
        isCover: Boolean(cover && url === cover),
      })),
    },
    existingContent: {
      descriptionSummary: typeof formData.description_summary === 'string' ? formData.description_summary : undefined,
      descriptionJson: formData.description_json ?? null,
    },
  };
}

