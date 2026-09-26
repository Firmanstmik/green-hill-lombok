import type { NotesLocale, NotesTopic } from '@/data/notesData';
import type { ContentRow, MediaValue } from '@/content/types';
import { isPrivateRef, privatePath, privateRef } from './media';

/**
 * Admin model for structured content and Notes.
 *
 * Images for content and Notes are uploaded privately (`private-media:content/<name>`)
 * and copied to the public `site-media` bucket only when the page or note is
 * published. Unpublishing or replacing an image removes its public copy.
 */
export const SITE_BUCKET = 'site-media';
export const CONTENT_FOLDER = 'content';

export type { ContentRow, MediaValue };

export type DraftRow = { locale: string; fields: Record<string, string>; media?: Record<string, MediaValue> };

export const NOTE_TOPICS: { value: NotesTopic; label: string }[] = [
  { value: 'lombok', label: 'Lombok' },
  { value: 'land', label: 'Land' },
  { value: 'buying', label: 'Buying' },
  { value: 'development', label: 'Development' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'perspective', label: 'Perspective' },
];

export type NoteSection = { heading: string; content: string; image: string; imageAlt: string; caption: string; pullQuote: string };
export type NoteText = { title: string; excerpt: string; dek: string; seoTitle: string; seoDescription: string; sections: NoteSection[] };
export type NoteStatus = 'draft' | 'published' | 'archived';

export interface NoteRecord {
  id: string | null;
  slug: string;
  status: NoteStatus;
  topic: NotesTopic;
  publishedOn: string;
  author: string;
  featured: boolean;
  coverImage: string;
  coverAlt: string;
  ogImage: string;
  translations: Partial<Record<NotesLocale, NoteText>> & { en: NoteText };
  updatedAt: string | null;
}

export const emptySection = (): NoteSection => ({ heading: '', content: '', image: '', imageAlt: '', caption: '', pullQuote: '' });
export const emptyText = (): NoteText => ({ title: '', excerpt: '', dek: '', seoTitle: '', seoDescription: '', sections: [emptySection()] });

export function emptyNote(): NoteRecord {
  return {
    id: null,
    slug: '',
    status: 'draft',
    topic: 'perspective',
    publishedOn: '',
    author: 'Reece Green',
    featured: false,
    coverImage: '',
    coverAlt: '',
    ogImage: '',
    translations: { en: emptyText() },
    updatedAt: null,
  };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

function textFrom(value: unknown): NoteText {
  const t = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const sections = Array.isArray(t.sections) ? (t.sections as Record<string, unknown>[]) : [];
  return {
    title: str(t.title),
    excerpt: str(t.excerpt),
    dek: str(t.dek),
    seoTitle: str(t.seoTitle),
    seoDescription: str(t.seoDescription),
    sections: sections.map((s) => ({
      heading: str(s.heading),
      content: str(s.content),
      image: str(s.image),
      imageAlt: str(s.imageAlt),
      caption: str(s.caption),
      pullQuote: str(s.pullQuote),
    })),
  };
}

export function noteFromDbRow(row: Record<string, unknown>): NoteRecord {
  const raw = (row.translations && typeof row.translations === 'object' ? row.translations : {}) as Record<string, unknown>;
  const translations: NoteRecord['translations'] = { en: textFrom(raw.en) };
  for (const locale of ['id', 'nl', 'es'] as NotesLocale[]) if (raw[locale]) translations[locale] = textFrom(raw[locale]);
  const status = str(row.status);
  return {
    id: str(row.id) || null,
    slug: str(row.slug),
    status: status === 'published' || status === 'archived' ? status : 'draft',
    topic: (NOTE_TOPICS.find((t) => t.value === row.topic)?.value ?? 'perspective') as NotesTopic,
    publishedOn: str(row.published_on),
    author: str(row.author) || 'Reece Green',
    featured: row.featured === true,
    coverImage: str(row.cover_image),
    coverAlt: str(row.cover_alt),
    ogImage: str(row.og_image),
    translations,
    updatedAt: str(row.updated_at) || null,
  };
}

export function noteToDbRow(note: NoteRecord): Record<string, unknown> {
  const translations: Record<string, unknown> = {};
  for (const [locale, text] of Object.entries(note.translations)) {
    if (!text || (locale !== 'en' && !text.title.trim())) continue;
    translations[locale] = {
      ...text,
      title: text.title.trim(),
      sections: text.sections.filter((s) => s.heading.trim() || s.content.trim() || s.image || s.pullQuote.trim()),
    };
  }
  return {
    slug: note.slug.trim(),
    status: note.status,
    topic: note.topic,
    published_on: note.publishedOn || null,
    author: note.author.trim() || 'Reece Green',
    featured: note.featured,
    cover_image: note.coverImage || null,
    cover_alt: note.coverAlt.trim() || null,
    og_image: note.ogImage || null,
    translations,
  };
}

/** What must be true before a note can be published. */
export function noteProblems(note: NoteRecord): string[] {
  const problems: string[] = [];
  if (!note.translations.en.title.trim()) problems.push('Add an English title.');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(note.slug)) problems.push('Add a page address (lowercase words joined by hyphens).');
  if (!note.translations.en.excerpt.trim()) problems.push('Add a short English summary (shown in the Notes list).');
  if (!note.translations.en.sections.some((s) => s.content.trim())) problems.push('Write at least one paragraph in English.');
  if (!note.coverImage) problems.push('Add a cover photograph.');
  else if (!note.coverAlt.trim()) problems.push('Describe the cover photograph for screen readers.');
  return problems;
}

