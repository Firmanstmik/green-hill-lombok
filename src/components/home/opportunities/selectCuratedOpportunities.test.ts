import { describe, expect, it } from 'vitest';
import { properties } from '@/data/mockData';
import {
  HOMEPAGE_CURATED_IDS,
  opportunityLandSize,
  selectCuratedOpportunities,
} from '@/components/home/opportunities/selectCuratedOpportunities';

describe('selectCuratedOpportunities', () => {
  it('returns a deterministic curated set of at most 4 from mock data', () => {
    const curated = selectCuratedOpportunities(properties);
    expect(curated).toHaveLength(4);
    expect(curated.map((p) => p.id)).toEqual([...HOMEPAGE_CURATED_IDS]);
  });

  it('never exceeds the requested count', () => {
    expect(selectCuratedOpportunities(properties, 3)).toHaveLength(3);
  });

  it('falls back to featured-first when curated ids are absent', () => {
    const foreign = properties.map((p, i) => ({ ...p, id: `uuid-${i}`, featured: i < 2 }));
    const curated = selectCuratedOpportunities(foreign, 4);
    expect(curated).toHaveLength(4);
    expect(curated[0].id).toBe('uuid-0');
    expect(curated[1].id).toBe('uuid-1');
  });

  it('exposes land size from surfaceArea when present', () => {
    expect(opportunityLandSize(properties[0])).toBe('2,450 m²');
  });
});
