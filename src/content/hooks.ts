import { useEffect, useMemo } from 'react';
import { applyPageSeo } from '@/lib/seo';
import { useLanguage } from '@/contexts/LanguageContext';
import { getContact, type ContactSettings } from '@/lib/contact';
import { notesArticles, type NotesArticle } from '@/data/notesData';
import { contentValue, useContentState } from './ContentContext';

/**
 * Content hooks for public components. Every hook falls back to what the
 * component shows today, so nothing changes until Reece publishes an edit.
 */

/** A `cms.*` value (no shipped copy) in the visitor's language, or undefined. */
export function useContentText(key: string): string | undefined {
  const state = useContentState();
  const { language } = useLanguage();
  return contentValue(state, key, language);
}

/** An image slot: Reece's published image, or the shipped one. */
export function useContentImage(
  slot: string,
  fallback: string,
  altKey?: string,
): { src: string; alt?: string; focus?: string; custom: boolean } {
  const state = useContentState();
  const { language } = useLanguage();
  const media = state.media[slot];
  const alt = altKey ? contentValue(state, altKey, language) : undefined;
  if (media?.url && /^(https?:|data:image\/)/.test(media.url)) {
    return { src: media.url, alt, focus: media.focus, custom: true };
  }
  return { src: fallback, alt, custom: false };
}

/** Contact details, updated once published settings have loaded. */
export function useContactSettings(): ContactSettings {
  const state = useContentState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getContact(), [state]);
}

/** Notes: the published database notes, plus any still kept in code. */
export function useNotesArticles(): NotesArticle[] {
  const state = useContentState();
  return useMemo(() => {
    const fromCms = state.notes ?? [];
    const slugs = new Set(fromCms.map((note) => note.slug));
    return [...fromCms, ...notesArticles.filter((note) => !slugs.has(note.slug))];
  }, [state.notes]);
}

/**
 * Search & sharing for pages that have no SEO code of their own (Homepage,
 * Buying in Lombok). Nothing changes until Reece sets a value; page values
 * win over the site-wide defaults.
 */
export function useCmsPageSeo({ titleKey, descriptionKey, imageSlot, path }: { titleKey: string; descriptionKey: string; imageSlot: string; path: string }) {
  const state = useContentState();
  const { language } = useLanguage();
  const title = contentValue(state, titleKey, language) ?? contentValue(state, 'cms.seo.default.title', language);
  const description = contentValue(state, descriptionKey, language) ?? contentValue(state, 'cms.seo.default.description', language);
  const image = state.media[imageSlot]?.url || state.media['seo.default.image']?.url;
  useEffect(() => {
    if (!title && !description && !image) return;
    const currentDescription = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    return applyPageSeo({
      title: title ?? document.title,
      description: description ?? currentDescription,
      canonicalPath: `/${language}${path}`,
      lang: language,
      image,
    });
  }, [title, description, image, language, path]);
}
