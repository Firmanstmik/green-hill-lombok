import { describe, expect, it, beforeEach } from 'vitest';
import {
  duplicateOpportunity,
  emptyOpportunity,
  draftErrors,
  isReadyToPublish,
  nextReference,
  publicLocationLine,
  requiredChecks,
  slugify,
  withLifecycle,
  type Opportunity,
} from './opportunity';
import { fromRow, toRow } from './opportunityRow';
import { applyOpportunityFilters, DEFAULT_FILTERS, filtersFromParams, filtersToParams } from './opportunityFilters';
import { attentionItems } from './attention';
import { enquiryFromRow, whatsappLink } from './enquiry';
import { backupKey, clearBackup, readBackup } from '../editor/useOpportunityEditor';
import { sourcePriceOf, ratesAreUsable, convertAmount } from '@/lib/opportunityPrice';
import { readOpportunityPreview, writeOpportunityPreview } from '@/lib/opportunityPreview';

function complete(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    ...emptyOpportunity('GH-LOM-001'),
    id: 'a1',
    title: 'Elevated Coastal Land',
    type: 'Land',
    summary: 'Elevated coastal land above Selong Belanak bay.',
    area: 'Selong Belanak',
    region: 'South Lombok',
    images: ['https://cdn/x/1.webp', 'https://cdn/x/2.webp'],
    priceOnRequest: false,
    priceAmount: 4_500_000_000,
    priceCurrency: 'IDR',
    landSize: 2450,
    updatedAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('opportunity row mapping', () => {
  it('round-trips the admin model through the database row', () => {
    const o = complete({ tenure: 'HGB', leaseYears: 25, zoning: 'Tourism', whyGreenHill: 'The view.' });
    const back = fromRow({ ...toRow(o, { priceEUR: 260_000 }), id: 'a1', updated_at: o.updatedAt });
    expect(back.title).toBe(o.title);
    expect(back.type).toBe('Land');
    expect(back.landSize).toBe(2450);
    expect(back.tenure).toBe('HGB');
    expect(back.leaseYears).toBe(25);
    expect(back.zoning).toBe('Tourism');
    expect(back.whyGreenHill).toBe('The view.');
    expect(back.images).toEqual(o.images);
  });

  it('keeps the source price exactly as entered; EUR is only a derived reference', () => {
    const row = toRow(complete(), { priceEUR: 259_999.6 });
    expect(row.price_amount).toBe(4_500_000_000);
    expect(row.price_currency).toBe('IDR');
    expect(row.price).toBe(260_000);
    // Re-saving with a different rate never touches the source.
    const again = toRow(fromRow({ ...row, id: 'a1' }), { priceEUR: 300_000 });
    expect(again.price_amount).toBe(4_500_000_000);
    expect(again.price_currency).toBe('IDR');
  });

  it('writes price on request as no amount', () => {
    const row = toRow(complete({ priceOnRequest: true }), { priceEUR: 1 });
    expect(row.price_on_request).toBe(true);
    expect(row.price_amount).toBeNull();
    expect(row.price).toBe(0);
  });

  it('never invents legal or technical claims for empty fields', () => {
    const row = toRow(emptyOpportunity(), { priceEUR: null });
    expect(row.ownership).toBeNull();
    expect(row.zoning).toBeNull();
    expect(row.year_built).toBeNull();
    expect(row.furnishing).toBeNull();
    expect(row.development_status).toBeNull();
    expect(row.features).toEqual({});
  });

  it('writes land size to the columns the public memo reads, not building area', () => {
    const row = toRow(complete({ landSize: 2450, buildingArea: 320 }), { priceEUR: null });
    expect(row.surface_area).toBe('2,450 m²');
    expect(row.m2).toBe(2450);
    expect(row.building_area).toBe('320 m²');
  });

  it('never features a private record', () => {
    const row = toRow(complete({ featured: true, visibility: 'private' }), { priceEUR: null });
    expect(row.featured).toBe(false);
    expect((row.features as Record<string, string>).Private).toBe('true');
  });

  it('maps inherited status words to the Green Hill vocabulary', () => {
    expect(fromRow({ status: 'active' }).status).toBe('available');
    expect(fromRow({ status: 'under_offer' }).status).toBe('reserved');
    expect(fromRow({ status: 'nonsense' }).status).toBe('draft');
  });

  it('reads legacy EUR prices without converting them', () => {
    const o = fromRow({ price: 350000 });
    expect(o.priceAmount).toBe(350000);
    expect(o.priceCurrency).toBe('EUR');
    expect(o.priceOnRequest).toBe(false);
  });
});

describe('readiness and lifecycle', () => {
  it('is ready only when every required item is present', () => {
    expect(isReadyToPublish(complete())).toBe(true);
    expect(isReadyToPublish(complete({ images: [] }))).toBe(false);
    expect(isReadyToPublish(complete({ area: '', region: '', address: '' }))).toBe(false);
    expect(isReadyToPublish(complete({ priceOnRequest: false, priceAmount: null }))).toBe(false);
    expect(isReadyToPublish(complete({ priceOnRequest: true, priceAmount: null }))).toBe(true);
    expect(requiredChecks(complete({ summary: 'short' })).find((c) => c.id === 'summary')?.done).toBe(false);
  });

  it('sets published and archived timestamps from the status', () => {
    const published = withLifecycle(complete({ status: 'available', publishedAt: null }));
    expect(published.publishedAt).not.toBeNull();
    const archived = withLifecycle({ ...published, status: 'archived' });
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.publishedAt).toBe(published.publishedAt);
    const draft = withLifecycle({ ...published, status: 'draft' });
    expect(draft.publishedAt).toBeNull();
    expect(draft.archivedAt).toBeNull();
  });

  it('fills the slug from the title when empty', () => {
    expect(withLifecycle(complete({ slug: '' })).slug).toBe('elevated-coastal-land');
  });

  it('duplicates as a fresh, unpublished, unfeatured draft', () => {
    const copy = duplicateOpportunity(complete({ status: 'sold', featured: true, slug: 'x', publishedAt: 'y' }), 'GH-LOM-009');
    expect(copy).toMatchObject({ id: null, status: 'draft', featured: false, slug: '', publishedAt: null, reference: 'GH-LOM-009' });
    expect(copy.title).toBe('Copy of Elevated Coastal Land');
  });

  it('validates links, slugs and coordinates', () => {
    expect(draftErrors(complete({ slug: 'Bad Slug' })).slug).toBeTruthy();
    expect(draftErrors(complete({ videoUrl: 'youtube.com/x' })).videoUrl).toBeTruthy();
    expect(draftErrors(complete({ latitude: 120 })).latitude).toBeTruthy();
    expect(draftErrors(complete())).toEqual({});
  });
});

