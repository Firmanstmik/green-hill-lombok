/**
 * GREEN HILL — local demo data for public pages.
 * Compatible with original PropertyCard / Services / Agents / Testimonials components.
 */

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
  priceType: 'sale' | 'rent';
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  status: 'rent' | 'sale' | 'investment';
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
  /** Legacy field — architecture compatibility */
  isUkonAgent: boolean;
}

export interface Agent {
  id: string;
  name: string;
  location: string;
  country: string;
  region: 'europe' | 'southeast-asia';
  photo: string;
  specialty: string;
  languages?: string;
  experience?: string;
}

export interface Testimonial {
  id: string;
  clientName: string;
  clientType: string;
  photo: string;
  review: string;
  rating: number;
  location?: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  author: string;
}

/** Curated Green Hill Lombok opportunities — demo examples (AI stills) */
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
    isUkonAgent: false,
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
    isUkonAgent: false,
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
    isUkonAgent: false,
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
    isUkonAgent: false,
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
    isUkonAgent: false,
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
    isUkonAgent: false,
  },
];

/** Green Hill focus areas — same 6-card services layout */
export const services: Service[] = [
  { id: '1', title: 'Land Opportunities', description: 'Carefully selected land parcels across Lombok’s most promising locations.', icon: 'Home' },
  { id: '2', title: 'Villa Opportunities', description: 'Private villa sites and residences suited to lifestyle and long-term holding.', icon: 'Users' },
  { id: '3', title: 'Development Plots', description: 'Larger holdings positioned for thoughtful residential or hospitality use.', icon: 'Key' },
  { id: '4', title: 'Investment Guidance', description: 'Clear, considered advice shaped around your criteria and timeline.', icon: 'TrendingUp' },
  { id: '5', title: 'Site Evaluation', description: 'Access, orientation, context and fit reviewed with local knowledge.', icon: 'BarChart' },
  { id: '6', title: 'Tailored Search', description: 'A focused process — not a marketplace — for the opportunities that matter.', icon: 'Settings' },
];

/** Placeholder advisors — not prior-project people */
export const agents: Agent[] = [
  { id: '1', name: 'Advisor Placeholder', location: 'Lombok, Indonesia', country: 'Indonesia', region: 'southeast-asia', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', specialty: 'Land & Investment', languages: 'English, Indonesian', experience: '—' },
  { id: '2', name: 'Advisor Placeholder', location: 'Lombok, Indonesia', country: 'Indonesia', region: 'southeast-asia', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80', specialty: 'Villa Opportunities', languages: 'English', experience: '—' },
  { id: '3', name: 'Advisor Placeholder', location: 'Lombok, Indonesia', country: 'Indonesia', region: 'southeast-asia', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80', specialty: 'Development', languages: 'English, Indonesian', experience: '—' },
  { id: '4', name: 'Advisor Placeholder', location: 'Lombok, Indonesia', country: 'Indonesia', region: 'southeast-asia', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80', specialty: 'Investor Relations', languages: 'English', experience: '—' },
  { id: '5', name: 'Advisor Placeholder', location: 'Lombok, Indonesia', country: 'Indonesia', region: 'southeast-asia', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80', specialty: 'Site Visits', languages: 'English, Indonesian', experience: '—' },
  { id: '6', name: 'Advisor Placeholder', location: 'Lombok, Indonesia', country: 'Indonesia', region: 'southeast-asia', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80', specialty: 'Local Coordination', languages: 'Indonesian, English', experience: '—' },
];

export const testimonials: Testimonial[] = [
  {
    id: '1',
    clientName: 'Demo Client',
    clientType: 'Investor',
    location: 'Lombok',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    review: '[Placeholder] Sample investor feedback for layout only. Not a real Green Hill client review.',
    rating: 5,
  },
  {
    id: '2',
    clientName: 'Demo Client',
    clientType: 'Buyer',
    location: 'Lombok',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    review: '[Placeholder] Sample feedback for layout only. Not a real Green Hill client review.',
    rating: 5,
  },
  {
    id: '3',
    clientName: 'Demo Client',
    clientType: 'Investor',
    location: 'Lombok',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    review: '[Placeholder] Sample feedback for layout only. Not a real Green Hill client review.',
    rating: 5,
  },
];

export const blogPosts: BlogPost[] = [];

export const stats = { projects: 0, clients: 0, value: 0 };

/** Contact CTA — placeholder until Green Hill channels are finalised */
export const contactInfo = {
  email: 'hello@greenhill.example',
  phone: '+44 7810 062383',
  address: 'Lombok, Indonesia',
};
