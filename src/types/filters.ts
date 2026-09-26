export interface FilterState {
  country: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: 'any' | '1' | '2' | '3' | '4';
  /** Old `?pt=` links; the archive itself filters by `collection`. */
  propertyType: 'all' | 'Villa' | 'Land';
  collection: 'all' | 'land' | 'villa' | 'development' | 'private';
  bathrooms: 'any' | '1' | '2' | '3' | '4';
  minSize: string;
  maxSize: string;
}

export const DEFAULT_FILTERS: FilterState = {
  country: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  bedrooms: 'any',
  propertyType: 'all',
  collection: 'all',
  bathrooms: 'any',
  minSize: '',
  maxSize: '',
};