describe('helpers', () => {
  it('generates the next reference', () => {
    expect(nextReference([])).toBe('GH-LOM-001');
    expect(nextReference(['GH-LOM-001', 'GH-LOM-007', 'UK-ABC12'])).toBe('GH-LOM-008');
  });

  it('slugifies with accents and punctuation', () => {
    expect(slugify('  Tanjung Aan — Hillside Land! ')).toBe('tanjung-aan-hillside-land');
    expect(slugify('Pantai Mawún')).toBe('pantai-mawun');
  });

  it('builds the public location line', () => {
    expect(publicLocationLine({ address: '', area: 'Kuta', region: 'South Lombok' })).toBe('Kuta, South Lombok');
    expect(publicLocationLine({ address: 'Jl. Pantai', area: 'Kuta', region: '' })).toBe('Jl. Pantai');
  });

  it('builds WhatsApp links only from real numbers', () => {
    expect(whatsappLink('+44 7810 062383')).toBe('https://wa.me/447810062383');
    expect(whatsappLink('n/a')).toBeNull();
  });
});

describe('filters', () => {
  const list = [
    complete({ id: '1', title: 'Coastal', status: 'available', updatedAt: '2026-09-01' }),
    complete({ id: '2', title: 'Villa', type: 'Villa', status: 'draft', visibility: 'private', updatedAt: '2026-09-03' }),
    complete({ id: '3', title: 'Old', status: 'archived', updatedAt: '2026-09-05' }),
  ];

  it('keeps archived records out of "All"', () => {
    expect(applyOpportunityFilters(list, DEFAULT_FILTERS).map((o) => o.id)).toEqual(['2', '1']);
    expect(applyOpportunityFilters(list, { ...DEFAULT_FILTERS, status: 'archived' }).map((o) => o.id)).toEqual(['3']);
  });

  it('filters by visibility, type and search', () => {
    expect(applyOpportunityFilters(list, { ...DEFAULT_FILTERS, visibility: 'private' }).map((o) => o.id)).toEqual(['2']);
    expect(applyOpportunityFilters(list, { ...DEFAULT_FILTERS, type: 'Villa' }).map((o) => o.id)).toEqual(['2']);
    expect(applyOpportunityFilters(list, { ...DEFAULT_FILTERS, q: 'coast' }).map((o) => o.id)).toEqual(['1']);
  });

  it('round-trips through the URL', () => {
    const f = { ...DEFAULT_FILTERS, status: 'sold' as const, q: 'kuta', sort: 'title' as const };
    expect(filtersFromParams(filtersToParams(f))).toEqual(f);
    expect(filtersFromParams(new URLSearchParams('status=bogus')).status).toBe('all');
  });
});

