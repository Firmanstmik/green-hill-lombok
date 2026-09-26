import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Archive, ArrowLeft, Eye, ImagePlus, Loader2, Plus, RotateCcw, Send, Trash2, Undo2, X } from 'lucide-react';
import type { NotesLocale, NotesTopic } from '@/data/notesData';
import { CONTENT_LOCALES, LOCALE_LABEL } from '@/content/schema';
import { useNoteActions, useNotesList } from '../data/queries';
import { ConflictError, IMAGE_TYPES } from '../data/repository';
import {
  NOTE_TOPICS,
  emptyNote,
  emptySection,
  emptyText,
  noteProblems,
  type NoteRecord,
  type NoteSection,
  type NoteText,
} from '../domain/content';
import { slugify } from '../domain/opportunity';
import { PreviewDialog } from '../editor/PreviewDialog';
import { useAdminPath } from '../paths';
import { timeAgo } from '../ui/format';
import { MediaImg } from '../ui/media';
import { ConfirmDialog } from '../ui/overlays';
import { CharCount, EmptyState, ErrorState, Field } from '../ui/primitives';
import { NOTE_STATUS } from './NotesPage';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

const AUTOSAVE_MS = 1500;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Every language being edited starts with at least one part to write in. */
function withParts(note: NoteRecord): NoteRecord {
  const translations = Object.fromEntries(
    Object.entries(note.translations).map(([locale, text]) => [locale, text && text.sections.length ? text : { ...text, sections: [emptySection()] }]),
  ) as NoteRecord['translations'];
  return { ...note, translations };
}

const today = () => new Date().toISOString().slice(0, 10);

/** Editor for one note. Drafts autosave; a published note changes only when you save. */
export default function NoteEditorPage() {
  const { id } = useParams();
  const notes = useNotesList();
  const { admin } = useAdminPath();
  const location = useLocation();
  // A new note keeps the same editor when its address changes to /notes/:id after the first save.
  const editorKey = (location.state as { editorKey?: string } | null)?.editorKey ?? id ?? 'new';
  if (notes.error) return <ErrorState message={(notes.error as Error).message} />;
  if (!notes.data) {
    return (
      <div role="status" style={{ padding: '24px 0' }}>
        <span className="gha-skel" style={{ width: 320, height: 30 }} />
        <span className="gha-sr-only">Opening the note…</span>
      </div>
    );
  }
  const existing = id ? notes.data.find((note) => note.id === id) : undefined;
  if (id && !existing) {
    return (
      <div className="gha-panel">
        <EmptyState
          title="This note no longer exists"
          action={
            <Link className="gha-btn gha-btn--secondary" to={admin('/notes')}>
              Back to Notes
            </Link>
          }
        />
      </div>
    );
  }
  return <NoteEditor key={editorKey} initial={withParts(existing ?? emptyNote())} />;
}

