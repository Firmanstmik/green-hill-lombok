import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isValidEmail, isValidHttpsUrl, isValidWhatsApp } from '@/lib/contact';
import { CONTENT_LOCALES, allFields, type ContentLocale, type FieldDef, type PageDef } from '@/content/schema';
import { originalValue } from '@/content/originals';
import type { ContentRow, DraftRow, MediaValue } from '../domain/content';
import { useContentActions, useContentRows } from '../data/queries';
import { ConflictError } from '../data/repository';

/**
 * Editing model for a structured content page.
 *
 * - Only differences from the shipped copy are stored ("overrides").
 *   Typing the original text back, or "Restore original", removes the override.
 * - Changes autosave as a draft. Drafts are never visible to visitors.
 * - Publish makes the draft what visitors see.
 * - Every save carries the draft version it started from; if the page was
 *   changed elsewhere the save is refused instead of overwriting it.
 */
export type Values = Record<string, Record<string, string>>;
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';
export type PageStatus = 'original' | 'published' | 'changes';

const AUTOSAVE_MS = 1500;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fromRows(rows: ContentRow[]): { values: Values; media: Record<string, MediaValue> } {
  const values: Values = {};
  let media: Record<string, MediaValue> = {};
  for (const row of rows) {
    values[row.locale] = { ...row.fields };
    if (row.locale === '*') media = { ...row.media };
  }
  return { values, media };
}

export function fieldLocale(field: FieldDef, locale: ContentLocale): string {
  return field.shared ? '*' : locale;
}

