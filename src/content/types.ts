import type { NotesArticle, NotesLocale, NotesTopic, NotesTranslation } from '@/data/notesData';

/** One stored row of site content (see supabase/migrations/20260927_green_hill_content.sql). */
export type ContentRow = {
  page: string;
  /** 'en' | 'id' | 'nl' | 'es', or '*' for values shared by every language. */
  locale: string;
  status: 'draft' | 'published';
  fields: Record<string, string>;
  media: Record<string, MediaValue>;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

/** An image in a content slot. `focus` is a CSS object-position, e.g. "50% 40%". */
export type MediaValue = { url: string; focus?: string };

const TOPICS: NotesTopic[] = ['lombok', 'land', 'buying', 'development', 'hospitality', 'perspective'];

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function translation(value: unknown): NotesTranslation {
  const t = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const sections = Array.isArray(t.sections) ? (t.sections as Record<string, unknown>[]) : [];
  return {
    title: text(t.title),
    excerpt: text(t.excerpt),
    dek: text(t.dek) || undefined,
    seoTitle: text(t.seoTitle),
    seoDescription: text(t.seoDescription),
    sections: sections.map((section) => ({
      heading: text(section.heading) || undefined,
      content: text(section.content),
      image: text(section.image) || undefined,
      imageAlt: text(section.imageAlt) || undefined,
      caption: text(section.caption) || undefined,
      pullQuote: text(section.pullQuote) || undefined,
    })),
  };
}

/**
 * A stored note in the shape the public Notes pages already use.
 * In the admin preview, drafts count as published so they can be previewed.
 */
export function noteFromRow(row: Record<string, unknown>, preview = false): NotesArticle {
  const raw = (row.translations && typeof row.translations === 'object' ? row.translations : {}) as Record<string, unknown>;
  const translations: Partial<Record<NotesLocale, NotesTranslation>> = {};
  for (const locale of ['en', 'id', 'nl', 'es'] as NotesLocale[]) {
    if (raw[locale] && text((raw[locale] as Record<string, unknown>).title)) translations[locale] = translation(raw[locale]);
  }
  const status = text(row.status);
  return {
    id: text(row.id),
    slug: text(row.slug),
    topic: TOPICS.includes(row.topic as NotesTopic) ? (row.topic as NotesTopic) : 'perspective',
    date: text(row.published_on) || null,
    author: text(row.author) || 'Reece Green',
    heroImage: text(row.cover_image),
    heroAlt: text(row.cover_alt),
    ogImage: text(row.og_image) || undefined,
    featured: row.featured === true,
    published: status === 'published' || (preview && status === 'draft'),
    translations: { ...translations, en: translations.en ?? translation({ title: text(row.slug) }) },
  };
}
