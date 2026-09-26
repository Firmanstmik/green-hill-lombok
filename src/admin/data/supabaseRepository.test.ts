import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyOpportunity, type Opportunity } from '../domain/opportunity';
import { planMedia } from '../domain/media';

/**
 * The Supabase repository against an in-memory fake of the Supabase client:
 * two storage buckets and the properties table. Proves the media lifecycle:
 * uploads are private, only public live opportunities get public copies, and
 * those copies disappear when the opportunity stops being public.
 */

const URL_BASE = 'https://example.supabase.co';
const PUBLIC = `${URL_BASE}/storage/v1/object/public/property-images/`;

type Row = Record<string, unknown>;
const buckets: Record<string, Set<string>> = {
  'opportunity-media': new Set(),
  'property-images': new Set(),
  'opportunity-files': new Set(),
};
let rows: Row[] = [];
let clock = 0;
let seq = 0;

function stamp() {
  clock += 1;
  return new Date(Date.UTC(2026, 8, 26, 0, 0, clock)).toISOString();
}

type Filter = (row: Row) => boolean;

function builder() {
  const filters: Filter[] = [];
  let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
  let payload: Row = {};
  const run = () => {
    if (mode === 'insert') {
      const row = { ...payload, id: `opp-${++seq}`, created_at: stamp(), updated_at: stamp() };
      rows.push(row);
      return [row];
    }
    const matched = rows.filter((row) => filters.every((f) => f(row)));
    if (mode === 'update') {
      for (const row of matched) Object.assign(row, payload, { updated_at: stamp() });
    }
    if (mode === 'delete') rows = rows.filter((row) => !matched.includes(row));
    return matched.map((row) => ({ ...row }));
  };
  const api = {
    select: () => api,
    insert: (value: Row) => ((mode = 'insert'), (payload = value), api),
    update: (value: Row) => ((mode = 'update'), (payload = value), api),
    delete: () => ((mode = 'delete'), api),
    eq: (key: string, value: unknown) => (filters.push((row) => row[key] === value), api),
    neq: (key: string, value: unknown) => (filters.push((row) => row[key] !== value), api),
    in: (key: string, values: unknown[]) => (filters.push((row) => values.includes(row[key])), api),
    order: () => api,
    single: async () => ({ data: run()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
    then: (resolve: (value: { data: Row[]; error: null }) => void) => resolve({ data: run(), error: null }),
  };
  return api;
}

function storageBucket(bucket: string) {
  return {
    upload: async (path: string) => {
      if (buckets[bucket].has(path)) return { error: { message: 'The resource already exists' } };
      buckets[bucket].add(path);
      return { error: null };
    },
    copy: async (from: string, to: string, options?: { destinationBucket?: string }) => {
      const target = options?.destinationBucket ?? bucket;
      if (!buckets[bucket].has(from)) return { error: { message: 'Object not found' } };
      if (buckets[target].has(to)) return { error: { message: 'The resource already exists' } };
      buckets[target].add(to);
      return { error: null };
    },
    remove: async (paths: string[]) => {
      paths.forEach((path) => buckets[bucket].delete(path));
      return { error: null };
    },
    createSignedUrls: async (paths: string[], expiresIn: number) => ({
      data: paths.map((path) => ({ path, signedUrl: `${URL_BASE}/storage/v1/object/sign/${bucket}/${path}?token=t&e=${expiresIn}` })),
      error: null,
    }),
  };
}

vi.mock('@/lib/supabase', () => ({
  supabaseUrl: 'https://example.supabase.co',
  supabase: {
    from: () => builder(),
    storage: { from: (bucket: string) => storageBucket(bucket) },
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
  },
}));

vi.mock('browser-image-compression', () => ({ default: async (file: File) => file }));

const { createSupabaseRepository } = await import('./supabaseRepository');
const repo = createSupabaseRepository();
const NO_DERIVED = { priceEUR: null };

function draft(patch: Partial<Opportunity> = {}): Opportunity {
  return { ...emptyOpportunity('GH-LOM-001'), title: 'Ridge plot', type: 'Land', ...patch };
}

const photo = () => new File([new Uint8Array([1, 2, 3])], 'p.jpg', { type: 'image/jpeg' });
const pdf = () => new File([new Uint8Array([4])], 'b.pdf', { type: 'application/pdf' });
const publicFiles = () => [...buckets['property-images']].sort();
const publicDocs = () => [...buckets['opportunity-files']].sort();
const FILES = `${URL_BASE}/storage/v1/object/public/opportunity-files/`;

async function save(o: Opportunity): Promise<Opportunity> {
  return o.id ? repo.updateOpportunity(o, NO_DERIVED, o.updatedAt) : repo.createOpportunity(o, NO_DERIVED);
}

beforeEach(() => {
  buckets['opportunity-media'].clear();
  buckets['property-images'].clear();
  buckets['opportunity-files'].clear();
  rows = [];
});

describe('private media lifecycle', () => {
  it('stores uploads privately and never makes a draft public', async () => {
    const a = await repo.uploadImage(photo());
    expect(a).toMatch(/^private-media:images\/.+\.webp$/);
    expect(buckets['opportunity-media'].has(a.replace('private-media:', ''))).toBe(true);

    const saved = await save(draft({ images: [a], imageAlt: { [a]: 'Ridge at dusk' } }));
    expect(saved.images).toEqual([a]);
    expect(publicFiles()).toEqual([]);
    expect(rows[0].image_url).toBe(a);
  });

  it('publishes copies for a public live opportunity and removes them when it stops being public', async () => {
    const a = await repo.uploadImage(photo());
    const b = await repo.uploadImage(photo());
    const nameA = a.split('/').pop()!;
    const nameB = b.split('/').pop()!;
    let o = await save(draft({ images: [a, b], imageAlt: { [a]: 'Ridge at dusk' } }));

    o = await save({ ...o, status: 'available' });
    expect(o.images).toEqual([PUBLIC + nameA, PUBLIC + nameB]);
    expect(o.imageAlt).toEqual({ [PUBLIC + nameA]: 'Ridge at dusk' });
    expect(publicFiles()).toEqual([nameA, nameB].sort());

    // Unpublish: back to private references, public copies gone.
    o = await save({ ...o, status: 'draft' });
    expect(o.images).toEqual([a, b]);
    expect(o.imageAlt).toEqual({ [a]: 'Ridge at dusk' });
    expect(publicFiles()).toEqual([]);

    // Private and live: still nothing public.
    o = await save({ ...o, status: 'available', visibility: 'private' });
    expect(o.images).toEqual([a, b]);
    expect(publicFiles()).toEqual([]);

    // Public again, then archived.
    o = await save({ ...o, visibility: 'public' });
    expect(publicFiles()).toHaveLength(2);
    o = await save({ ...o, status: 'archived' });
    expect(o.images).toEqual([a, b]);
    expect(publicFiles()).toEqual([]);
  });

  it('removes the public copy of a photograph taken out of a live opportunity', async () => {
    const a = await repo.uploadImage(photo());
    const b = await repo.uploadImage(photo());
    let o = await save(draft({ images: [a, b], status: 'available' }));
    expect(publicFiles()).toHaveLength(2);
    o = await save({ ...o, images: [o.images[0]] });
    expect(publicFiles()).toEqual([a.split('/').pop()]);
  });

  it('replaces a photograph on a live opportunity without leaving the old copy public', async () => {
    const a = await repo.uploadImage(photo());
    let o = await save(draft({ images: [a], status: 'available' }));
    const replacement = await repo.uploadImage(photo());
    o = await save({ ...o, images: [replacement] });
    expect(publicFiles()).toEqual([replacement.split('/').pop()]);
    expect(o.images[0].startsWith(PUBLIC)).toBe(true);
  });

  it('never deletes a public copy another live opportunity still uses', async () => {
    const a = await repo.uploadImage(photo());
    const live = await save(draft({ images: [a], status: 'available' }));
    // A duplicate starts as a draft holding the same photograph.
    const copy = await save({ ...live, id: null, updatedAt: null, status: 'draft', title: 'Copy of Ridge plot' });
    expect(copy.images).toEqual([a]);
    expect(publicFiles()).toEqual([a.split('/').pop()]);
  });

  it('publishes a brochure only when Reece shows it, and never the memorandum', async () => {
    const brochure = await repo.uploadDocument(pdf());
    const memo = await repo.uploadDocument(pdf());
    const image = await repo.uploadImage(photo());
    const name = brochure.split('/').pop()!;
    let o = await save(draft({ images: [image], brochureUrl: brochure, memorandumUrl: memo, status: 'available' }));
    // Not shown: stays private even though the opportunity is live.
    expect(o.brochureUrl).toBe(brochure);
    expect(publicDocs()).toEqual([]);

    o = await save({ ...o, disclosure: { brochure: true } });
    expect(o.brochureUrl).toBe(FILES + name);
    expect(publicDocs()).toEqual([name]);
    expect(o.memorandumUrl).toBe(memo);

    // Hidden again: back to private, public copy removed.
    o = await save({ ...o, disclosure: {} });
    expect(o.brochureUrl).toBe(brochure);
    expect(publicDocs()).toEqual([]);

    // Shown, then the opportunity is unpublished: removed too.
    o = await save({ ...o, disclosure: { brochure: true } });
    expect(publicDocs()).toEqual([name]);
    o = await save({ ...o, status: 'draft' });
    expect(o.brochureUrl).toBe(brochure);
    expect(publicDocs()).toEqual([]);
    expect(rows[0].memorandum_url).toBe(memo);
  });

  it('gives a Green Hill Private teaser public photographs, but not a hidden private opportunity', async () => {
    const a = await repo.uploadImage(photo());
    let o = await save(draft({ images: [a], visibility: 'private', status: 'available' }));
    expect(o.images).toEqual([a]);
    expect(publicFiles()).toEqual([]);

    o = await save({ ...o, privateTeaser: true });
    expect(o.images[0].startsWith(PUBLIC)).toBe(true);
    expect(publicFiles()).toEqual([a.split('/').pop()]);
    expect(rows[0].private_teaser).toBe(true);

    o = await save({ ...o, privateTeaser: false });
    expect(o.images).toEqual([a]);
    expect(publicFiles()).toEqual([]);
  });

  it('keeps brochures and masterplans private, even on a public live opportunity', async () => {
    const brochure = await repo.uploadDocument(pdf());
    const masterplan = await repo.uploadDocument(pdf());
    expect(brochure).toMatch(/^private-media:documents\/.+\.pdf$/);
    const image = await repo.uploadImage(photo());
    let o = await save(draft({ images: [image], brochureUrl: brochure, masterplanUrl: masterplan, status: 'available' }));
    expect(o.brochureUrl).toBe(brochure);
    expect(o.masterplanUrl).toBe(masterplan);
    expect(publicFiles().some((name) => name.endsWith('.pdf'))).toBe(false);

    // Replace, then remove.
    const newer = await repo.uploadDocument(pdf());
    o = await save({ ...o, brochureUrl: newer });
    expect(rows[0].brochure_url).toBe(newer);
    o = await save({ ...o, masterplanUrl: '' });
    expect(rows[0].masterplan_url).toBeNull();
    expect(publicFiles().some((name) => name.endsWith('.pdf'))).toBe(false);
  });

  it('opens private media for the admin through signed links only', async () => {
    const a = await repo.uploadImage(photo());
    const urls = await repo.resolveMedia([a, 'https://cdn.example.com/x.jpg']);
    expect(urls[a]).toMatch(/\/object\/sign\/opportunity-media\/images\/.+token=/);
    expect(urls['https://cdn.example.com/x.jpg']).toBe('https://cdn.example.com/x.jpg');
  });
});

describe('media plan', () => {
  const o = (patch: Partial<Opportunity>) => ({ ...emptyOpportunity(), ...patch });

  it('leaves links that are not Green Hill storage alone', () => {
    const plan = planMedia(o({ status: 'available', images: ['https://cdn.example.com/a.jpg'] }), null, new Set(), URL_BASE);
    expect(plan.record.images).toEqual(['https://cdn.example.com/a.jpg']);
    expect(plan.copyToPublic).toEqual([]);
    expect(plan.deletePublic).toEqual([]);
  });

  it('moves an older public-only file back to private storage before unpublishing', () => {
    const plan = planMedia(o({ status: 'draft', images: [`${PUBLIC}old.webp`] }), null, new Set(), URL_BASE);
    expect(plan.record.images).toEqual(['private-media:images/old.webp']);
    expect(plan.copyToPrivate).toEqual([{ bucket: 'property-images', name: 'old.webp' }]);
    expect(plan.deletePublic).toEqual([{ bucket: 'property-images', name: 'old.webp' }]);
  });

  it('publishes a private social image with the photographs', () => {
    const plan = planMedia(
      o({ status: 'sold', images: ['private-media:images/a.webp'], ogImage: 'private-media:images/a.webp' }),
      null,
      new Set(),
      URL_BASE,
    );
    expect(plan.record.ogImage).toBe(`${PUBLIC}a.webp`);
    expect(plan.copyToPublic).toEqual([{ bucket: 'property-images', name: 'a.webp' }]);
  });
});
