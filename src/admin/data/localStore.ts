/**
 * DEVELOPMENT-ONLY local preview store.
 *
 * Used only when `import.meta.env.DEV` is true and no Green Hill Supabase
 * project is configured. It lets the admin workflow be exercised in a browser
 * without a database. Records live in this browser's localStorage and are
 * never shown to anyone else. The admin labels this mode on every screen.
 *
 * Rows are stored in the same shape as the `properties` / `enquiries` tables,
 * so the exact same mapping code runs in both modes.
 */
import imageCompression from 'browser-image-compression';
import { properties as demoProperties } from '@/data/mockData';
import { plainTextToTiptapJson } from '@/lib/tiptap-utils';
import type { EnquirySubmission } from '@/lib/enquiries';
import {
  activityFromRow,
  enquiryFromRow,
  type EnquiryStatus,
  type NewEnquiry,
} from '../domain/enquiry';
import { teaserFromRow } from '@/lib/privateTeasers';
import { isExposed } from '../domain/media';
import { noteFromDbRow, noteProblems, noteToDbRow, type ContentRow, type MediaValue } from '../domain/content';
import { withLifecycle } from '../domain/opportunity';
import { fromRow, toRow } from '../domain/opportunityRow';
import { ConflictError, assertImage, randomName, type AdminRepository } from './repository';

const STORE_KEY = 'gh-admin-local-v1';

type Row = Record<string, unknown>;
type Store = { opportunities: Row[]; enquiries: Row[]; activity: Row[]; content: Row[]; notes: Row[] };

function newId(): string {
  return randomName('x').replace(/\.x$/, '');
}

function now(): string {
  return new Date().toISOString();
}

/** The site's own demo opportunities become the starting local records. */
function seed(): Store {
  const stamp = now();
  const opportunities = demoProperties.map((p, index) => {
    const status = String(p.features?.Status || 'Available').toLowerCase();
    const description = p.description?.trim() || '';
    return {
      id: p.id,
      listing_code: p.listingCode || `GH-LOM-${String(index + 1).padStart(3, '0')}`,
      slug: '',
      title: p.title,
      type: p.type,
      status: ['available', 'reserved', 'sold'].includes(status) ? status : 'available',
      visibility: 'public',
      featured: p.featured,
      summary: description,
      address: p.address,
      formatted_address: p.address,
      surface_area: p.surfaceArea || null,
      building_area: p.buildingArea || null,
      land_size: null,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      ownership: p.ownership || null,
      description_json: description ? plainTextToTiptapJson(description) : null,
      images: p.images,
      image_url: p.image,
      price_on_request: !(p.price > 0),
      created_at: stamp,
      updated_at: stamp,
      published_at: stamp,
    } satisfies Row;
  });
  return { opportunities, enquiries: [], activity: [], content: [], notes: [] };
}

function read(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      // Older local stores predate content and Notes.
      return { content: [], notes: [], ...parsed } as Store;
    }
  } catch {
    // Corrupt or blocked storage: start again from the seed.
  }
  const initial = seed();
  write(initial);
  return initial;
}

function write(store: Store): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    throw new Error('Local preview storage is full. Remove a few photographs or clear local data in Settings.');
  }
}

export function resetLocalStore(): void {
  localStorage.removeItem(STORE_KEY);
}

function insertEnquiry(store: Store, fields: Row): Row {
  const stamp = now();
  const row: Row = { id: newId(), created_at: stamp, updated_at: stamp, status: 'new', ...fields };
  store.enquiries.unshift(row);
  store.activity.push({
    id: newId(),
    enquiry_id: row.id,
    kind: 'created',
    to_status: row.status,
    created_at: stamp,
  });
  return row;
}

/** Called by the public enquiry form in development (see src/lib/enquiries.ts). */
export function localRecordPublicEnquiry(input: EnquirySubmission): void {
  const store = read();
  // Same rule as the server: only an opportunity a visitor could see is attached.
  const linked = input.opportunityId
    ? store.opportunities.find((row) => row.id === input.opportunityId && isExposed(fromRow(row)))
    : undefined;
  insertEnquiry(store, {
    name: input.name,
    email: input.email || null,
    whatsapp: input.whatsapp || null,
    country: input.country || null,
    enquiry_type: input.enquiryType || null,
    message: input.message || null,
    source: input.source,
    opportunity_id: linked ? input.opportunityId : null,
    opportunity_title: linked ? String(linked.title ?? '') : null,
    company: input.company || null,
    budget: input.budget || null,
    investor_type: input.investorType || null,
    interests: input.interests && input.interests.length > 0 ? input.interests : null,
    objective: input.objective || null,
    timeframe: input.timeframe || null,
  });
  write(store);
}

