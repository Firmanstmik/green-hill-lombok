import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { FilterState } from '@/types/filters';
import { DEFAULT_FILTERS } from '@/types/filters';
import type { Property } from '@/data/mockData';

// Minimal debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export interface UseFiltersReturn {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  filteredProperties: Property[];
  activeFilterCount: number;
  isFiltered: boolean;
}

export function useFilters(allProperties: Property[]): UseFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const { currency, exchangeRates, convertToEUR } = useCurrency();

  // Debounced text fields (300ms delay)
  const debouncedLocation = useDebounce(filters.location, 300);
  const debouncedMinPrice = useDebounce(filters.minPrice, 300);
  const debouncedMaxPrice = useDebounce(filters.maxPrice, 300);
  const debouncedMinSize = useDebounce(filters.minSize, 300);
  const debouncedMaxSize = useDebounce(filters.maxSize, 300);

  // Initialize filters from URL params on mount only
  useEffect(() => {
    const fromURL: Partial<FilterState> = {};

    const tt = searchParams.get('tt');
    if (tt && ['all', 'sale', 'rent'].includes(tt)) {
      fromURL.transactionType = tt as FilterState['transactionType'];
    }

    const country = searchParams.get('country');
    if (country) fromURL.country = country;

    const loc = searchParams.get('loc');
    if (loc) fromURL.location = loc;

    const minP = searchParams.get('minP');
    if (minP) fromURL.minPrice = minP;

    const maxP = searchParams.get('maxP');
    if (maxP) fromURL.maxPrice = maxP;

    const bed = searchParams.get('bed');
    if (bed && ['any', '1', '2', '3', '4'].includes(bed)) {
      fromURL.bedrooms = bed as FilterState['bedrooms'];
    }

    const pt = searchParams.get('pt');
    if (pt && ['all', 'Villa', 'Apartment', 'Penthouse', 'Commercial', 'Land'].includes(pt)) {
      fromURL.propertyType = pt as FilterState['propertyType'];
    }

    const bath = searchParams.get('bath');
    if (bath && ['any', '1', '2', '3', '4'].includes(bath)) {
      fromURL.bathrooms = bath as FilterState['bathrooms'];
    }

    const minS = searchParams.get('minS');
    if (minS) fromURL.minSize = minS;

    const maxS = searchParams.get('maxS');
    if (maxS) fromURL.maxSize = maxS;

    const tags = searchParams.get('tags');
    if (tags) fromURL.lifestyle = tags.split(',').filter(Boolean);

    if (Object.keys(fromURL).length > 0) {
      setFilters((prev) => ({ ...prev, ...fromURL }));
    }
  }, []); // Only on mount

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.transactionType !== 'all') params.set('tt', filters.transactionType);
    if (filters.country) params.set('country', filters.country);
    if (filters.location) params.set('loc', filters.location);
    if (filters.minPrice) params.set('minP', filters.minPrice);
    if (filters.maxPrice) params.set('maxP', filters.maxPrice);
    if (filters.bedrooms !== 'any') params.set('bed', filters.bedrooms);
    if (filters.propertyType !== 'all') params.set('pt', filters.propertyType);
    if (filters.bathrooms !== 'any') params.set('bath', filters.bathrooms);
    if (filters.minSize) params.set('minS', filters.minSize);
    if (filters.maxSize) params.set('maxS', filters.maxSize);
    if (filters.lifestyle.length > 0) params.set('tags', filters.lifestyle.join(','));

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Convert price string from currency to EUR
  const toEUR = useCallback(
    (priceStr: string): number | null => {
      const cleaned = priceStr.replace(/[^0-9.]/g, '');
      const n = parseFloat(cleaned);
      if (isNaN(n)) return null;
      return convertToEUR(n, currency);
    },
    [currency, convertToEUR]
  );

  // Memoized filtered results
  const filteredProperties = useMemo(() => {
    const minPriceEUR = toEUR(debouncedMinPrice);
    const maxPriceEUR = toEUR(debouncedMaxPrice);
    const minSizeNum = debouncedMinSize ? parseFloat(debouncedMinSize) : null;
    const maxSizeNum = debouncedMaxSize ? parseFloat(debouncedMaxSize) : null;

    return allProperties.filter((p) => {
      // 1. Transaction type
      if (filters.transactionType !== 'all') {
        const status = p.status || p.priceType || 'sale';
        const matchesSale =
          filters.transactionType === 'sale'
            ? status === 'sale' || status === 'investment'
            : status === filters.transactionType;
        if (!matchesSale) return false;
      }

      // 2. Region / wilayah filter (matches Lombok area in address/title)
      if (filters.country) {
        const needle = filters.country.toLowerCase();
        const haystack = [
          p.address,
          p.title,
          (p as any).region,
          (p as any).city,
          (p as any).country,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      // 3. Location (substring match, case-insensitive)
      if (debouncedLocation.trim()) {
        const searchStr = debouncedLocation.toLowerCase();

        // Search in multiple fields for a better "Location/Search" experience
        const searchableFields = [
          p.address,
          p.title,
          p.listingCode,
          (p as any).city,
          (p as any).country,
        ].filter(Boolean) as string[];

        const matchesSearch = searchableFields.some(field =>
          field.toLowerCase().includes(searchStr)
        );

        if (!matchesSearch) return false;
      }

      // 4. Price range (EUR-converted)
      if (minPriceEUR !== null && p.price < minPriceEUR) return false;
      if (maxPriceEUR !== null && p.price > maxPriceEUR) return false;

      // 5. Bedrooms (>= comparison)
      if (filters.bedrooms !== 'any') {
        if (p.bedrooms < Number(filters.bedrooms)) return false;
      }

      // 6. Property type (case-insensitive)
      if (filters.propertyType !== 'all') {
        if (`${p.type || ''}`.toLowerCase() !== filters.propertyType.toLowerCase()) {
          return false;
        }
      }

      // 7. Bathrooms (>= comparison)
      if (filters.bathrooms !== 'any') {
        if (p.bathrooms < Number(filters.bathrooms)) return false;
      }

      // 8. Size range (sqft is in m²)
      if (minSizeNum !== null && p.sqft < minSizeNum) return false;
      if (maxSizeNum !== null && p.sqft > maxSizeNum) return false;

      // 9. Lifestyle tags
      if (filters.lifestyle.length > 0) {
        const featureKeys = Object.keys(p.features || {}).map((k) => k.toLowerCase());
        const amenityNames = (p.nearbyAmenities || []).map((a) => a.name.toLowerCase());
        const allTags = [...featureKeys, ...amenityNames];
        const hasAllTags = filters.lifestyle.every((tag) =>
          allTags.some((t) => t.includes(tag.toLowerCase()))
        );
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [
    allProperties,
    filters.transactionType,
    filters.country,
    filters.bedrooms,
    filters.propertyType,
    filters.bathrooms,
    filters.lifestyle,
    debouncedLocation,
    debouncedMinPrice,
    debouncedMaxPrice,
    debouncedMinSize,
    debouncedMaxSize,
    toEUR,
  ]);

  // Count active filters (excluding defaults)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.transactionType !== 'all') count++;
    if (filters.country !== '') count++;
    if (filters.location !== '') count++;
    if (filters.minPrice !== '' || filters.maxPrice !== '') count++;
    if (filters.bedrooms !== 'any') count++;
    if (filters.propertyType !== 'all') count++;
    if (filters.bathrooms !== 'any') count++;
    if (filters.minSize !== '' || filters.maxSize !== '') count++;
    count += filters.lifestyle.length;
    return count;
  }, [filters]);

  const isFiltered = activeFilterCount > 0;

  // Setters
  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    setFilter,
    resetFilters,
    filteredProperties,
    activeFilterCount,
    isFiltered,
  };
}
