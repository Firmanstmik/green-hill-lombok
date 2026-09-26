import { supabase, supabaseUrl } from '@/lib/supabase';
import {
  activityFromRow,
  enquiryFromRow,
  type Enquiry,
  type EnquiryActivity,
  type EnquiryStatus,
  type NewEnquiry,
} from '../domain/enquiry';
import {
  PRIVATE_BUCKET,
  isExposed,
  isPrivateRef,
  objectKey,
  planMedia,
  privateFolder,
  privatePath,
  privateRef,
  publicObjects,
  type PublicObject,
} from '../domain/media';
import { LIVE_STATUSES, withLifecycle, type Opportunity } from '../domain/opportunity';
import {
  CONTENT_FOLDER,
  SITE_BUCKET,
  convertImage,
  mapNoteImages,
  noteFromDbRow,
  noteToDbRow,
  siteNamesIn,
  type ContentRow,
  type MediaValue,
  type NoteRecord,
} from '../domain/content';
import { fromRow, toRow, type DerivedValues } from '../domain/opportunityRow';
import {
  ConflictError,
  assertDocument,
  assertImage,
  randomName,
  type AdminRepository,
} from './repository';

function fail(error: { message?: string; code?: string } | null, fallback: string): never {
  if (error?.code === '23505') throw new Error('That URL slug is already used by another opportunity.');
  throw new Error(error?.message || fallback);
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

const MEDIA_COLUMNS = 'id, visibility, status, private_teaser, images, og_image, brochure_url, masterplan_url';

/** `bucket/name` keys of public copies used by OTHER exposed opportunities. */
async function sharedPublicKeys(exceptId: string | null): Promise<Set<string>> {
  let query = supabase.from('properties').select(MEDIA_COLUMNS).in('status', LIVE_STATUSES);
  if (exceptId) query = query.neq('id', exceptId);
  const { data, error } = await query;
  if (error) fail(error, 'Could not check which files are in use.');
  const keys = new Set<string>();
  for (const row of data ?? []) {
    const other = fromRow(row as Record<string, unknown>);
    if (!isExposed(other)) continue;
    publicObjects(other, supabaseUrl).forEach((object) => keys.add(objectKey(object)));
  }
  return keys;
}

function isAlreadyThere(error: { message?: string } | null): boolean {
  return Boolean(error && /exists|duplicate/i.test(error.message ?? ''));
}

/**
 * Makes storage match the record BEFORE it is saved, so a public page never
 * points at a missing file and a hidden record never points at a public one.
 * Returns the record to save and the public copies to remove afterwards.
 */
async function prepareMedia(record: Opportunity) {
  let previous: Opportunity | null = null;
  if (record.id) {
    const { data, error } = await supabase.from('properties').select(MEDIA_COLUMNS).eq('id', record.id).maybeSingle();
    if (error) fail(error, 'Could not load this opportunity.');
    previous = data ? fromRow(data as Record<string, unknown>) : null;
  }
  let plan = planMedia(record, previous, new Set(), supabaseUrl);
  if (plan.deletePublic.length > 0) plan = planMedia(record, previous, await sharedPublicKeys(record.id), supabaseUrl);

  for (const object of plan.copyToPrivate) {
    const { error } = await supabase.storage
      .from(object.bucket)
      .copy(object.name, `${privateFolder(object.bucket)}/${object.name}`, { destinationBucket: PRIVATE_BUCKET });
    if (error && !isAlreadyThere(error)) fail(error, 'Could not move a file to private storage.');
  }
  for (const object of plan.copyToPublic) {
    const { error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .copy(`${privateFolder(object.bucket)}/${object.name}`, object.name, { destinationBucket: object.bucket });
    if (error && !isAlreadyThere(error)) fail(error, 'Could not publish a file.');
  }
  return plan;
}

/** After the save: the record no longer points at these, so remove the public copies. */
async function removePublicCopies(objects: PublicObject[]) {
  const byBucket = new Map<string, string[]>();
  for (const object of objects) byBucket.set(object.bucket, [...(byBucket.get(object.bucket) ?? []), object.name]);
  for (const [bucket, names] of byBucket) {
    const { error } = await supabase.storage.from(bucket).remove(names);
    if (error) {
      throw new Error('Saved, but some public copies could not be removed. Save again to retry.');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Site content and Notes images                                        */
/* ------------------------------------------------------------------ */

async function copyToSite(names: Set<string>) {
  for (const name of names) {
    const { error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .copy(`${CONTENT_FOLDER}/${name}`, name, { destinationBucket: SITE_BUCKET });
    if (error && !isAlreadyThere(error)) fail(error, 'Could not publish an image.');
  }
}

async function copyToPrivate(names: Set<string>) {
  for (const name of names) {
    const { error } = await supabase.storage
      .from(SITE_BUCKET)
      .copy(name, `${CONTENT_FOLDER}/${name}`, { destinationBucket: PRIVATE_BUCKET });
    if (error && !isAlreadyThere(error)) fail(error, 'Could not move an image to private storage.');
  }
}

/** Remove public copies nothing published refers to any more. */
async function removeUnusedSiteImages(candidates: string[]) {
  if (candidates.length === 0) return;
  const [content, notes] = await Promise.all([
    supabase.from('site_content').select('media, fields').eq('status', 'published'),
    supabase.from('notes').select('cover_image, og_image, translations').eq('status', 'published'),
  ]);
  if (content.error || notes.error) return; // never delete when unsure
  const used = new Set(siteNamesIn([content.data, notes.data], supabaseUrl));
  const unused = [...new Set(candidates)].filter((name) => !used.has(name));
  if (unused.length) await supabase.storage.from(SITE_BUCKET).remove(unused);
}

function contentRowFromDb(r: Record<string, unknown>): ContentRow {
  return {
    page: String(r.page_key),
    locale: String(r.locale),
    status: r.status === 'draft' ? 'draft' : 'published',
    fields: (r.fields as Record<string, string>) ?? {},
    media: (r.media as Record<string, MediaValue>) ?? {},
    updatedAt: (r.updated_at as string) ?? null,
    publishedAt: (r.published_at as string) ?? null,
  };
}

function conflictOr(error: { message?: string; code?: string } | null, fallback: string): never {
  if (error?.code === '40001' || /changed somewhere else/i.test(error?.message ?? '')) throw new ConflictError();
  fail(error, fallback);
}

const SIGNED_SECONDS = 60 * 60;
const signed = new Map<string, { url: string; until: number }>();

export function createSupabaseRepository(): AdminRepository {
  return {
    mode: 'supabase',

    async listOpportunities() {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) fail(error, 'Could not load opportunities.');
      return (data ?? []).map((row) => fromRow(row as Record<string, unknown>));
    },

    async getOpportunity(id) {
      const { data, error } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
      if (error) fail(error, 'Could not load this opportunity.');
      return data ? fromRow(data as Record<string, unknown>) : null;
    },

    async createOpportunity(record, derived) {
      const plan = await prepareMedia(withLifecycle(record));
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from('properties')
        .insert({ ...toRow(plan.record, derived), user_id: userId, updated_by: userId })
        .select('*')
        .single();
      if (error) fail(error, 'Could not save this opportunity.');
      await removePublicCopies(plan.deletePublic);
      return fromRow(data as Record<string, unknown>);
    },

    async updateOpportunity(record, derived, expectedUpdatedAt) {
      if (!record.id) throw new Error('This opportunity has not been saved yet.');
      const plan = await prepareMedia(withLifecycle(record));
      const userId = await currentUserId();
      let query = supabase
        .from('properties')
        .update({ ...toRow(plan.record, derived), updated_by: userId })
        .eq('id', record.id);
      if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt);
      const { data, error } = await query.select('*').maybeSingle();
      if (error) fail(error, 'Could not save this opportunity.');
      if (!data) throw new ConflictError();
      await removePublicCopies(plan.deletePublic);
      return fromRow(data as Record<string, unknown>);
    },

    async deleteDraft(id) {
      const { error } = await supabase.from('properties').delete().eq('id', id).eq('status', 'draft');
      if (error) fail(error, 'Could not delete this draft.');
    },

    async resolveMedia(refs) {
      const now = Date.now();
      const out: Record<string, string> = {};
      const missing: string[] = [];
      for (const ref of new Set(refs)) {
        if (!isPrivateRef(ref)) {
          out[ref] = ref;
          continue;
        }
        const hit = signed.get(ref);
        if (hit && hit.until > now) out[ref] = hit.url;
        else missing.push(ref);
      }
      if (missing.length > 0) {
        const { data, error } = await supabase.storage
          .from(PRIVATE_BUCKET)
          .createSignedUrls(missing.map(privatePath), SIGNED_SECONDS);
        if (error) fail(error, 'Could not open private media.');
        for (const [index, item] of (data ?? []).entries()) {
          if (!item.signedUrl) continue;
          const ref = missing[index];
          // Re-signed well before it expires.
          signed.set(ref, { url: item.signedUrl, until: now + (SIGNED_SECONDS - 600) * 1000 });
          out[ref] = item.signedUrl;
        }
      }
      return out;
    },

    async uploadImage(file) {
      assertImage(file);
      // Loaded on first upload so the admin shell stays light.
      const { default: imageCompression } = await import('browser-image-compression');
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const path = `images/${randomName('webp')}`;
      const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, compressed, {
        contentType: 'image/webp',
        cacheControl: '31536000',
      });
      if (error) fail(error, 'Could not upload this photograph.');
      return privateRef(path);
    },

    async uploadDocument(file) {
      assertDocument(file);
      const path = `documents/${randomName('pdf')}`;
      const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, file, {
        contentType: 'application/pdf',
      });
      if (error) fail(error, 'Could not upload this document.');
      return privateRef(path);
    },

    async listContent() {
      const { data, error } = await supabase.from('site_content').select('*');
      if (error) fail(error, 'Could not load the site content.');
      return (data ?? []).map((row) => contentRowFromDb(row as Record<string, unknown>));
    },

    async saveContentDraft(page, rows, expectedVersion) {
      const { data, error } = await supabase.rpc('save_content_draft', {
        p_page: page,
        p_rows: rows,
        p_expected: expectedVersion,
      });
      if (error) conflictOr(error, 'Could not save this page.');
      return String(data);
    },

    async publishContent(page) {
      const { data, error } = await supabase
        .from('site_content')
        .select('status, media')
        .eq('page_key', page)
        .eq('locale', '*');
      if (error) fail(error, 'Could not load this page.');
      const draft = (data ?? []).find((r) => r.status === 'draft');
      const published = (data ?? []).find((r) => r.status === 'published');
      const media: Record<string, MediaValue> = {};
      const toPublic = new Set<string>();
      for (const [slot, value] of Object.entries((draft?.media as Record<string, MediaValue>) ?? {})) {
        if (!value?.url) continue;
        media[slot] = { ...value, url: convertImage(value.url, true, supabaseUrl, toPublic, new Set()) };
      }
      await copyToSite(toPublic);
      const { error: publishError } = await supabase.rpc('publish_content', { p_page: page, p_media: media });
      if (publishError) fail(publishError, 'Could not publish this page.');
      await removeUnusedSiteImages(siteNamesIn(published?.media, supabaseUrl));
    },

    async discardContentDraft(page) {
      const { error } = await supabase.from('site_content').delete().eq('page_key', page).eq('status', 'draft');
      if (error) fail(error, 'Could not discard the draft.');
    },

    async uploadContentImage(file) {
      assertImage(file);
      const { default: imageCompression } = await import('browser-image-compression');
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.9,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const path = `${CONTENT_FOLDER}/${randomName('webp')}`;
      const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, compressed, {
        contentType: 'image/webp',
        cacheControl: '31536000',
      });
      if (error) fail(error, 'Could not upload this image.');
      return privateRef(path);
    },

    async listNotes() {
      const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
      if (error) fail(error, 'Could not load Notes.');
      return (data ?? []).map((row) => noteFromDbRow(row as Record<string, unknown>));
    },

    async saveNote(note, expectedUpdatedAt) {
      const previous = note.id
        ? await supabase.from('notes').select('cover_image, og_image, translations').eq('id', note.id).maybeSingle()
        : null;
      const toPublic = new Set<string>();
      const toPrivate = new Set<string>();
      const publish = note.status === 'published';
      const prepared = mapNoteImages(note, (value) => convertImage(value, publish, supabaseUrl, toPublic, toPrivate));
      if (publish) await copyToSite(toPublic);
      else await copyToPrivate(toPrivate);

      const userId = await currentUserId();
      const row = { ...noteToDbRow(prepared), updated_by: userId };
      let saved;
      if (note.id) {
        let query = supabase.from('notes').update(row).eq('id', note.id);
        if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt);
        saved = await query.select('*').maybeSingle();
        if (saved.error) fail(saved.error, 'Could not save this note.');
        if (!saved.data) throw new ConflictError();
      } else {
        saved = await supabase.from('notes').insert(row).select('*').single();
        if (saved.error) {
          if (saved.error.code === '23505') throw new Error('Another note already uses that page address.');
          fail(saved.error, 'Could not save this note.');
        }
      }
      // Images the previous version published that this version no longer shows publicly.
      const before = siteNamesIn(previous?.data, supabaseUrl);
      const now = new Set(publish ? siteNamesIn(noteToDbRow(prepared), supabaseUrl) : []);
      await removeUnusedSiteImages(before.filter((name) => !now.has(name)));
      return noteFromDbRow(saved.data as Record<string, unknown>);
    },

    async deleteNote(id) {
      const { error } = await supabase.from('notes').delete().eq('id', id).eq('status', 'draft');
      if (error) fail(error, 'Could not delete this note.');
    },

    async listEnquiries() {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) fail(error, 'Could not load enquiries.');
      return (data ?? []).map((row) => enquiryFromRow(row as Record<string, unknown>));
    },

    async createEnquiry(input: NewEnquiry): Promise<Enquiry> {
      const { data, error } = await supabase
        .from('enquiries')
        .insert({
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
        })
        .select('*')
        .single();
      if (error) fail(error, 'Could not record this enquiry.');
      return enquiryFromRow(data as Record<string, unknown>);
    },

    async updateEnquiryStatus(id: string, status: EnquiryStatus) {
      const { data, error } = await supabase
        .from('enquiries')
        .update({ status })
        .eq('id', id)
        .select('*')
        .single();
      if (error) fail(error, 'Could not update this enquiry.');
      return enquiryFromRow(data as Record<string, unknown>);
    },

    async listActivity(enquiryId: string): Promise<EnquiryActivity[]> {
      const { data, error } = await supabase
        .from('enquiry_activity')
        .select('*')
        .eq('enquiry_id', enquiryId)
        .order('created_at', { ascending: true });
      if (error) fail(error, 'Could not load the history of this enquiry.');
      return (data ?? []).map((row) => activityFromRow(row as Record<string, unknown>));
    },

    async addNote(enquiryId: string, body: string) {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from('enquiry_activity')
        .insert({ enquiry_id: enquiryId, kind: 'note', body: body.trim(), created_by: userId })
        .select('*')
        .single();
      if (error) fail(error, 'Could not save this note.');
      return activityFromRow(data as Record<string, unknown>);
    },
  };
}
