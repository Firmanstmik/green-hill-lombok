import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { loadLocalStore } from '@/admin/data/localLoader';
import type { NotesArticle } from '@/data/notesData';
import { setContactOverrides } from '@/lib/contact';
import { PRIVATE_BUCKET, isPrivateRef, privatePath } from '@/admin/domain/media';
import { noteFromRow, type ContentRow, type MediaValue } from './types';

/**
 * Published Green Hill content for the public site.
 *
 * Visitors only ever receive published rows (enforced by the database).
 * In the admin's preview (`?cms-preview=1`), drafts are layered on top; the
 * database only returns drafts to the admin, so the flag cannot reveal them to
 * anyone else. Without a database, the development preview reads the local
 * admin store; production builds contain no local store at all.
 */
export type ContentState = {
  /** locale → key → value ('*' holds values shared by every language). */
  fields: Record<string, Record<string, string>>;
  media: Record<string, MediaValue>;
  notes: NotesArticle[] | null;
  preview: boolean;
  loaded: boolean;
};

const EMPTY: ContentState = { fields: {}, media: {}, notes: null, preview: false, loaded: false };

const ContentContext = createContext<ContentState>(EMPTY);

const PREVIEW_FLAG = 'gh-cms-preview';

export function isContentPreview(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('cms-preview');
    if (param === '1') sessionStorage.setItem(PREVIEW_FLAG, '1');
    return param === '1' || sessionStorage.getItem(PREVIEW_FLAG) === '1';
  } catch {
    return false;
  }
}

/** Merge rows: published first, then (preview only) drafts on top. */
export function mergeRows(rows: ContentRow[], preview: boolean): Pick<ContentState, 'fields' | 'media'> {
  const fields: Record<string, Record<string, string>> = {};
  const media: Record<string, MediaValue> = {};
  const ordered = [...rows.filter((r) => r.status === 'published'), ...(preview ? rows.filter((r) => r.status === 'draft') : [])];
  const draftPages = new Set(preview ? rows.filter((r) => r.status === 'draft').map((r) => r.page) : []);
  for (const row of ordered) {
    // A page's draft replaces that page's published values entirely (including cleared fields).
    if (row.status === 'published' && draftPages.has(row.page)) continue;
    fields[row.locale] = { ...(fields[row.locale] ?? {}), ...row.fields };
    if (row.locale === '*') Object.assign(media, row.media);
  }
  return { fields, media };
}

/**
 * Preview only: draft images are still private. Sign them for the admin
 * (storage policies refuse anyone else, so a visitor gets nothing).
 */
async function signPreviewImages<T>(value: T): Promise<T> {
  const refs = new Set<string>();
  JSON.stringify(value, (_key, v) => {
    if (typeof v === 'string' && isPrivateRef(v)) refs.add(v);
    return v;
  });
  if (!refs.size) return value;
  const list = [...refs];
  const { data } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrls(list.map(privatePath), 3600);
  const signed = new Map<string, string>();
  (data ?? []).forEach((item, index) => {
    if (item.signedUrl) signed.set(list[index], item.signedUrl);
  });
  return JSON.parse(JSON.stringify(value), (_key, v) => (typeof v === 'string' && isPrivateRef(v) ? signed.get(v) ?? '' : v)) as T;
}

async function loadRows(preview: boolean): Promise<{ rows: ContentRow[]; notes: NotesArticle[] }> {
  if (isSupabaseConfigured) {
    const statuses = preview ? ['published', 'draft'] : ['published'];
    const [content, notes] = await Promise.all([
      supabase.from('site_content').select('page_key, locale, status, fields, media').in('status', statuses),
      supabase.from('notes').select('id, slug, status, topic, published_on, author, featured, cover_image, cover_alt, og_image, translations').in('status', preview ? ['published', 'draft'] : ['published']),
    ]);
    const rows: ContentRow[] = (content.data ?? []).map((r: Record<string, unknown>) => ({
      page: String(r.page_key),
      locale: String(r.locale),
      status: r.status === 'draft' ? 'draft' : 'published',
      fields: (r.fields as Record<string, string>) ?? {},
      media: (r.media as Record<string, MediaValue>) ?? {},
    }));
    const list = (notes.data ?? []).map((r: Record<string, unknown>) => noteFromRow(r, preview));
    if (preview) return signPreviewImages({ rows, notes: list });
    return { rows, notes: list };
  }
  if (loadLocalStore) {
    const { localContentRows, localNoteRows } = await loadLocalStore();
    return { rows: localContentRows(), notes: localNoteRows().map((r) => noteFromRow(r, preview)) };
  }
  return { rows: [], notes: [] };
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContentState>(EMPTY);

  useEffect(() => {
    let active = true;
    const preview = isContentPreview();
    loadRows(preview)
      .then(({ rows, notes }) => {
        if (!active) return;
        const merged = mergeRows(rows, preview);
        setContactOverrides(merged.fields['*'] ?? {}, merged.fields);
        setState({
          ...merged,
          notes: notes.filter((note) => note.published),
          preview,
          loaded: true,
        });
      })
      .catch(() => {
        // Content is additive: without it the approved shipped copy is shown.
        if (active) setState((current) => ({ ...current, loaded: true }));
      });
    return () => {
      active = false;
    };
  }, []);

  return <ContentContext.Provider value={state}>{children}</ContentContext.Provider>;
}

export function useContentState(): ContentState {
  return useContext(ContentContext);
}

/** Value Reece set for `key` in `locale` (or shared), if any. */
export function contentValue(state: ContentState, key: string, locale: string): string | undefined {
  const own = state.fields[locale]?.[key];
  if (own !== undefined && own !== '') return own;
  const shared = state.fields['*']?.[key];
  if (shared !== undefined && shared !== '') return shared;
  return undefined;
}
