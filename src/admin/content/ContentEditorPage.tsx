import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Eye, ImagePlus, Loader2, RotateCcw, Send, Undo2 } from 'lucide-react';
import {
  CONTENT_LOCALES,
  LOCALE_LABEL,
  pageDef,
  type ContentLocale,
  type FieldDef,
  type MediaDef,
  type PageDef,
} from '@/content/schema';
import { ORIGINAL_MEDIA, originalValue } from '@/content/originals';
import { IMAGE_TYPES } from '../data/repository';
import { PreviewDialog } from '../editor/PreviewDialog';
import { useAdminPath } from '../paths';
import { timeAgo } from '../ui/format';
import { MediaImg } from '../ui/media';
import { ConfirmDialog } from '../ui/overlays';
import { EmptyState, ErrorState, Field } from '../ui/primitives';
import { useContentEditor } from './useContentEditor';

/**
 * Structured editor for one Green Hill page. The sections and fields come from
 * src/content/schema.ts; Reece edits words and images, never layout.
 */
type ViewProps = {
  pageKey?: string;
  /** Show only these sections (the rest of the page is kept and validated as is). */
  sections?: string[];
  title?: string;
  intro?: string;
  footer?: ReactNode;
};

export default function ContentEditorPage({ pageKey, sections, title, intro, footer }: ViewProps) {
  const params = useParams();
  const { admin } = useAdminPath();
  const page = pageDef(pageKey ?? params.page ?? '');
  if (!page) {
    return (
      <div className="gha-panel">
        <EmptyState
          title="This page is not part of the site content"
          action={
            <Link className="gha-btn gha-btn--secondary" to={admin('/content')}>
              Back to content
            </Link>
          }
        />
      </div>
    );
  }
  return <Editor key={`${page.key}:${sections?.join(',') ?? ''}`} page={page} sections={sections} title={title} intro={intro} footer={footer} />;
}

const FOCUS_OPTIONS = [
  { value: '', label: 'Centre (as designed)' },
  { value: '50% 25%', label: 'Keep the top in view' },
  { value: '50% 75%', label: 'Keep the bottom in view' },
  { value: '30% 50%', label: 'Keep the left in view' },
  { value: '70% 50%', label: 'Keep the right in view' },
];

