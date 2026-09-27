import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSaveOpportunity } from '../data/queries';
import { ConflictError } from '../data/repository';
import { draftErrors, emptyOpportunity, slugify, type Opportunity } from '../domain/opportunity';

/**
 * Save model (the part Reece has to be able to trust):
 *
 * - New record: nothing reaches the server until "Save draft". Work in
 *   progress is backed up locally under `gh-admin-draft:new` only.
 * - Draft on the server: changes autosave to the server after a short pause.
 *   Drafts are never public, so autosave cannot leak anything.
 * - Live record (available/reserved/sold): changes are held as "Unsaved
 *   changes" until "Save changes", because saving changes the website.
 *   A local backup under `gh-admin-draft:<id>` survives a closed tab.
 * - Every server save carries the `updated_at` it was based on; if the record
 *   changed elsewhere the save is refused instead of overwriting it.
 * Backup keys are record-specific, so one opportunity's draft can never
 * appear in another.
 */

export type SaveState =
  | { kind: 'new' }
  | { kind: 'saved'; at: string | null }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string; conflict: boolean };

const AUTOSAVE_MS = 1500;
const BACKUP_MS = 600;

export function backupKey(id: string | null) {
  return `gh-admin-draft:${id ?? 'new'}`;
}

type Backup = { record: Opportunity; baseUpdatedAt: string | null; at: string };

export function readBackup(id: string | null): Backup | null {
  try {
    const raw = localStorage.getItem(backupKey(id));
    if (!raw) return null;
    const backup = JSON.parse(raw) as Backup;
    // Defence in depth: a backup is only ever valid for its own record.
    if (!backup?.record || (backup.record.id ?? null) !== id) return null;
    return backup;
  } catch {
    return null;
  }
}

function writeBackup(id: string | null, backup: Backup) {
  try {
    localStorage.setItem(backupKey(id), JSON.stringify(backup));
  } catch {
    // Storage full or blocked: the on-screen state still holds the work.
  }
}

export function clearBackup(id: string | null) {
  try {
    localStorage.removeItem(backupKey(id));
  } catch {
    // ignore
  }
}

const NEEDS_ATTENTION = 'Some fields need attention before saving.';

function same(a: Opportunity, b: Opportunity) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useOpportunityEditor(loaded: Opportunity | null, fallbackReference: string) {
  const save = useSaveOpportunity();
  const [record, setRecord] = useState<Opportunity>(() => loaded ?? emptyOpportunity(fallbackReference));
  const [baseline, setBaseline] = useState<Opportunity>(() => loaded ?? emptyOpportunity(fallbackReference));
  const [state, setState] = useState<SaveState>(() => (loaded ? { kind: 'saved', at: loaded.updatedAt } : { kind: 'new' }));
  const recordRef = useRef(record);
  recordRef.current = record;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;
  const inFlight = useRef<Promise<Opportunity | null> | null>(null);

  const dirty = useMemo(() => !same(record, baseline), [record, baseline]);
  const errors = useMemo(() => draftErrors(record), [record]);

  // A new record gets its reference once the list has loaded.
  useEffect(() => {
    if (!record.id && !record.reference && fallbackReference) {
      setRecord((current) => ({ ...current, reference: fallbackReference }));
      setBaseline((current) => ({ ...current, reference: fallbackReference }));
    }
  }, [fallbackReference, record.id, record.reference]);

  const update = useCallback((patch: Partial<Opportunity>) => {
    setRecord((current) => {
      const next = { ...current, ...patch };
      // The slug follows the title until it is edited by hand or published.
      if (
        patch.title !== undefined &&
        patch.slug === undefined &&
        !current.publishedAt &&
        (current.slug === '' || current.slug === slugify(current.title))
      ) {
        next.slug = slugify(patch.title);
      }
      return next;
    });
  }, []);

  const persist = useCallback(
    async (overrides: Partial<Opportunity> = {}): Promise<Opportunity | null> => {
      while (inFlight.current) await inFlight.current.catch(() => null);
      const started = recordRef.current;
      const target = { ...started, ...overrides };
      if (Object.keys(draftErrors(target)).length > 0) {
        setState({ kind: 'error', message: NEEDS_ATTENTION, conflict: false });
        return null;
      }
      setState({ kind: 'saving' });
      const run = (async () => {
        try {
          const saved = await save.mutateAsync({ record: target, expectedUpdatedAt: baselineRef.current.updatedAt });
          clearBackup(target.id);
          // Anything typed while the request was in flight is kept; only the
          // server-owned fields are taken from the response.
          const current = recordRef.current;
          const next: Opportunity = same(current, started)
            ? saved
            : {
                ...current,
                id: saved.id,
                status: saved.status,
                slug: saved.slug,
                createdAt: saved.createdAt,
                updatedAt: saved.updatedAt,
                publishedAt: saved.publishedAt,
                archivedAt: saved.archivedAt,
              };
          // Refs are updated before React re-renders so a save queued behind
          // this one sees the new id and updated_at: no second insert, no
          // false conflict.
          recordRef.current = next;
          baselineRef.current = saved;
          setBaseline(saved);
          setRecord(next);
          setState({ kind: 'saved', at: saved.updatedAt });
          return saved;
        } catch (error) {
          const conflict = error instanceof ConflictError;
          setState({
            kind: 'error',
            conflict,
            message: error instanceof Error ? error.message : 'Could not save.',
          });
          return null;
        }
      })();
      inFlight.current = run;
      const result = await run;
      inFlight.current = null;
      return result;
    },
    [save],
  );

  // Reflect edits in the save state. A save stopped only by field problems
  // stops reading "Couldn't save" once those fields are fixed.
  const hasErrors = Object.keys(errors).length > 0;
  const stoppedByFields = state.kind === 'error' && !state.conflict && state.message === NEEDS_ATTENTION;
  useEffect(() => {
    if (state.kind === 'saving') return;
    const fixed = stoppedByFields && !hasErrors;
    if (dirty && (state.kind !== 'error' || fixed)) setState({ kind: 'dirty' });
    if (!dirty && (state.kind === 'dirty' || fixed)) setState(record.id ? { kind: 'saved', at: record.updatedAt } : { kind: 'new' });
  }, [dirty, record.id, record.updatedAt, state.kind, stoppedByFields, hasErrors]);

  // Local backup for new and live records.
  useEffect(() => {
    if (!dirty) return;
    if (record.id && record.status === 'draft') return; // drafts autosave to the server
    const timer = window.setTimeout(
      () => writeBackup(record.id, { record, baseUpdatedAt: baseline.updatedAt, at: new Date().toISOString() }),
      BACKUP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [record, baseline.updatedAt, dirty]);

  // Server autosave for drafts that already exist.
  useEffect(() => {
    if (!dirty || !record.id || baseline.status !== 'draft' || record.status !== 'draft') return;
    if (state.kind === 'error' && state.conflict) return;
    if (Object.keys(errors).length > 0) return;
    const timer = window.setTimeout(() => void persist(), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [record, dirty, baseline.status, errors, persist, state]);

  // Warn before closing the tab with work that is not on the server.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const discard = useCallback(() => {
    clearBackup(recordRef.current.id);
    setRecord(baselineRef.current);
    setState(baselineRef.current.id ? { kind: 'saved', at: baselineRef.current.updatedAt } : { kind: 'new' });
  }, []);

  const restore = useCallback((backup: Opportunity) => {
    setRecord({ ...backup, updatedAt: baselineRef.current.updatedAt, id: baselineRef.current.id });
  }, []);

  return { record, baseline, update, persist, discard, restore, dirty, state, errors, saving: state.kind === 'saving' };
}
