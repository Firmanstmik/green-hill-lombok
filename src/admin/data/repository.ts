import type { Enquiry, EnquiryActivity, EnquiryStatus, NewEnquiry } from '../domain/enquiry';
import type { Opportunity } from '../domain/opportunity';
import type { DerivedValues } from '../domain/opportunityRow';
import type { ContentRow, DraftRow, NoteRecord } from '../domain/content';

export type RepositoryMode = 'supabase' | 'local';

/** Thrown when a record changed elsewhere since it was loaded. Nothing is overwritten. */
export class ConflictError extends Error {
  constructor() {
    super('This opportunity was changed somewhere else since you opened it. Reload to see the latest version.');
    this.name = 'ConflictError';
  }
}

export interface AdminRepository {
  readonly mode: RepositoryMode;

  listOpportunities(): Promise<Opportunity[]>;
  getOpportunity(id: string): Promise<Opportunity | null>;
  createOpportunity(record: Opportunity, derived: DerivedValues): Promise<Opportunity>;
  /** Optimistic concurrency: fails with ConflictError if `expectedUpdatedAt` is stale. */
  updateOpportunity(record: Opportunity, derived: DerivedValues, expectedUpdatedAt: string | null): Promise<Opportunity>;
  deleteDraft(id: string): Promise<void>;
  uploadImage(file: File): Promise<string>;
  uploadDocument(file: File): Promise<string>;
  /** Displayable URLs for stored media: private references become short-lived signed URLs. */
  resolveMedia(refs: string[]): Promise<Record<string, string>>;

  listEnquiries(): Promise<Enquiry[]>;
  createEnquiry(input: NewEnquiry): Promise<Enquiry>;
  updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<Enquiry>;
  listActivity(enquiryId: string): Promise<EnquiryActivity[]>;
  addNote(enquiryId: string, body: string): Promise<EnquiryActivity>;

  /* Structured site content (Homepage, About, … Settings). */
  /** Every draft and published row. */
  listContent(): Promise<ContentRow[]>;
  /** Saves a page's drafts; fails with ConflictError if `expectedVersion` is stale. Returns the new version. */
  saveContentDraft(page: string, rows: DraftRow[], expectedVersion: string | null): Promise<string>;
  /** Makes the page's drafts what visitors see, then removes the drafts. */
  publishContent(page: string): Promise<void>;
  /** Throws the drafts away; the published page is unchanged. */
  discardContentDraft(page: string): Promise<void>;
  /** Uploads a content or Notes image privately; returns a private reference. */
  uploadContentImage(file: File): Promise<string>;

  /* Notes from Lombok. */
  listNotes(): Promise<NoteRecord[]>;
  /** Fails with ConflictError if `expectedUpdatedAt` is stale. */
  saveNote(note: NoteRecord, expectedUpdatedAt: string | null): Promise<NoteRecord>;
  /** Only drafts can be deleted; published notes are archived instead. */
  deleteNote(id: string): Promise<void>;
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export function assertImage(file: File): void {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Use a JPEG, PNG or WebP photograph.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('That photograph is larger than 25 MB.');
}

export function assertDocument(file: File): void {
  if (file.type !== 'application/pdf') throw new Error('Documents must be PDF files.');
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('That PDF is larger than 20 MB.');
}

export function randomName(extension: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${random}.${extension}`;
}
