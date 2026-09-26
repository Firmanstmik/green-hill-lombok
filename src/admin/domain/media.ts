import { isLive, type Opportunity } from './opportunity';

/**
 * Green Hill media model.
 *
 * Every upload lands in the PRIVATE bucket `opportunity-media` and is stored on
 * the record as a private reference, e.g. `private-media:images/<uuid>.webp`.
 * A private reference is not a URL: nobody can open it without an admin
 * session (the admin sees short-lived signed URLs).
 *
 * A record is "exposed" while visitors can see it: public and live, or a
 * Green Hill Private teaser that is live. Only then:
 *  - its photographs are copied to the PUBLIC bucket `property-images`;
 *  - a brochure or masterplan Reece chose to show is copied to the PUBLIC
 *    bucket `opportunity-files`.
 * The record then points at those public URLs. When it stops being exposed,
 * or a document is no longer shown, the record goes back to private
 * references and the public copies are deleted.
 *
 * The Investment Memorandum is never made public.
 */

export const PRIVATE_BUCKET = 'opportunity-media';
export const PUBLIC_BUCKET = 'property-images';
export const FILES_BUCKET = 'opportunity-files';
export const PRIVATE_PREFIX = 'private-media:';

type PublicBucket = typeof PUBLIC_BUCKET | typeof FILES_BUCKET;
export type PublicObject = { bucket: PublicBucket; name: string };

const FOLDER: Record<PublicBucket, string> = { [PUBLIC_BUCKET]: 'images', [FILES_BUCKET]: 'documents' };

export function isPrivateRef(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PRIVATE_PREFIX);
}

export function privateRef(path: string): string {
  return `${PRIVATE_PREFIX}${path}`;
}

/** Object path inside the private bucket. */
export function privatePath(ref: string): string {
  return ref.slice(PRIVATE_PREFIX.length);
}

/** File name shared by the private original and its public copy. */
function fileName(path: string): string {
  return path.split('/').pop() ?? path;
}