function Editor({ page, sections, title, intro, footer }: { page: PageDef } & Omit<ViewProps, 'pageKey'>) {
  const { admin, site } = useAdminPath();
  const editor = useContentEditor(page);
  const [locale, setLocale] = useState<ContentLocale>('en');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState<'publish' | 'discard' | null>(null);
  const [now, setNow] = useState(Date.now());
  const isSettings = page.group === 'settings';
  const heading = title ?? page.title;
  const visible = sections ? page.sections.filter((section) => sections.includes(section.id)) : page.sections;

  useEffect(() => {
    document.title = `${heading} · Green Hill Admin`;
  }, [heading]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  // Jump to a section when opened from a link such as "#section-seo".
  useEffect(() => {
    if (editor.loading || !window.location.hash) return;
    document.querySelector(window.location.hash)?.scrollIntoView({ block: 'start' });
  }, [editor.loading]);

  if (editor.loadError) return <ErrorState message={editor.loadError.message} />;
  if (editor.loading) {
    return (
      <div role="status" style={{ padding: '24px 0' }}>
        <span className="gha-skel" style={{ width: 320, height: 30 }} />
        <span className="gha-sr-only">Loading {heading}…</span>
      </div>
    );
  }

  const saveLabel =
    editor.state === 'saving'
      ? 'Saving…'
      : editor.state === 'dirty'
        ? 'Unsaved changes'
        : editor.state === 'error'
          ? 'Couldn’t save'
          : editor.state === 'conflict'
            ? 'Changed elsewhere · not saved'
            : editor.status === 'changes'
              ? `Draft saved ${timeAgo(editor.lastSaved, now)}`
              : editor.status === 'published'
                ? 'Published'
                : 'No changes yet';
  const saveState =
    editor.state === 'saving' ? 'saving' : editor.state === 'dirty' ? 'dirty' : editor.state === 'error' || editor.state === 'conflict' ? 'error' : 'saved';

  const statusChip =
    editor.status === 'changes'
      ? { cls: 'gha-status--draft', text: 'Unpublished changes' }
      : editor.status === 'published'
        ? { cls: 'gha-status--available', text: 'Published' }
        : { cls: 'gha-status--archived', text: 'Original copy' };

  const openPreview = async () => {
    await editor.saveNow();
    const path = page.path ?? '';
    setPreviewUrl(`${site(path)}?cms-preview=1`);
  };

  const publish = async () => {
    setBusy('publish');
    try {
      await editor.publish();
      toast.success(isSettings ? 'Published. The whole site now uses these settings.' : 'Published. The website is up to date.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish. Nothing changed on the website.');
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    setBusy('discard');
    try {
      await editor.discard();
      toast.success('Changes discarded. The website was not affected.');
      setConfirmDiscard(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not discard.');
    } finally {
      setBusy(null);
    }
  };

  const canPublish = editor.problems.length === 0 && (editor.status === 'changes' || editor.state === 'dirty');

  return (
    <div>
      <header className="gha-editor-head">
        <div className="gha-editor-head__row">
          <div className="gha-editor-head__id">
            <Link className="gha-editor-head__back" to={admin(isSettings ? '/settings' : '/content')}>
              <ArrowLeft size={15} aria-hidden />
              {isSettings ? 'Settings' : 'Content'}
            </Link>
            <h1 className="gha-editor-head__title">{heading}</h1>
            <div className="gha-editor-head__meta">
              <span className={`gha-status ${statusChip.cls}`}>{statusChip.text}</span>
              <span className="gha-save" data-state={saveState} role="status" aria-live="polite">
                <span className="gha-save__dot" aria-hidden />
                {saveLabel}
              </span>
            </div>
          </div>
          <div className="gha-editor-head__actions">
            {page.path !== null ? (
              <button type="button" className="gha-btn gha-btn--secondary" onClick={() => void openPreview()}>
                <Eye size={16} aria-hidden />
                Preview
              </button>
            ) : null}
            {editor.status === 'changes' ? (
              <button type="button" className="gha-btn gha-btn--ghost" onClick={() => setConfirmDiscard(true)}>
                <Undo2 size={16} aria-hidden />
                Discard changes
              </button>
            ) : null}
            <button
              type="button"
              className="gha-btn gha-btn--primary"
              disabled={!canPublish || busy !== null}
              aria-describedby={editor.problems.length ? 'gha-content-problems' : undefined}
              onClick={() => void publish()}
            >
              {busy === 'publish' ? <Loader2 size={16} className="gha-spin" aria-hidden /> : <Send size={16} aria-hidden />}
              Publish
            </button>
          </div>
        </div>
      </header>

      <div className="gha-form-measure">
      <p className="gha-lead" style={{ margin: '0 0 20px' }}>
        {intro ?? page.summary} Changes are kept as a draft until you publish; visitors keep seeing the current page.
      </p>

      {editor.state === 'conflict' ? (
        <div className="gha-alert" role="alert" style={{ marginBottom: 20 }}>
          <div>
            <span className="gha-alert__title">Not saved: this page was changed somewhere else</span>
            <span>Reload to see the latest version. Nothing was overwritten.</span>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editor.state === 'error' ? (
        <div className="gha-alert" role="alert" style={{ marginBottom: 20 }}>
          <div>
            <span className="gha-alert__title">Couldn’t save</span>
            <span>{editor.message}</span>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={() => void editor.saveNow()}>
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editor.problems.length ? (
        <div className="gha-alert gha-alert--gold" id="gha-content-problems" style={{ marginBottom: 20 }}>
          <div>
            <span className="gha-alert__title">Before publishing</span>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {editor.problems.map((p) => (
                <li key={p.key}>
                  {p.label} {p.message}.
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="gha-tabs" role="group" aria-label="Language" style={{ marginBottom: 8 }}>
        {CONTENT_LOCALES.map((code) => {
          const count = editor.translationCounts[code];
          return (
            <button
              key={code}
              type="button"
              className="gha-tab"
              aria-pressed={locale === code}
              onClick={() => setLocale(code)}
            >
              {LOCALE_LABEL[code]}
              {count ? (
                <span className="gha-nav__count gha-nav__count--alert" aria-label={`${count} need translation`}>
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="gha-hint" style={{ margin: '0 0 24px' }}>
        {locale === 'en'
          ? 'English is the main version. Other languages keep their approved translation until you change them.'
          : `Editing the ${LOCALE_LABEL[locale]} version. Fields marked “Needs translation” changed in English and still show the older ${LOCALE_LABEL[locale]} text.`}
      </p>

      {visible.map((section) => (
        <fieldset key={section.id} id={`section-${section.id}`} className="gha-fieldset">
          <legend className="gha-legend">{section.title}</legend>
          {section.lead ? <p className="gha-hint">{section.lead}</p> : null}
          <div className="gha-stack">
            {section.fields.map((field) => (
              <ContentField key={field.key} field={field} locale={locale} editor={editor} />
            ))}
            {(section.media ?? []).map((media) => (
              <MediaSlot key={media.slot} def={media} locale={locale} editor={editor} />
            ))}
          </div>
        </fieldset>
      ))}

      {footer}
      </div>

      <PreviewDialog
        open={previewUrl !== null}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
        url={previewUrl ?? ''}
        isPrivate={false}
        note="Your saved draft, exactly as visitors would see it once published. Nothing is published by previewing."
      />
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard the unpublished changes?"
        description="The draft is removed and the editor goes back to what visitors see now. The website itself is not affected."
        confirmLabel="Discard changes"
        tone="danger"
        busy={busy === 'discard'}
        onConfirm={() => void discard()}
      />
    </div>
  );
}

type EditorApi = ReturnType<typeof useContentEditor>;

function ContentField({ field, locale, editor }: { field: FieldDef; locale: ContentLocale; editor: EditorApi }) {
  const value = editor.valueOf(field, locale);
  const custom = editor.isCustom(field, locale);
  const needs = editor.needsTranslation(field, locale);
  const english = needs ? editor.valueOf(field, 'en') : '';
  const original = originalValue(field.key, field.shared ? '*' : locale);
  const hints = [
    field.help,
    field.lines ? 'Use | to start a new line, as in the design.' : '',
    field.shared ? 'The same in every language.' : '',
    !original && !field.shared ? 'Only shown on the site once filled in.' : '',
  ].filter(Boolean);
  const problem = editor.problems.find((p) => p.key === field.key);
  const aside = (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      {needs ? <span className="gha-soon">Needs translation</span> : null}
      {!needs && locale !== 'en' && !field.shared && custom ? <span className="gha-meta">Translated</span> : null}
      {custom && original ? (
        <button
          type="button"
          className="gha-link"
          style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 12.5 }}
          onClick={() => editor.restoreField(field, locale)}
        >
          <RotateCcw size={12} aria-hidden /> Restore original
        </button>
      ) : null}
    </span>
  );

  return (
    <Field
      label={field.label}
      required={field.required}
      optional={!field.required && !original}
      hint={hints.join(' ') || undefined}
      error={problem && (value.trim() || field.required) ? `${field.label} ${problem.message}.` : undefined}
      aside={aside}
    >
      {(control) => (
        <>
          {field.kind === 'text' ? (
            <textarea
              {...control}
              className="gha-textarea"
              style={{ minHeight: value.length > 180 ? 140 : 84 }}
              maxLength={field.max ? field.max + 200 : 4000}
              value={value}
              placeholder={original || undefined}
              onChange={(event) => editor.setField(field, locale, event.target.value)}
            />
          ) : (
            <input
              {...control}
              className="gha-input"
              type={field.kind === 'email' ? 'email' : field.kind === 'url' ? 'url' : field.kind === 'number' ? 'number' : 'text'}
              inputMode={field.kind === 'phone' ? 'tel' : field.kind === 'number' ? 'numeric' : undefined}
              min={field.min}
              max={field.kind === 'number' ? field.max : undefined}
              value={value}
              placeholder={original || undefined}
              onChange={(event) => editor.setField(field, locale, event.target.value)}
            />
          )}
          {needs ? (
            <p className="gha-hint" style={{ marginTop: 6 }}>
              English now reads: “{english}”
            </p>
          ) : null}
        </>
      )}
    </Field>
  );
}

function MediaSlot({ def, locale, editor }: { def: MediaDef; locale: ContentLocale; editor: EditorApi }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const current = editor.media[def.slot];
  const original = ORIGINAL_MEDIA[def.slot] ?? '';
  const shown = current?.url || original;

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await editor.upload(file);
      editor.setImage(def.slot, { url, focus: current?.focus });
      toast.success(`${def.label} ${current ? 'replaced' : 'uploaded'}. Publish to show it on the website.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload this image.');
    } finally {
      setUploading(false);
    }
  };

  const altField: FieldDef | null = def.altKey
    ? { key: def.altKey, label: `${def.label}: description`, kind: 'line', max: 200, help: 'For screen readers and search engines. Say what the photograph shows.' }
    : null;

  return (
    <div className="gha-panel gha-panel--pad" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: 168, maxWidth: '100%', aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden', background: 'var(--gha-ivory)', flex: '0 0 auto' }}>
          {shown ? (
            <MediaImg
              src={shown}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: current?.focus || 'center' }}
            />
          ) : null}
        </div>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <span className="gha-label">{def.label}</span>
          <p className="gha-hint" style={{ margin: '4px 0 10px' }}>
            {current ? 'Your image.' : 'The original image.'} {def.help ?? ''} Images are the same in every language.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 size={14} className="gha-spin" aria-hidden /> : <ImagePlus size={14} aria-hidden />}
              {uploading ? 'Uploading…' : current ? 'Replace' : 'Upload a new image'}
              <span className="gha-sr-only"> for {def.label}</span>
            </button>
            {current ? (
              <button type="button" className="gha-btn gha-btn--ghost gha-btn--sm" onClick={() => editor.setImage(def.slot, null)}>
                <RotateCcw size={14} aria-hidden />
                Restore original
                <span className="gha-sr-only"> for {def.label}</span>
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="gha-sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void upload(file);
            }}
          />
        </div>
      </div>
      {def.focal && current ? (
        <Field label="Which part should stay in view" hint="Used when the photograph is cropped on different screens.">
          {(control) => (
            <select
              {...control}
              className="gha-select"
              value={current.focus ?? ''}
              onChange={(event) => editor.setImage(def.slot, { ...current, focus: event.target.value || undefined })}
            >
              {FOCUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      ) : null}
      {altField ? <ContentField field={altField} locale={locale} editor={editor} /> : null}
    </div>
  );
}
