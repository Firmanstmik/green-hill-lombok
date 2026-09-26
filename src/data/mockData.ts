/**
 * GREEN HILL — demo opportunities (not real inventory).
 *
 * Used to seed the development-only local admin preview, and shown on the
 * public site only through `demoOpportunities` below: never when a Green Hill
 * database is connected, and in a production build only when a demo build is
 * requested explicitly (VITE_DEMO_OPPORTUNITIES=true). A production build with
 * a real (even empty) database shows real records or an honest empty state.
 */
import { isSupabaseConfigured } from '@/lib/supabase';

import landCoastal from '@/assets/greenhill/land-coastal.jpg';
import villaPool from '@/assets/greenhill/villa-pool.jpg';
import landBeach from '@/assets/greenhill/land-beach.jpg';
import landHillside from '@/assets/greenhill/land-hillside.jpg';
import villaGarden from '@/assets/greenhill/villa-garden.jpg';
import landHolding from '@/assets/greenhill/land-holding.jpg';

export interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  priceType: 'sale';
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  status: 'sale' | 'investment';
  image: string;
  images: string[];
  featured: boolean;
  type: string;
  listingCode?: string;
  ownership?: string;
  yearBuilt?: string;
  surfaceArea?: string;
  buildingArea?: string;
  description?: string;
  features: Record<string, string>;
  nearbyAmenities?: {
    name: string;
    distance: string;
    type: 'school' | 'hospital' | 'shopping' | 'transport' | 'airport' | 'park';
  }[];
}

export const properties: Property[] = [
  {
    id: 'gh-1',
    title: 'South Lombok Coastal Land',
    address: 'Kuta Selatan, Lombok',
    price: 0,
    priceType: 'sale',
    bedrooms: 0,
    bathrooms: 0,
    sqft: 2450,
    status: 'investment',
    image: landCoastal,
    images: [landCoastal],
    featured: true,
    type: 'Land',
    listingCode: 'GH-LOM-001',
    surfaceArea: '2,450 m²',
    description: 'Elevated coastal land suited to a discreet villa compound.',
    features: { Type: 'Land', Status: 'Available' },
  },
  {
    id: 'gh-2',
    title: 'Private Villa Opportunity',
    address: 'Central Lombok',
    price: 0,
    priceType: 'sale',
    bedrooms: 3,
    bathrooms: 3,
    sqft: 680,
    status: 'sale',
    image: villaPool,
    images: [villaPool],
    featured: true,
    type: 'Villa',
    listingCode: 'GH-LOM-002',
    buildingArea: '680 m²',
    surfaceArea: '1,200 m²',
    description: 'A considered villa setting framed by agricultural landscape.',
    features: { Type: 'Villa', Status: 'Available' },
  },
  {
    id: 'gh-3',
    title: 'Near-Beach Development Plot',
    address: 'Northwest Lombok',
    price: 0,
    priceType: 'sale',
    bedrooms: 0,
    bathrooms: 0,
    sqft: 3800,
    status: 'investment',
    image: landBeach,
    images: [landBeach],
    featured: true,
    type: 'Land',
    listingCode: 'GH-LOM-003',
    surfaceArea: '3,800 m²',
    description: 'A larger holding positioned for thoughtful residential development.',
    features: { Type: 'Development', Status: 'Available' },
  },
  {
    id: 'gh-4',
    title: 'Hillside Land Parcel',
    address: 'South Lombok',
    price: 0,
    priceType: 'sale',
    bedrooms: 0,
    bathrooms: 0,
    sqft: 1800,
    status: 'investment',
    image: landHillside,
    images: [landHillside],
    featured: true,
    type: 'Land',
    listingCode: 'GH-LOM-004',
    surfaceArea: '1,800 m²',
    description: 'Quiet hillside parcel with long-term holding potential.',
    features: { Type: 'Land', Status: 'Available' },
  },
  {
    id: 'gh-5',
    title: 'Tropical Garden Villa Site',
    address: 'East Lombok',
    price: 0,
    priceType: 'sale',
    bedrooms: 4,
    bathrooms: 4,
    sqft: 920,
    status: 'sale',
    image: villaGarden,
    images: [villaGarden],
    featured: true,
    type: 'Villa',
    listingCode: 'GH-LOM-005',
    buildingArea: '920 m²',
    description: 'Garden-oriented villa opportunity with strong lifestyle appeal.',
    features: { Type: 'Villa', Status: 'Available' },
  },
  {
    id: 'gh-6',
    title: 'Investment Land Holding',
    address: 'West Lombok',
    price: 0,
    priceType: 'sale',
    bedrooms: 0,
    bathrooms: 0,
    sqft: 5200,
    status: 'investment',
    image: landHolding,
    images: [landHolding],
    featured: true,
    type: 'Land',
    listingCode: 'GH-LOM-006',
    surfaceArea: '5,200 m²',
    description: 'Larger land holding for investors seeking scale in Lombok.',
    features: { Type: 'Investment', Status: 'Available' },
  },
];

/** Whether the public site may show the demo opportunities above. */
// The build-time part comes first so a normal production build drops the demo data entirely.
export const DEMO_OPPORTUNITIES_ENABLED =
  (import.meta.env.DEV || import.meta.env.VITE_DEMO_OPPORTUNITIES === 'true') && !isSupabaseConfigured;

/** The demo set for the public site: empty unless DEMO_OPPORTUNITIES_ENABLED. */
export const demoOpportunities: Property[] = DEMO_OPPORTUNITIES_ENABLED ? properties : [];
