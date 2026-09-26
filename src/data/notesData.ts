/**
 * Green Hill Notes — CMS-ready article model.
 *
 * Published articles live here until a CMS is connected.
 * Do not invent editorial claims or filler content.
 */

export type NotesLocale = 'en' | 'id' | 'nl' | 'es';

export type NotesTopic =
  | 'lombok'
  | 'land'
  | 'buying'
  | 'development'
  | 'hospitality'
  | 'perspective';

export interface NotesSection {
  heading?: string;
  content: string;
  image?: string;
  imageAlt?: string;
  caption?: string;
  pullQuote?: string;
}

export interface NotesTranslation {
  title: string;
  excerpt: string;
  dek?: string;
  seoTitle: string;
  seoDescription: string;
  sections: NotesSection[];
}

export interface NotesArticle {
  id: string;
  slug: string;
  topic: NotesTopic;
  /** ISO date YYYY-MM-DD when published */
  date: string | null;
  author: string;
  heroImage: string;
  heroAlt: string;
  ogImage?: string;
  featured: boolean;
  published: boolean;
  translations: Partial<Record<NotesLocale, NotesTranslation>> & { en: NotesTranslation };
}

/**
 * Resolves localized note content with English fallback.
 */
export function getNoteContent(article: NotesArticle, lang: string): NotesTranslation {
  const en = article.translations.en;
  const localized = article.translations[lang as NotesLocale];
  if (!localized) return en;
  return {
    ...en,
    ...localized,
    sections:
      localized.sections && localized.sections.length > 0 ? localized.sections : en.sections,
  };
}

/** All known notes (including unpublished drafts for future CMS). */
export const notesArticles: NotesArticle[] = [
  // Intentionally empty: no approved Green Hill editorial notes yet.
  // When CMS/content is ready, add published entries here.
];

export function getPublishedNotes(list: NotesArticle[] = notesArticles): NotesArticle[] {
  return list
    .filter((a) => a.published)
    .sort((a, b) => {
      const da = a.date ?? '';
      const db = b.date ?? '';
      return db.localeCompare(da);
    });
}

export function getFeaturedNote(list: NotesArticle[] = notesArticles): NotesArticle | null {
  return getPublishedNotes(list).find((a) => a.featured) ?? getPublishedNotes(list)[0] ?? null;
}

export function getNoteBySlug(slug: string, list: NotesArticle[] = notesArticles): NotesArticle | null {
  return list.find((a) => a.slug === slug && a.published) ?? null;
}

export function getRelatedNotes(article: NotesArticle, limit = 3, list: NotesArticle[] = notesArticles): NotesArticle[] {
  return getPublishedNotes(list)
    .filter((a) => a.id !== article.id)
    .filter((a) => a.topic === article.topic)
    .concat(getPublishedNotes(list).filter((a) => a.id !== article.id && a.topic !== article.topic))
    .slice(0, limit);
}

/** Editorial perspectives linking into existing Green Hill chapters (not empty article filters). */
export const NOTES_PERSPECTIVES = [
  { key: 'lombok', path: '/why-lombok' },
  { key: 'buying', path: '/buying-in-lombok' },
  { key: 'private', path: '/private' },
  { key: 'opportunities', path: '/properties' },
  { key: 'about', path: '/about' },
] as const;

// Legacy aliases for chart tooling comments / gradual migration
export type BlogArticle = NotesArticle;
export type ArticleTranslation = NotesTranslation;
export const blogArticles = notesArticles;
export const getArticleContent = getNoteContent;
