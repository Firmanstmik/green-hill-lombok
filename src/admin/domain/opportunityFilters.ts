import { publicLocationLine, type Opportunity, type OpportunityStatus } from './opportunity';

export type OpportunityFilters = {
  q: string;
  status: OpportunityStatus | 'all';
  visibility: 'all' | 'public' | 'private';
  type: string;
  area: string;
  featured: 'all' | 'yes';
  sort: 'updated' | 'title' | 'landSize' | 'status';
};

export const DEFAULT_FILTERS: OpportunityFilters = {
  q: '',
  status: 'all',
  visibility: 'all',
  type: 'all',
  area: 'all',
  featured: 'all',
  sort: 'updated',
};

const STATUS_ORDER: Record<OpportunityStatus, number> = {
  draft: 0,
  available: 1,
  reserved: 2,
  sold: 3,
  archived: 4,
};

export function placeOf(o: Opportunity): string {
  return o.area.trim() || o.region.trim() || publicLocationLine(o).split(',')[0]?.trim() || '';
}

export function areaOptions(list: Opportunity[]): string[] {
  return [...new Set(list.map(placeOf).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function applyOpportunityFilters(list: Opportunity[], f: OpportunityFilters): Opportunity[] {
  const q = f.q.trim().toLowerCase();
  const filtered = list.filter((o) => {
    // "All" is the working collection: archived records only appear in their own view.
    if (f.status === 'all' ? o.status === 'archived' : o.status !== f.status) return false;
    if (f.visibility !== 'all' && o.visibility !== f.visibility) return false;
    if (f.type !== 'all' && o.type !== f.type) return false;
    if (f.area !== 'all' && placeOf(o) !== f.area) return false;
    if (f.featured === 'yes' && !o.featured) return false;
    if (q) {
      const haystack = [o.title, o.reference, o.area, o.region, o.address, o.type].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (f.sort) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'landSize':
        return (b.landSize ?? -1) - (a.landSize ?? -1);
      case 'status':
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
      default:
        return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    }
  });
}

export function filtersFromParams(params: URLSearchParams): OpportunityFilters {
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = params.get(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  };
  return {
    q: params.get('q') ?? '',
    status: pick('status', ['all', 'draft', 'available', 'reserved', 'sold', 'archived'] as const, 'all'),
    visibility: pick('visibility', ['all', 'public', 'private'] as const, 'all'),
    type: params.get('type') ?? 'all',
    area: params.get('area') ?? 'all',
    featured: pick('featured', ['all', 'yes'] as const, 'all'),
    sort: pick('sort', ['updated', 'title', 'landSize', 'status'] as const, 'updated'),
  };
}

export function filtersToParams(f: OpportunityFilters): URLSearchParams {
  const params = new URLSearchParams();
  (Object.keys(DEFAULT_FILTERS) as (keyof OpportunityFilters)[]).forEach((key) => {
    if (f[key] !== DEFAULT_FILTERS[key]) params.set(key, String(f[key]));
  });
  return params;
}