export function useContentEditor(page: PageDef) {
  const rows = useContentRows();
  const actions = useContentActions();
  const [values, setValues] = useState<Values>({});
  const [media, setMedia] = useState<Record<string, MediaValue>>({});
  const [version, setVersion] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');
  const [initialised, setInitialised] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const pending = useRef(false);
  const saving = useRef<Promise<void> | null>(null);
  const latest = useRef({ values, media, version });
  latest.current = { values, media, version };

  const pageRows = useMemo(() => (rows.data ?? []).filter((r) => r.page === page.key), [rows.data, page.key]);
  const published = useMemo(() => pageRows.filter((r) => r.status === 'published'), [pageRows]);
  const drafts = useMemo(() => pageRows.filter((r) => r.status === 'draft'), [pageRows]);

  const reset = useCallback(() => {
    const source = drafts.length ? drafts : published;
    const loaded = fromRows(source);
    setValues(loaded.values);
    setMedia(loaded.media);
    setVersion(drafts.find((r) => r.locale === '*')?.updatedAt ?? null);
    setHasDraft(drafts.length > 0);
    setLastSaved(drafts.find((r) => r.locale === '*')?.updatedAt ?? null);
    setState('idle');
    pending.current = false;
  }, [drafts, published]);

  useEffect(() => {
    if (!rows.data || initialised) return;
    reset();
    setInitialised(true);
  }, [rows.data, initialised, reset]);

  const save = useCallback(async () => {
    if (saving.current) await saving.current.catch(() => undefined);
    if (!pending.current) return;
    pending.current = false;
    const { values: v, media: m, version: expected } = latest.current;
    const payload: DraftRow[] = Object.entries(v).map(([locale, fields]) => ({
      locale,
      fields,
      ...(locale === '*' ? { media: m } : {}),
    }));
    if (!payload.some((row) => row.locale === '*')) payload.push({ locale: '*', fields: {}, media: m });
    setState('saving');
    const run = (async () => {
      try {
        const next = await actions.save(page.key, payload, expected);
        latest.current.version = next;
        setVersion(next);
        setHasDraft(true);
        setLastSaved(next);
        setState(pending.current ? 'dirty' : 'saved');
      } catch (error) {
        if (error instanceof ConflictError) {
          setState('conflict');
          setMessage(error.message);
        } else {
          pending.current = true;
          setState('error');
          setMessage(error instanceof Error ? error.message : 'Could not save.');
        }
      }
    })();
    saving.current = run;
    await run;
    saving.current = null;
  }, [actions, page.key]);

  // Autosave drafts a moment after the last change.
  useEffect(() => {
    if (state !== 'dirty') return;
    const timer = window.setTimeout(() => void save(), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [state, values, media, save]);

  // Moving to another admin screen saves a pending change instead of dropping it.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(
    () => () => {
      if (pending.current) void saveRef.current();
    },
    [],
  );

  // Warn before leaving with an unsaved change.
  useEffect(() => {
    if (state !== 'dirty' && state !== 'saving' && state !== 'error') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state]);

  const touch = () => {
    pending.current = true;
    setState((current) => (current === 'conflict' ? current : 'dirty'));
  };

  /** The value shown in the editor: Reece's text, or the shipped original. */
  const valueOf = useCallback(
    (field: FieldDef, locale: ContentLocale) => {
      const loc = fieldLocale(field, locale);
      return values[loc]?.[field.key] ?? originalValue(field.key, loc as ContentLocale | '*');
    },
    [values],
  );

  const isCustom = useCallback(
    (field: FieldDef, locale: ContentLocale) => values[fieldLocale(field, locale)]?.[field.key] !== undefined,
    [values],
  );

  const setField = useCallback((field: FieldDef, locale: ContentLocale, value: string) => {
    const loc = fieldLocale(field, locale);
    const original = originalValue(field.key, loc as ContentLocale | '*');
    setValues((current) => {
      const next = clone(current);
      next[loc] = { ...(next[loc] ?? {}) };
      // Typing the original back, or clearing a field that has an original, restores it.
      if (value === original || (value.trim() === '' && original !== '')) delete next[loc][field.key];
      else next[loc][field.key] = value;
      return next;
    });
    touch();
  }, []);

  const restoreField = useCallback((field: FieldDef, locale: ContentLocale) => {
    const loc = fieldLocale(field, locale);
    setValues((current) => {
      const next = clone(current);
      if (next[loc]) delete next[loc][field.key];
      return next;
    });
    touch();
  }, []);

  const setImage = useCallback((slot: string, value: MediaValue | null) => {
    setMedia((current) => {
      const next = { ...current };
      if (value) next[slot] = value;
      else delete next[slot];
      return next;
    });
    touch();
  }, []);

  /** English was changed but this language still shows the older translation. */
  const needsTranslation = useCallback(
    (field: FieldDef, locale: ContentLocale) =>
      !field.shared && locale !== 'en' && values.en?.[field.key] !== undefined && values[locale]?.[field.key] === undefined,
    [values],
  );

  const translationCounts = useMemo(() => {
    const fields = allFields(page);
    return Object.fromEntries(
      CONTENT_LOCALES.map((locale) => [locale, fields.filter((f) => needsTranslation(f, locale)).length]),
    ) as Record<ContentLocale, number>;
  }, [page, needsTranslation]);

  /** Problems that block publishing (checked in English and shared values). */
  const problems = useMemo(() => {
    const list: { key: string; label: string; message: string }[] = [];
    for (const field of allFields(page)) {
      const value = valueOf(field, 'en').trim();
      if (field.required && !value) list.push({ key: field.key, label: field.label, message: 'is required' });
      if (!value) continue;
      if (field.kind === 'email' && !isValidEmail(value)) list.push({ key: field.key, label: field.label, message: 'is not a valid email address' });
      if (field.kind === 'phone' && !isValidWhatsApp(value)) list.push({ key: field.key, label: field.label, message: 'needs a full number with country code' });
      if (field.kind === 'url' && !isValidHttpsUrl(value)) list.push({ key: field.key, label: field.label, message: 'must start with https://' });
      if (field.kind === 'number') {
        const n = Number(value);
        if (!Number.isFinite(n) || (field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
          list.push({ key: field.key, label: field.label, message: `must be between ${field.min} and ${field.max}` });
        }
      }
      if (field.max && field.kind !== 'number' && value.length > field.max) {
        list.push({ key: field.key, label: field.label, message: `is longer than ${field.max} characters` });
      }
    }
    return list;
  }, [page, valueOf]);

  const status: PageStatus = hasDraft ? 'changes' : published.length ? 'published' : 'original';

  const publish = useCallback(async () => {
    pending.current = pending.current || state === 'dirty';
    await save();
    await actions.publish(page.key);
    setInitialised(false);
  }, [actions, page.key, save, state]);

  const discard = useCallback(async () => {
    pending.current = false;
    await actions.discard(page.key);
    setInitialised(false);
  }, [actions, page.key]);

  const saveNow = useCallback(async () => {
    pending.current = true;
    await save();
  }, [save]);

  return {
    loading: !initialised,
    loadError: rows.error as Error | null,
    values,
    media,
    state,
    message,
    status,
    lastSaved,
    publishedAt: published.find((r) => r.locale === '*')?.publishedAt ?? published[0]?.publishedAt ?? null,
    valueOf,
    isCustom,
    setField,
    restoreField,
    setImage,
    needsTranslation,
    translationCounts,
    problems,
    saveNow,
    publish,
    discard,
    upload: actions.upload,
  };
}