function NoteEditor({ initial }: { initial: NoteRecord }) {
  const { admin, site } = useAdminPath();
  const navigate = useNavigate();
  const actions = useNoteActions();
  const [note, setNote] = useState<NoteRecord>(initial);
  const [locale, setLocale] = useState<NotesLocale>('en');
  const [state, setState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'delete' | 'unpublish' | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const latest = useRef(note);
  latest.current = note;
  const pending = useRef(false);
  const saving = useRef<Promise<NoteRecord | null> | null>(null);

  const live = note.status === 'published';
  const problems = useMemo(() => noteProblems(note), [note]);
  const text = note.translations[locale];

  useEffect(() => {
    document.title = `${note.translations.en.title || 'New note'} · Green Hill Admin`;
  }, [note.translations.en.title]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const save = useCallback(
    async (overrides: Partial<NoteRecord> = {}): Promise<NoteRecord | null> => {
      if (saving.current) await saving.current.catch(() => null);
      pending.current = false;
      const draft = { ...latest.current, ...overrides };
      draft.slug = slugify(draft.slug || draft.translations.en.title).replace(/-+$/, '');
      if (!draft.translations.en.title.trim() || !SLUG_RE.test(draft.slug)) {
        setState('error');
        setMessage(!draft.translations.en.title.trim() ? 'Add an English title first.' : 'The page address can only use lowercase letters, numbers and hyphens.');
        return null;
      }
      setState('saving');
      const run = (async () => {
        try {
          const saved = await actions.save(draft, draft.id ? draft.updatedAt : null);
          // Keep anything typed while saving; take the server's identity and version.
          setNote((current) => ({ ...current, ...overrides, id: saved.id, slug: saved.slug, updatedAt: saved.updatedAt, status: saved.status, publishedOn: saved.publishedOn }));
          latest.current = { ...latest.current, id: saved.id, updatedAt: saved.updatedAt };
          setState(pending.current ? 'dirty' : 'saved');
          if (!draft.id && saved.id) navigate(admin(`/notes/${saved.id}`), { replace: true, state: { editorKey: 'new' } });
          return saved;
        } catch (error) {
          if (error instanceof ConflictError) {
            setState('conflict');
            setMessage(error.message);
          } else {
            pending.current = true;
            setState('error');
            setMessage(error instanceof Error ? error.message : 'Could not save.');
          }
          return null;
        }
      })();
      saving.current = run;
      const result = await run;
      saving.current = null;
      return result;
    },
    [actions, admin, navigate],
  );

  // Drafts autosave once they have a title. Published notes wait for "Save changes".
  useEffect(() => {
    if (state !== 'dirty' || live || !note.translations.en.title.trim()) return;
    const timer = window.setTimeout(() => void save(), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [state, note, live, save]);

  // Moving to another admin screen saves a pending draft change instead of dropping it.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(
    () => () => {
      const current = latest.current;
      if (pending.current && current.status !== 'published' && current.translations.en.title.trim()) void saveRef.current();
    },
    [],
  );

  useEffect(() => {
    if (state !== 'dirty' && state !== 'saving' && state !== 'error') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state]);

  const change = (update: (current: NoteRecord) => NoteRecord) => {
    setNote((current) => update(current));
    pending.current = true;
    setState((current) => (current === 'conflict' ? current : 'dirty'));
  };

  const setShared = <K extends keyof NoteRecord>(key: K, value: NoteRecord[K]) => change((current) => ({ ...current, [key]: value }));

  const setText = (patch: Partial<NoteText>) =>
    change((current) => {
      const base = current.translations[locale] ?? emptyText();
      const next = { ...current, translations: { ...current.translations, [locale]: { ...base, ...patch } } };
      if (locale === 'en' && patch.title !== undefined && !slugTouched && !current.id) next.slug = slugify(patch.title);
      return next;
    });

  const setSection = (index: number, patch: Partial<NoteSection>) =>
    setText({ sections: (text?.sections ?? []).map((section, i) => (i === index ? { ...section, ...patch } : section)) });

  const startTranslation = () =>
    change((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: {
          ...emptyText(),
          sections: current.translations.en.sections.map((s) => ({ ...emptySection(), image: s.image, imageAlt: s.imageAlt })),
        },
      },
    }));

  const removeTranslation = () =>
    change((current) => {
      const translations = { ...current.translations };
      delete translations[locale];
      return { ...current, translations };
    });

  const statusChange = async (status: NoteRecord['status'], success: string) => {
    setBusy(true);
    const saved = await save({ status, ...(status === 'published' ? { publishedOn: latest.current.publishedOn || today() } : {}) });
    setBusy(false);
    setConfirm(null);
    if (saved) toast.success(success);
  };

  const remove = async () => {
    if (!note.id) return;
    setBusy(true);
    try {
      await actions.remove(note.id);
      pending.current = false;
      setState('idle');
      toast.success('Draft deleted.');
      navigate(admin('/notes'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete.');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const openPreview = async () => {
    const saved = latest.current.id && state !== 'dirty' ? latest.current : await save();
    if (!saved) return;
    setPreviewUrl(`${site(`/intelligence/${saved.slug}`)}?cms-preview=1`);
  };

  const saveLabel =
    state === 'saving'
      ? 'Saving…'
      : state === 'dirty'
        ? live
          ? 'Unsaved changes · not live yet'
          : 'Unsaved changes'
        : state === 'error'
          ? 'Couldn’t save'
          : state === 'conflict'
            ? 'Changed elsewhere · not saved'
            : note.id
              ? `Saved ${timeAgo(note.updatedAt, now)}`
              : 'Not saved yet';
  const saveState = state === 'saving' ? 'saving' : state === 'dirty' ? 'dirty' : state === 'error' || state === 'conflict' ? 'error' : note.id ? 'saved' : 'new';
  const status = NOTE_STATUS[note.status];

  return (
    <div>
      <header className="gha-editor-head">
        <div className="gha-editor-head__row">
          <div className="gha-editor-head__id">
            <Link className="gha-editor-head__back" to={admin('/notes')}>
              <ArrowLeft size={15} aria-hidden />
              Notes
            </Link>
            <h1 className="gha-editor-head__title" data-empty={!note.translations.en.title}>
              {note.translations.en.title || 'New note'}
            </h1>
            <div className="gha-editor-head__meta">
              <span className={`gha-status ${status.cls}`}>{status.label}</span>
              <span className="gha-save" data-state={saveState} role="status" aria-live="polite">
                <span className="gha-save__dot" aria-hidden />
                {saveLabel}
              </span>
            </div>
          </div>
          <div className="gha-editor-head__actions">
            <button type="button" className="gha-btn gha-btn--secondary" onClick={() => void openPreview()}>
              <Eye size={16} aria-hidden />
              Preview
            </button>
            {live ? (
              <>
                <button type="button" className="gha-btn gha-btn--ghost" disabled={busy} onClick={() => setConfirm('unpublish')}>
                  <Undo2 size={16} aria-hidden />
                  Unpublish
                </button>
                <button
                  type="button"
                  className="gha-btn gha-btn--primary"
                  disabled={busy || state !== 'dirty' || problems.length > 0}
                  onClick={() => void save().then((saved) => saved && toast.success('Saved. The published note is updated.'))}
                >
                  Save changes
                </button>
              </>
            ) : (
              <>
                {note.status === 'archived' ? (
                  <button type="button" className="gha-btn gha-btn--ghost" disabled={busy} onClick={() => void statusChange('draft', 'Restored as a draft.')}>
                    <RotateCcw size={16} aria-hidden />
                    Restore
                  </button>
                ) : note.id ? (
                  <button type="button" className="gha-btn gha-btn--ghost" disabled={busy} onClick={() => void statusChange('archived', 'Note archived.')}>
                    <Archive size={16} aria-hidden />
                    Archive
                  </button>
                ) : null}
                {note.id && note.status === 'draft' ? (
                  <button type="button" className="gha-btn gha-btn--ghost" disabled={busy} onClick={() => setConfirm('delete')}>
                    <Trash2 size={16} aria-hidden />
                    Delete
                  </button>
                ) : null}
                {!note.id ? (
                  <button type="button" className="gha-btn gha-btn--secondary" disabled={busy} onClick={() => void save()}>
                    Save draft
                  </button>
                ) : null}
                <button
                  type="button"
                  className="gha-btn gha-btn--primary"
                  disabled={busy || problems.length > 0}
                  aria-describedby={problems.length && note.id ? 'gha-note-problems' : undefined}
                  onClick={() => void statusChange('published', 'Published. The note is on the website.')}
                >
                  {busy ? <Loader2 size={16} className="gha-spin" aria-hidden /> : <Send size={16} aria-hidden />}
                  Publish
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="gha-form-measure">
      {state === 'conflict' || state === 'error' ? (
        <div className="gha-alert" role="alert" style={{ marginBottom: 20 }}>
          <div>
            <span className="gha-alert__title">{state === 'conflict' ? 'Not saved: this note was changed somewhere else' : 'Couldn’t save'}</span>
            <span>{state === 'conflict' ? 'Reload to see the latest version. Nothing was overwritten.' : message}</span>
            {state === 'conflict' ? (
              <div style={{ marginTop: 12 }}>
                <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={() => window.location.reload()}>
                  Reload
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {live && problems.length === 0 ? (
        <p className="gha-hint" style={{ margin: '0 0 20px' }}>
          This note is published. Changes reach the website when you press “Save changes”.
        </p>
      ) : null}
      {problems.length && note.id ? (
        <div className="gha-alert gha-alert--gold" id="gha-note-problems" style={{ marginBottom: 20 }}>
          <div>
            <span className="gha-alert__title">{live ? 'Before saving' : 'Before publishing'}</span>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="gha-tabs" role="group" aria-label="Language" style={{ margin: '8px 0' }}>
        {CONTENT_LOCALES.map((code) => (
          <button key={code} type="button" className="gha-tab" aria-pressed={locale === code} onClick={() => setLocale(code)}>
            {LOCALE_LABEL[code]}
            {code !== 'en' && !note.translations[code]?.title ? <span className="gha-sr-only"> (not translated)</span> : null}
          </button>
        ))}
      </div>

      {!text ? (
        <div className="gha-panel gha-panel--pad" style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px' }}>
            <span className="gha-soon">Needs translation</span>
          </p>
          <p className="gha-hint" style={{ margin: '0 0 14px' }}>
            Visitors reading in {LOCALE_LABEL[locale]} see the English note until a translation is written here.
          </p>
          <button type="button" className="gha-btn gha-btn--secondary" onClick={startTranslation}>
            <Plus size={16} aria-hidden />
            Write the {LOCALE_LABEL[locale]} version
          </button>
        </div>
      ) : (
        <>
          <fieldset className="gha-fieldset">
            <legend className="gha-legend">
              Text · {LOCALE_LABEL[locale]}
              {locale !== 'en' ? (
                <span className="gha-meta" style={{ marginLeft: 10, fontSize: 12.5 }}>
                  {text.title.trim() ? 'Translated' : 'Add a title to show this translation'}
                </span>
              ) : null}
            </legend>
            <div className="gha-stack">
              <Field label="Title" required={locale === 'en'} aside={<CharCount value={text.title} ideal={120} />}>
                {(control) => <input {...control} className="gha-input" value={text.title} maxLength={160} onChange={(event) => setText({ title: event.target.value })} />}
              </Field>
              <Field label="Summary" required={locale === 'en'} hint="Shown in the Notes list and under the title." aside={<CharCount value={text.excerpt} ideal={240} />}>
                {(control) => <textarea {...control} className="gha-textarea" value={text.excerpt} maxLength={400} onChange={(event) => setText({ excerpt: event.target.value })} />}
              </Field>
              <Field label="Standfirst" optional hint="A longer opening line under the title. The summary is used when empty.">
                {(control) => <textarea {...control} className="gha-textarea" value={text.dek} maxLength={500} onChange={(event) => setText({ dek: event.target.value })} />}
              </Field>
            </div>
          </fieldset>

          {text.sections.map((section, index) => (
            <fieldset key={index} className="gha-fieldset">
              <legend className="gha-legend">
                Part {index + 1}
                {text.sections.length > 1 ? (
                  <button
                    type="button"
                    className="gha-btn gha-btn--ghost gha-btn--sm"
                    style={{ marginLeft: 10 }}
                    onClick={() => setText({ sections: text.sections.filter((_, i) => i !== index) })}
                  >
                    <X size={14} aria-hidden />
                    Remove part {index + 1}
                  </button>
                ) : null}
              </legend>
              <div className="gha-stack">
                <Field label="Heading" optional>
                  {(control) => <input {...control} className="gha-input" value={section.heading} maxLength={160} onChange={(event) => setSection(index, { heading: event.target.value })} />}
                </Field>
                <Field label="Text" required={locale === 'en' && index === 0} hint="Leave an empty line between paragraphs.">
                  {(control) => (
                    <textarea {...control} className="gha-textarea" style={{ minHeight: 200 }} value={section.content} maxLength={20000} onChange={(event) => setSection(index, { content: event.target.value })} />
                  )}
                </Field>
                <Field label="Pull quote" optional hint="A short line set large before this part.">
                  {(control) => <input {...control} className="gha-input" value={section.pullQuote} maxLength={240} onChange={(event) => setSection(index, { pullQuote: event.target.value })} />}
                </Field>
                <ImageField label="Photograph" value={section.image} onChange={(value) => setSection(index, { image: value })} upload={actions.upload} />
                {section.image ? (
                  <div className="gha-grid gha-grid--2">
                    <Field label="Photograph description" required hint="For screen readers.">
                      {(control) => <input {...control} className="gha-input" value={section.imageAlt} maxLength={200} onChange={(event) => setSection(index, { imageAlt: event.target.value })} />}
                    </Field>
                    <Field label="Caption" optional>
                      {(control) => <input {...control} className="gha-input" value={section.caption} maxLength={200} onChange={(event) => setSection(index, { caption: event.target.value })} />}
                    </Field>
                  </div>
                ) : null}
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            className="gha-btn gha-btn--secondary"
            style={{ marginBottom: 28 }}
            onClick={() => setText({ sections: [...text.sections, emptySection()] })}
          >
            <Plus size={16} aria-hidden />
            Add a part
          </button>

          <fieldset className="gha-fieldset">
            <legend className="gha-legend">Search &amp; sharing · {LOCALE_LABEL[locale]}</legend>
            <div className="gha-stack">
              <Field label="Search title" optional hint="The title and summary are used when empty." aside={<CharCount value={text.seoTitle} ideal={60} />}>
                {(control) => <input {...control} className="gha-input" value={text.seoTitle} maxLength={120} onChange={(event) => setText({ seoTitle: event.target.value })} />}
              </Field>
              <Field label="Search description" optional aside={<CharCount value={text.seoDescription} ideal={160} />}>
                {(control) => (
                  <textarea {...control} className="gha-textarea" value={text.seoDescription} maxLength={300} onChange={(event) => setText({ seoDescription: event.target.value })} />
                )}
              </Field>
            </div>
          </fieldset>
          {locale !== 'en' ? (
            <button type="button" className="gha-btn gha-btn--ghost" style={{ marginBottom: 28 }} onClick={removeTranslation}>
              <Trash2 size={16} aria-hidden />
              Remove the {LOCALE_LABEL[locale]} version
            </button>
          ) : null}
        </>
      )}

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">About this note</legend>
        <div className="gha-stack">
          <Field
            label="Public page address"
            required
            hint={`The note’s web address: /en/intelligence/${note.slug || '…'} (and the same in each language). Filled in from the title; lowercase words joined by hyphens.${live ? ' Changing it breaks links already shared.' : ''}`}
          >
            {(control) => (
              <input
                {...control}
                className="gha-input gha-mono"
                value={note.slug}
                maxLength={80}
                onChange={(event) => {
                  setSlugTouched(true);
                  setShared('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }}
              />
            )}
          </Field>
          <div className="gha-grid gha-grid--2">
            <Field label="Topic">
              {(control) => (
                <select {...control} className="gha-select" value={note.topic} onChange={(event) => setShared('topic', event.target.value as NotesTopic)}>
                  {NOTE_TOPICS.map((topic) => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Date" hint="Shown on the note. Set to today when you publish, if empty.">
              {(control) => (
                <input {...control} type="date" className="gha-input" value={note.publishedOn} onChange={(event) => setShared('publishedOn', event.target.value)} />
              )}
            </Field>
          </div>
          <div className="gha-grid gha-grid--2">
            <Field label="Author">
              {(control) => <input {...control} className="gha-input" value={note.author} maxLength={80} onChange={(event) => setShared('author', event.target.value)} />}
            </Field>
            <div className="gha-field" style={{ alignSelf: 'end' }}>
              <label className="gha-switch">
                <input
                  type="checkbox"
                  checked={note.featured}
                  aria-describedby="gha-note-featured-hint"
                  onChange={(event) => setShared('featured', event.target.checked)}
                />
                <span className="gha-switch__track" aria-hidden />
                Lead note
              </label>
              <p className="gha-hint" id="gha-note-featured-hint">
                Shown first and larger on the Notes page.
              </p>
            </div>
          </div>
          <ImageField
            label="Cover photograph"
            required
            value={note.coverImage}
            onChange={(value) => setShared('coverImage', value)}
            upload={actions.upload}
          />
          <Field label="Cover description" required hint="For screen readers and search engines. The same in every language.">
            {(control) => <input {...control} className="gha-input" value={note.coverAlt} maxLength={200} onChange={(event) => setShared('coverAlt', event.target.value)} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Sharing image</legend>
        <ImageField
          label="Image for WhatsApp and social media"
          value={note.ogImage}
          onChange={(value) => setShared('ogImage', value)}
          upload={actions.upload}
          hint="The cover photograph is used when empty."
        />
      </fieldset>

      </div>

      <PreviewDialog
        open={previewUrl !== null}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
        url={previewUrl ?? ''}
        isPrivate={false}
        note="The saved note as visitors would see it. Nothing is published by previewing."
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this draft?"
        description="The draft is removed permanently. It was never on the website."
        confirmLabel="Delete draft"
        tone="danger"
        busy={busy}
        onConfirm={() => void remove()}
      />
      <ConfirmDialog
        open={confirm === 'unpublish'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Unpublish this note?"
        description="It leaves the website straight away and becomes a draft. You can publish it again later."
        confirmLabel="Unpublish"
        busy={busy}
        onConfirm={() => void statusChange('draft', 'Unpublished. The note is now a draft.')}
      />
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  upload,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  upload: (file: File) => Promise<string>;
  required?: boolean;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const pick = async (file: File) => {
    setUploading(true);
    try {
      onChange(await upload(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload this image.');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="gha-image-field">
      <div className="gha-image-field__preview">{value ? <MediaImg src={value} alt="" /> : null}</div>
      <div style={{ minWidth: 0 }}>
        <span className="gha-label">
          {label}
          {required ? <span className="gha-label__tag gha-label__tag--req">Required</span> : null}
        </span>
        {hint ? <p className="gha-hint" style={{ margin: '4px 0 0' }}>{hint}</p> : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" disabled={uploading} onClick={() => input.current?.click()}>
            {uploading ? <Loader2 size={14} className="gha-spin" aria-hidden /> : <ImagePlus size={14} aria-hidden />}
            {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
            <span className="gha-sr-only"> {label}</span>
          </button>
          {value ? (
            <button type="button" className="gha-btn gha-btn--ghost gha-btn--sm" onClick={() => onChange('')}>
              <X size={14} aria-hidden />
              Remove
              <span className="gha-sr-only"> {label}</span>
            </button>
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          className="gha-sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void pick(file);
          }}
        />
      </div>
    </div>
  );
}