/** Development preview of the server's teaser functions (same disclosure rules). */
function liveTeasers(): Row[] {
  return read().opportunities.filter(
    (row) => row.visibility === 'private' && row.private_teaser === true && ['available', 'reserved', 'sold'].includes(String(row.status)),
  );
}

export function localPrivateTeasers(): Record<string, unknown>[] {
  return liveTeasers().map(teaserFromRow);
}

export function localPrivateTeaser(key: string): Record<string, unknown> | null {
  const k = key.toLowerCase();
  const row = liveTeasers().find(
    (r) => String(r.listing_code ?? '').toLowerCase() === k || r.slug === key || r.id === key,
  );
  return row ? teaserFromRow(row) : null;
}

/** Every content row (drafts and published); the public preview decides what to show. */
export function localContentRows(): ContentRow[] {
  return read().content.map((r) => ({
    page: String(r.page_key),
    locale: String(r.locale),
    status: r.status === 'draft' ? 'draft' : 'published',
    fields: (r.fields as Record<string, string>) ?? {},
    media: (r.media as Record<string, MediaValue>) ?? {},
    updatedAt: (r.updated_at as string) ?? null,
    publishedAt: (r.published_at as string) ?? null,
  }));
}

export function localNoteRows(): Row[] {
  return read().notes;
}

const delay = () => new Promise((resolve) => setTimeout(resolve, 120));