export function publicBucketPrefix(supabaseUrl: string, bucket: PublicBucket = PUBLIC_BUCKET): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/`;
}

/** The public object behind a URL, or null for any other URL. */
export function publicObject(url: string, supabaseUrl: string): PublicObject | null {
  for (const bucket of [PUBLIC_BUCKET, FILES_BUCKET] as const) {
    const prefix = publicBucketPrefix(supabaseUrl, bucket);
    if (!url.startsWith(prefix)) continue;
    const name = decodeURIComponent(url.slice(prefix.length).split('?')[0]);
    return name && !name.includes('/') ? { bucket, name } : null;
  }
  return null;
}

/** Kept for callers that only care about photographs. */
export function publicName(url: string, supabaseUrl: string): string | null {
  const object = publicObject(url, supabaseUrl);
  return object?.bucket === PUBLIC_BUCKET ? object.name : null;
}

export const objectKey = (o: PublicObject) => `${o.bucket}/${o.name}`;

export function isExposed(o: Pick<Opportunity, 'visibility' | 'status' | 'privateTeaser'>): boolean {
  if (!isLive(o.status)) return false;
  return o.visibility === 'public' || (o.visibility === 'private' && Boolean(o.privateTeaser));
}

type MediaFields = Pick<Opportunity, 'images' | 'ogImage' | 'brochureUrl' | 'masterplanUrl'>;

/** Public objects an opportunity currently points at. */
export function publicObjects(o: MediaFields, supabaseUrl: string): PublicObject[] {
  return [...o.images, o.ogImage, o.brochureUrl, o.masterplanUrl]
    .map((value) => (value ? publicObject(value, supabaseUrl) : null))
    .filter((object): object is PublicObject => Boolean(object));
}

/** Photograph names only (used by older callers and tests). */
export function publicNames(o: Pick<Opportunity, 'images' | 'ogImage'>, supabaseUrl: string): string[] {
  return [...o.images, o.ogImage]
    .map((value) => (value ? publicName(value, supabaseUrl) : null))
    .filter((name): name is string => Boolean(name));
}

export type MediaPlan = {
  /** The record as it must be saved. */
  record: Opportunity;
  /** Private `<folder>/<name>` → public `<bucket>/<name>`, before the save. */
  copyToPublic: PublicObject[];
  /** Public `<bucket>/<name>` → private `<folder>/<name>` (older files), before the save. */
  copyToPrivate: PublicObject[];
  /** Public copies to delete after the save. */
  deletePublic: PublicObject[];
};

export const privateFolder = (bucket: PublicBucket) => FOLDER[bucket];

/**
 * Works out what has to happen in storage for `next` to be saved safely.
 * `previous` is the saved version (null for a new record); `shared` holds
 * `bucket/name` keys still used by OTHER exposed opportunities, which must
 * never be deleted.
 */
export function planMedia(
  next: Opportunity,
  previous: MediaFields | null,
  shared: Set<string>,
  supabaseUrl: string,
): MediaPlan {
  const exposed = isExposed(next);
  const copyToPublic = new Map<string, PublicObject>();
  const copyToPrivate = new Map<string, PublicObject>();

  /** `publish` decides whether this field may point at a public copy. */
  const convert = (value: string, bucket: PublicBucket, publish: boolean): string => {
    if (!value) return value;
    if (publish && isPrivateRef(value)) {
      const path = privatePath(value);
      if (!path.startsWith(`${FOLDER[bucket]}/`)) return value;
      const object = { bucket, name: fileName(path) };
      copyToPublic.set(objectKey(object), object);
      return publicBucketPrefix(supabaseUrl, bucket) + encodeURIComponent(object.name);
    }
    if (!publish) {
      const object = publicObject(value, supabaseUrl);
      if (object) {
        copyToPrivate.set(objectKey(object), object);
        return privateRef(`${FOLDER[object.bucket]}/${object.name}`);
      }
    }
    return value;
  };

  const disclosed = (key: 'brochure' | 'masterplan') => Boolean(next.disclosure?.[key]);
  const images = [...new Set(next.images.map((v) => convert(v, PUBLIC_BUCKET, exposed)))];
  const imageAlt: Record<string, string> = {};
  for (const [key, text] of Object.entries(next.imageAlt)) {
    const converted = convert(key, PUBLIC_BUCKET, exposed);
    if (images.includes(converted)) imageAlt[converted] = text;
  }
  const record: Opportunity = {
    ...next,
    images,
    imageAlt,
    ogImage: next.ogImage ? convert(next.ogImage, PUBLIC_BUCKET, exposed) : next.ogImage,
    brochureUrl: convert(next.brochureUrl, FILES_BUCKET, exposed && disclosed('brochure')),
    masterplanUrl: convert(next.masterplanUrl, FILES_BUCKET, exposed && disclosed('masterplan')),
    // The memorandum is never published.
    memorandumUrl: convert(next.memorandumUrl, FILES_BUCKET, false),
  };

  // Idempotent clean-up: every private reference the record holds must have
  // no public copy, and every public copy the previous version used that the
  // new version no longer uses must go.
  const keep = new Set(publicObjects(record, supabaseUrl).map(objectKey));
  const candidates = new Map<string, PublicObject>();
  const add = (object: PublicObject) => {
    const key = objectKey(object);
    if (!keep.has(key)) candidates.set(key, object);
  };
  for (const [value, bucket] of [
    ...record.images.map((v) => [v, PUBLIC_BUCKET] as const),
    [record.ogImage, PUBLIC_BUCKET] as const,
    [record.brochureUrl, FILES_BUCKET] as const,
    [record.masterplanUrl, FILES_BUCKET] as const,
    [record.memorandumUrl, FILES_BUCKET] as const,
  ]) {
    if (!isPrivateRef(value)) continue;
    const path = privatePath(value);
    if (path.startsWith(`${FOLDER[bucket]}/`)) add({ bucket, name: fileName(path) });
  }
  if (previous) publicObjects(previous, supabaseUrl).forEach(add);
  const deletePublic = [...candidates.values()].filter((object) => !shared.has(objectKey(object)));

  return { record, copyToPublic: [...copyToPublic.values()], copyToPrivate: [...copyToPrivate.values()], deletePublic };
}
