import { describe, expect, it } from 'vitest';
import { teaserFromRow } from './privateTeasers';

const row = {
  id: 'p1',
  listing_code: 'GH-LOM-009',
  title: 'Beachfront development opportunity',
  status: 'available',
  visibility: 'private',
  private_teaser: true,
  region: 'South Lombok',
  area: 'Are Guling',
  address: 'Jl. Secret 1',
  latitude: -8.9,
  longitude: 116.2,
  nearby_amenities: [{ name: 'Kuta', distance: '15 min' }],
  road_access: 'Paved to the boundary',
  utilities: 'PLN at the road',
  price_amount: 25000000000,
  price_currency: 'IDR',
  price_on_request: false,
  price: 1400000,
  ownership: 'Freehold',
  lease_years: null,
  developer_name: 'Hidden Developer',
  brochure_url: 'https://x.supabase.co/storage/v1/object/public/opportunity-files/b.pdf',
  masterplan_url: 'https://x.supabase.co/storage/v1/object/public/opportunity-files/m.pdf',
  memorandum_url: 'private-media:documents/memo.pdf',
  verification_notes: 'Title still to verify',
  features: { Private: 'true', 'Term remaining': '25 years', Zoning: 'Tourism' },
  disclosure: {},
};

describe('Green Hill Private teaser disclosure', () => {
  it('hides everything that is not switched on', () => {
    const t = teaserFromRow(row);
    expect(t.price_amount).toBeNull();
    expect(t.price_on_request).toBe(true);
    expect(t.address).toBe('South Lombok');
    expect(t.area).toBeNull();
    expect(t.road_access).toBeNull();
    expect(t.latitude).toBeNull();
    expect(t.nearby_amenities).toEqual([]);
    expect(t.ownership).toBeNull();
    expect(t.developer_name).toBeNull();
    expect(t.brochure_url).toBeNull();
    expect(t.masterplan_url).toBeNull();
    expect(t.features).toEqual({ Zoning: 'Tourism' });
  });

  it('never carries the memorandum, verification notes or the switches themselves', () => {
    const t = teaserFromRow({ ...row, disclosure: { price: true, location: true, map: true, tenure: true, developer: true, brochure: true, masterplan: true } });
    for (const secret of ['memorandum_url', 'verification_notes', 'disclosure', 'user_id', 'formatted_address']) {
      expect(t).not.toHaveProperty(secret);
    }
    expect(JSON.stringify(t)).not.toMatch(/memo\.pdf|Title still to verify/);
  });

  it('shows what Reece discloses, and a map only with the exact location', () => {
    const mapOnly = teaserFromRow({ ...row, disclosure: { map: true } });
    expect(mapOnly.latitude).toBeNull();
    const shown = teaserFromRow({ ...row, disclosure: { price: true, location: true, map: true, tenure: true, developer: true, brochure: true } });
    expect(shown.price_amount).toBe(25000000000);
    expect(shown.address).toBe('Jl. Secret 1');
    expect(shown.latitude).toBe(-8.9);
    expect(shown.ownership).toBe('Freehold');
    expect(shown.developer_name).toBe('Hidden Developer');
    expect(shown.brochure_url).toMatch(/b\.pdf$/);
    expect(shown.masterplan_url).toBeNull();
    expect(shown.features).toEqual({ 'Term remaining': '25 years', Zoning: 'Tourism' });
  });
});