export function createLocalRepository(): AdminRepository {
  return {
    mode: 'local',

    async listOpportunities() {
      await delay();
      return read()
        .opportunities.map(fromRow)
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    },

    async getOpportunity(id) {
      await delay();
      const row = read().opportunities.find((item) => item.id === id);
      return row ? fromRow(row) : null;
    },

    async createOpportunity(record, derived) {
      await delay();
      const store = read();
      const row = toRow(withLifecycle(record), derived);
      const slug = row.slug as string | null;
      if (slug && store.opportunities.some((item) => item.slug === slug)) {
        throw new Error('That URL slug is already used by another opportunity.');
      }
      const stamp = now();
      const saved = { ...row, id: newId(), created_at: stamp, updated_at: stamp };
      store.opportunities.unshift(saved);
      write(store);
      return fromRow(saved);
    },

    async updateOpportunity(record, derived, expectedUpdatedAt) {
      await delay();
      const store = read();
      const index = store.opportunities.findIndex((item) => item.id === record.id);
      if (index < 0) throw new Error('This opportunity no longer exists.');
      const current = store.opportunities[index];
      if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) throw new ConflictError();
      const row = toRow(withLifecycle(record), derived);
      const slug = row.slug as string | null;
      if (slug && store.opportunities.some((item) => item.slug === slug && item.id !== record.id)) {
        throw new Error('That URL slug is already used by another opportunity.');
      }
      const saved = { ...current, ...row, updated_at: now() };
      store.opportunities[index] = saved;
      write(store);
      return fromRow(saved);
    },

    async deleteDraft(id) {
      await delay();
      const store = read();
      store.opportunities = store.opportunities.filter((item) => !(item.id === id && item.status === 'draft'));
      write(store);
    },

    async resolveMedia(refs) {
      return Object.fromEntries(refs.map((ref) => [ref, ref]));
    },

    async uploadImage(file) {
      assertImage(file);
      // Small on purpose: localStorage holds roughly 5 MB in total.
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.08,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      return imageCompression.getDataUrlFromFile(compressed);
    },

    async listContent() {
      await delay();
      return localContentRows();
    },

    async saveContentDraft(page, rows, expectedVersion) {
      await delay();
      const store = read();
      const versionRow = store.content.find((r) => r.page_key === page && r.locale === '*' && r.status === 'draft');
      if (((versionRow?.updated_at as string) ?? null) !== expectedVersion) throw new ConflictError();
      const stamp = now();
      const upsert = (locale: string, fields: Record<string, string>, media: Record<string, MediaValue>) => {
        const existing = store.content.find((r) => r.page_key === page && r.locale === locale && r.status === 'draft');
        const values = { fields, media: locale === '*' ? media : {}, updated_at: stamp };
        if (existing) Object.assign(existing, values);
        else store.content.push({ page_key: page, locale, status: 'draft', ...values });
      };
      for (const row of rows) upsert(row.locale, row.fields ?? {}, row.media ?? {});
      if (!rows.some((row) => row.locale === '*')) {
        const star = store.content.find((r) => r.page_key === page && r.locale === '*' && r.status === 'draft');
        if (star) star.updated_at = stamp;
        else upsert('*', {}, {});
      }
      write(store);
      return stamp;
    },

    async publishContent(page) {
      await delay();
      const store = read();
      const drafts = store.content.filter((r) => r.page_key === page && r.status === 'draft');
      if (drafts.length === 0) return;
      const stamp = now();
      store.content = store.content.filter((r) => r.page_key !== page);
      for (const draft of drafts) store.content.push({ ...draft, status: 'published', published_at: stamp, updated_at: stamp });
      write(store);
    },

    async discardContentDraft(page) {
      await delay();
      const store = read();
      store.content = store.content.filter((r) => !(r.page_key === page && r.status === 'draft'));
      write(store);
    },

    async uploadContentImage(file) {
      assertImage(file);
      const { default: imageCompression } = await import('browser-image-compression');
      // Small on purpose: localStorage holds roughly 5 MB in total.
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.08,
        maxWidthOrHeight: 1400,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      return imageCompression.getDataUrlFromFile(compressed);
    },

    async listNotes() {
      await delay();
      return read().notes.map(noteFromDbRow);
    },

    async saveNote(note, expectedUpdatedAt) {
      await delay();
      // Same rule as the database constraint notes_publishable.
      if (note.status === 'published' && noteProblems(note).length) throw new Error(noteProblems(note)[0]);
      const store = read();
      const stamp = now();
      if (note.id) {
        const existing = store.notes.find((r) => r.id === note.id);
        if (!existing) throw new Error('This note no longer exists.');
        if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) throw new ConflictError();
        if (store.notes.some((r) => r.id !== note.id && r.slug === note.slug)) {
          throw new Error('Another note already uses that page address.');
        }
        Object.assign(existing, noteToDbRow(note), { updated_at: stamp });
        write(store);
        return noteFromDbRow(existing);
      }
      if (store.notes.some((r) => r.slug === note.slug)) throw new Error('Another note already uses that page address.');
      const row: Row = { id: newId(), ...noteToDbRow(note), created_at: stamp, updated_at: stamp };
      store.notes.unshift(row);
      write(store);
      return noteFromDbRow(row);
    },

    async deleteNote(id) {
      await delay();
      const store = read();
      store.notes = store.notes.filter((r) => !(r.id === id && r.status === 'draft'));
      write(store);
    },

    async uploadDocument() {
      throw new Error('Document upload needs the Green Hill database. Paste a link to the PDF instead.');
    },

    async listEnquiries() {
      await delay();
      return read().enquiries.map(enquiryFromRow);
    },

    async createEnquiry(input: NewEnquiry) {
      await delay();
      const store = read();
      const row = insertEnquiry(store, {
        name: input.name.trim(),
        email: input.email.trim() || null,
        whatsapp: input.whatsapp.trim() || null,
        country: input.country.trim() || null,
        enquiry_type: input.enquiryType.trim() || null,
        message: input.message.trim() || null,
        source: input.source,
        opportunity_id: input.opportunityId,
        opportunity_title: input.opportunityTitle.trim() || null,
        status: input.status ?? 'new',
      });
      write(store);
      return enquiryFromRow(row);
    },

    async updateEnquiryStatus(id: string, status: EnquiryStatus) {
      await delay();
      const store = read();
      const row = store.enquiries.find((item) => item.id === id);
      if (!row) throw new Error('This enquiry no longer exists.');
      if (row.status !== status) {
        store.activity.push({
          id: newId(),
          enquiry_id: id,
          kind: 'status',
          from_status: row.status,
          to_status: status,
          created_at: now(),
        });
        row.status = status;
        row.updated_at = now();
      }
      write(store);
      return enquiryFromRow(row);
    },

    async listActivity(enquiryId: string) {
      await delay();
      return read()
        .activity.filter((item) => item.enquiry_id === enquiryId)
        .map(activityFromRow);
    },

    async addNote(enquiryId: string, body: string) {
      await delay();
      const store = read();
      const row = { id: newId(), enquiry_id: enquiryId, kind: 'note', body: body.trim(), created_at: now() };
      store.activity.push(row);
      write(store);
      return activityFromRow(row);
    },
  };
}