/* ------------------------------------------------------------------ */
/* Public copies of content images                                      */
/* ------------------------------------------------------------------ */

export function sitePrefix(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${SITE_BUCKET}/`;
}

export function siteName(url: string, supabaseUrl: string): string | null {
  const prefix = sitePrefix(supabaseUrl);
  if (!url.startsWith(prefix)) return null;
  const name = decodeURIComponent(url.slice(prefix.length).split('?')[0]);
  return name && !name.includes('/') ? name : null;
}

const fileName = (path: string) => path.split('/').pop() ?? path;

/**
 * Publish: private references become public URLs (files to copy first).
 * Unpublish: public URLs become private references (copy back if needed).
 */
export function convertImage(
  value: string,
  publish: boolean,
  supabaseUrl: string,
  toPublic: Set<string>,
  toPrivate: Set<string>,
): string {
  if (!value) return value;
  if (publish && isPrivateRef(value) && privatePath(value).startsWith(`${CONTENT_FOLDER}/`)) {
    const name = fileName(privatePath(value));
    toPublic.add(name);
    return sitePrefix(supabaseUrl) + encodeURIComponent(name);
  }
  if (!publish) {
    const name = siteName(value, supabaseUrl);
    if (name) {
      toPrivate.add(name);
      return privateRef(`${CONTENT_FOLDER}/${name}`);
    }
  }
  return value;
}

/** Every public site-media file an object refers to (for clean-up). */
export function siteNamesIn(value: unknown, supabaseUrl: string): string[] {
  const text = JSON.stringify(value ?? '');
  const prefix = sitePrefix(supabaseUrl).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return [...text.matchAll(new RegExp(`${prefix}([^"?\\\\/]+)`, 'g'))].map((m) => decodeURIComponent(m[1]));
}

export function mapNoteImages(note: NoteRecord, convert: (value: string) => string): NoteRecord {
  const translations = Object.fromEntries(
    Object.entries(note.translations).map(([locale, text]) => [
      locale,
      text ? { ...text, sections: text.sections.map((s) => ({ ...s, image: convert(s.image) })) } : text,
    ]),
  ) as NoteRecord['translations'];
  return { ...note, coverImage: convert(note.coverImage), ogImage: convert(note.ogImage), translations };
}