describe('needs attention', () => {
  it('lists new enquiries first, then publishing gaps; nothing invented', () => {
    const enquiry = enquiryFromRow({ id: 'e1', name: 'Ana', status: 'new', source: 'private', created_at: new Date().toISOString() });
    const items = attentionItems(
      [
        complete({ id: 'd', status: 'draft', images: [], summary: '' }),
        complete({ id: 'p', status: 'available', seoDescription: '' }),
        complete({ id: 'ok', status: 'available', seoDescription: 'Fine.', imageAlt: { 'https://cdn/x/1.webp': 'Land' } }),
      ],
      [enquiry],
    );
    expect(items[0].title).toBe('Private enquiry from Ana');
    expect(items.map((i) => i.id)).toEqual(['enquiry-e1', 'img-d', 'sum-d', 'seo-p', 'alt-p']);
  });
});

describe('local safety', () => {
  beforeEach(() => localStorage.clear());

  it('never returns another record’s backup', () => {
    localStorage.setItem(
      backupKey('abc'),
      JSON.stringify({ record: { ...emptyOpportunity(), id: 'other' }, baseUpdatedAt: null, at: '' }),
    );
    expect(readBackup('abc')).toBeNull();
    localStorage.setItem(backupKey('abc'), JSON.stringify({ record: { ...emptyOpportunity(), id: 'abc' }, baseUpdatedAt: null, at: '' }));
    expect(readBackup('abc')?.record.id).toBe('abc');
    expect(readBackup(null)).toBeNull();
    clearBackup('abc');
    expect(readBackup('abc')).toBeNull();
  });

  it('only serves a preview to the record it was written for', () => {
    writeOpportunityPreview('one', { id: 'one', title: 'A' });
    expect(readOpportunityPreview('one')).toMatchObject({ title: 'A' });
    expect(readOpportunityPreview('two')).toBeNull();
  });
});

describe('public price source', () => {
  it('prefers the stored source price and treats price on request as none', () => {
    expect(sourcePriceOf({ price_amount: 4.5e9, price_currency: 'IDR', price: 260000 })).toEqual({ amount: 4.5e9, currency: 'IDR' });
    expect(sourcePriceOf({ price_on_request: true, price_amount: 5 })).toBeNull();
    expect(sourcePriceOf({ price: 350000 })).toEqual({ amount: 350000, currency: 'EUR' });
    expect(sourcePriceOf({ price: 0 })).toBeNull();
  });

  it('refuses to convert with placeholder 1:1 rates', () => {
    expect(ratesAreUsable({ EUR: 1, USD: 1, IDR: 1, GBP: 1 })).toBe(false);
    const rates = { EUR: 1, USD: 1.1, IDR: 17_000, GBP: 0.85 };
    expect(ratesAreUsable(rates)).toBe(true);
    expect(convertAmount(17_000_000, 'IDR', 'USD', rates)).toBeCloseTo(1100);
  });
});
