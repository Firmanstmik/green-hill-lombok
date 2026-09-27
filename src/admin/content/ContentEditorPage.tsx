import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, Eye, ImagePlus, Loader2, Monitor, RotateCcw, Send, Undo2 } from '@/icons/iconsax';
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
  const { admin } = useAdminPath();
  const editor = useContentEditor(page);
  const [locale, setLocale] = useState<ContentLocale>('en');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice | null>(null);
  const [livePreview, setLivePreview] = useState<boolean>(() => readLivePreviewPref());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<string>('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState<'publish' | 'discard' | 'save' | null>(null);
  const [now, setNow] = useState(Date.now());
  const headRef = useRef<HTMLElement>(null);
  const isSettings = page.group === 'settings';
  const heading = title ?? page.title;
  const visible = sections ? page.sections.filter((section) => sections.includes(section.id)) : page.sections;
  const hasPreview = page.path !== null;
  // The preview follows the language being edited.
  const previewUrl = hasPreview ? `/${locale}${page.path ?? ''}?cms-preview=1` : '';

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

  // Sticky pieces sit below the page header, whatever its height.
  useEffect(() => {
    const node = headRef.current;
    if (!node) return;
    const set = () => document.documentElement.style.setProperty('--gha-head-h', `${node.offsetHeight}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(node);
    return () => observer.disconnect();
  }, [editor.loading]);

  // The section in view is marked in the section navigation.
  useEffect(() => {
    if (editor.loading) return;
    const nodes = visible.map((section) => document.getElementById(`section-${section.id}`)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActiveSection(hit.target.id.replace('section-', ''));
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.loading, visible.length]);

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
                ? 'Up to date'
                : 'No changes yet';
  const saveState =
    editor.state === 'saving' ? 'saving' : editor.state === 'dirty' ? 'dirty' : editor.state === 'error' || editor.state === 'conflict' ? 'error' : 'saved';

  const statusChip =
    editor.status === 'changes'
      ? { cls: 'gha-status--draft', text: 'Draft · not yet published' }
      : editor.status === 'published'
        ? { cls: 'gha-status--available', text: 'Published' }
        : { cls: 'gha-status--archived', text: 'Original copy' };

  const openPreview = async (device: PreviewDevice) => {
    await editor.saveNow();
    setPreviewDevice(device);
  };

  const saveDraft = async () => {
    setBusy('save');
    try {
      await editor.saveNow();
    } finally {
      setBusy(null);
    }
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

  const toggleLivePreview = () => {
    setLivePreview((value) => {
      writeLivePreviewPref(!value);
      return !value;
    });
  };

  const canPublish = editor.problems.length === 0 && (editor.status === 'changes' || editor.state === 'dirty');
  const canSave = editor.state === 'dirty' || editor.state === 'error';

  const sectionInfo = visible.map((section, index) => {
    const keys = new Set([...section.fields.map((f) => f.key), ...(section.media ?? []).map((m) => m.altKey).filter(Boolean)]);
    const problems = editor.problems.filter((p) => keys.has(p.key)).length;
    const edited =
      section.fields.filter((f) => editor.isCustom(f, locale)).length + (section.media ?? []).filter((m) => editor.media[m.slot]).length;
    return { section, number: String(index + 1).padStart(2, '0'), problems, edited };
  });

  const goToSection = (id: string) => {
    setCollapsed((c) => ({ ...c, [id]: false }));
    requestAnimationFrame(() => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const actions = (
    <>
      {hasPreview ? (
        <button type="button" className="gha-btn gha-btn--secondary" onClick={() => void openPreview('desktop')}>
          <Eye size={16} aria-hidden />
          Preview
        </button>
      ) : null}
      <button type="button" className="gha-btn gha-btn--secondary" disabled={!canSave || busy !== null} onClick={() => void saveDraft()}>
        {busy === 'save' || editor.state === 'saving' ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
        Save draft
      </button>
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
    </>
  );

  return (
    <div className="gha-studio-page">
      <header className="gha-editor-head gha-studio-head" ref={headRef}>
        <nav className="gha-crumbs" aria-label="Breadcrumb">
          <Link to={admin(isSettings ? '/settings/site' : '/content')}>{isSettings ? 'Settings' : 'Content'}</Link>
          <span aria-hidden>›</span>
          <span aria-current="page">{heading}</span>
        </nav>
        <div className="gha-editor-head__row">
          <div className="gha-editor-head__id">
            <h1 className="gha-editor-head__title">{heading}</h1>
            <div className="gha-editor-head__meta">
              <span className={`gha-status ${statusChip.cls}`}>{statusChip.text}</span>
              <span className="gha-save" data-state={saveState} role="status" aria-live="polite">
                <span className="gha-save__dot" aria-hidden />
                {saveLabel}
              </span>
            </div>
          </div>
          <div className="gha-editor-head__actions gha-studio-head__actions">
            {editor.status === 'changes' ? (
              <button type="button" className="gha-btn gha-btn--ghost" onClick={() => setConfirmDiscard(true)}>
                <Undo2 size={16} aria-hidden />
                Discard changes
              </button>
            ) : null}
            {actions}
          </div>
        </div>
      </header>

      <p className="gha-studio-intro">
        {intro ?? page.summary} Changes are kept as a draft until you publish; visitors keep seeing the current page.
      </p>

      {editor.state === 'conflict' ? (
        <div className="gha-alert gha-studio-alert" role="alert">
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
        <div className="gha-alert gha-studio-alert" role="alert">
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
        <div className="gha-alert gha-alert--gold gha-studio-alert" id="gha-content-problems">
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

      <div className="gha-studio" data-preview={hasPreview && livePreview ? 'on' : 'off'}>
        <nav className="gha-studio-nav" aria-label="Sections on this page">
          <p className="gha-studio-nav__label">On this page</p>
          <ol className="gha-studio-nav__list">
            {sectionInfo.map(({ section, number, problems }) => (
              <li key={section.id}>
                <button
                  type="button"
                  className="gha-studio-nav__item"
                  aria-current={activeSection === section.id ? 'true' : undefined}
                  onClick={() => goToSection(section.id)}
                >
                  <span className="gha-studio-nav__num">{number}</span>
                  <span className="gha-studio-nav__name">{section.title}</span>
                  <span className="gha-studio-nav__state" data-state={problems ? 'attention' : 'complete'} aria-label={problems ? 'Needs attention' : 'Complete'} />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="gha-studio-main">
          <div className="gha-studio-lang">
            <div className="gha-tabs" role="group" aria-label="Language">
              {CONTENT_LOCALES.map((code) => {
                const count = editor.translationCounts[code];
                return (
                  <button key={code} type="button" className="gha-tab" aria-pressed={locale === code} onClick={() => setLocale(code)}>
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
            <p className="gha-hint">
              {locale === 'en'
                ? 'English is the main version. Other languages keep their approved translation until you change them.'
                : `Editing the ${LOCALE_LABEL[locale]} version. Fields marked “Needs translation” changed in English and still show the older ${LOCALE_LABEL[locale]} text.`}
            </p>
          </div>

          {sectionInfo.map(({ section, number, problems, edited }) => {
            const open = !collapsed[section.id];
            const bodyId = `section-body-${section.id}`;
            const hasMedia = (section.media ?? []).length > 0;
            const hasFields = section.fields.length > 0;
            return (
              <section key={section.id} id={`section-${section.id}`} className="gha-scard" aria-labelledby={`section-title-${section.id}`}>
                <header className="gha-scard__head">
                  <span className="gha-scard__num" aria-hidden>
                    {number}
                  </span>
                  <div className="gha-scard__id">
                    <h2 className="gha-scard__title" id={`section-title-${section.id}`}>
                      {section.title}
                    </h2>
                    {section.lead ? <p className="gha-scard__lead">{section.lead}</p> : null}
                  </div>
                  <div className="gha-scard__side">
                    <span className="gha-scard__state" data-state={problems ? 'attention' : 'complete'}>
                      <span className="gha-scard__dot" aria-hidden />
                      {problems ? `Needs attention (${problems})` : 'Complete'}
                    </span>
                    <span className="gha-scard__edited">{edited ? `${edited} edited` : 'Original copy'}</span>
                  </div>
                  <button
                    type="button"
                    className="gha-scard__toggle"
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={() => setCollapsed((c) => ({ ...c, [section.id]: open }))}
                  >
                    <ChevronDown size={18} aria-hidden />
                    <span className="gha-sr-only">{open ? `Collapse ${section.title}` : `Expand ${section.title}`}</span>
                  </button>
                </header>
                <div className="gha-scard__body" id={bodyId} hidden={!open}>
                  {hasMedia ? (
                    <div className="gha-fgroup">
                      {hasFields ? <p className="gha-fgroup__label">Photography</p> : null}
                      <div className="gha-media-grid">
                        {(section.media ?? []).map((media) => (
                          <MediaSlot key={media.slot} def={media} locale={locale} editor={editor} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {hasFields ? (
                    <div className="gha-fgroup">
                      {hasMedia ? <p className="gha-fgroup__label">Words</p> : null}
                      <div className="gha-stack gha-fgroup__fields">
                        {section.fields.map((field) => (
                          <ContentField key={field.key} field={field} locale={locale} editor={editor} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}

          {footer}
        </div>

        {hasPreview && livePreview ? (
          <LivePreview
            url={previewUrl}
            version={editor.lastSaved}
            onDevice={(device) => void openPreview(device)}
            onHide={toggleLivePreview}
          />
        ) : null}
      </div>

      {hasPreview && !livePreview ? (
        <button type="button" className="gha-studio-show-preview" onClick={toggleLivePreview}>
          <Eye size={16} aria-hidden />
          Show live preview
        </button>
      ) : null}

      {/* Phones: the actions stay within reach of the thumb. */}
      <div className="gha-studio-bar" role="group" aria-label="Page actions">
        <span className="gha-save gha-studio-bar__state" data-state={saveState} aria-hidden>
          <span className="gha-save__dot" />
          {saveLabel}
        </span>
        <div className="gha-studio-bar__buttons">{actions}</div>
      </div>

      <PreviewDialog
        open={previewDevice !== null}
        onOpenChange={(open) => !open && setPreviewDevice(null)}
        url={previewUrl}
        isPrivate={false}
        initialDevice={previewDevice ?? 'desktop'}
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

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const LIVE_PREVIEW_KEY = 'gh-admin-live-preview';
function readLivePreviewPref(): boolean {
  try {
    return localStorage.getItem(LIVE_PREVIEW_KEY) !== 'off';
  } catch {
    return true;
  }
}
function writeLivePreviewPref(on: boolean) {
  try {
    localStorage.setItem(LIVE_PREVIEW_KEY, on ? 'on' : 'off');
  } catch {
    // Private windows may refuse storage; the choice simply is not remembered.
  }
}

/**
 * The real public page (same components, same CSS) in a phone-width frame
 * beside the editor. It shows the saved draft and reloads after each save,
 * keeping its scroll position. Tablet and desktop open the full preview.
 */
function LivePreview({
  url,
  version,
  onDevice,
  onHide,
}: {
  url: string;
  version: string | null;
  onDevice: (device: PreviewDevice) => void;
  onHide: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const scroll = useRef(0);
  const [loading, setLoading] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const win = frame.current?.contentWindow;
    if (!win) return;
    try {
      scroll.current = win.scrollY;
      setLoading(true);
      win.location.reload();
    } catch {
      // Cross-origin frames cannot be reloaded from here; the next open shows the latest draft.
    }
  }, [version]);

  return (
    <aside className="gha-live" aria-label="Live preview">
      <div className="gha-live__bar">
        <p className="gha-live__title">
          Live preview
          <span className="gha-live__note">Saved draft · phone</span>
        </p>
        <div className="gha-live__devices" role="group" aria-label="Open a larger preview">
          <button type="button" className="gha-live__device" onClick={() => onDevice('tablet')} aria-label="Preview on a tablet">
            Tablet
          </button>
          <button type="button" className="gha-live__device" onClick={() => onDevice('desktop')} aria-label="Preview on a desktop">
            <Monitor size={15} aria-hidden />
            Desktop
          </button>
          <button type="button" className="gha-live__hide" onClick={onHide}>
            Hide
          </button>
        </div>
      </div>
      <div className="gha-live__phone" data-loading={loading || undefined}>
        <iframe
          ref={frame}
          src={url}
          title="Live preview of this page on a phone"
          onLoad={() => {
            setLoading(false);
            try {
              frame.current?.contentWindow?.scrollTo(0, scroll.current);
            } catch {
              // ignore
            }
          }}
        />
      </div>
    </aside>
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
    ? { key: def.altKey, label: 'Image description', kind: 'line', max: 200, help: 'For screen readers and search engines. Say what the photograph shows.' }
    : null;

  return (
    <figure className="gha-mcard">
      <div className="gha-mcard__frame">
        {shown ? (
          <MediaImg src={shown} alt="" className="gha-mcard__img" style={{ objectPosition: current?.focus || 'center' }} />
        ) : (
          <span className="gha-mcard__empty">No image yet</span>
        )}
        <span className="gha-mcard__badge">{current ? 'Your image' : 'Original image'}</span>
      </div>
      <figcaption className="gha-mcard__body">
        <span className="gha-mcard__label">{def.label}</span>
        <p className="gha-mcard__help">
          {def.help ?? ''} The same photograph in every language.
        </p>
        <div className="gha-mcard__actions">
          <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 size={14} className="gha-spin" aria-hidden /> : <ImagePlus size={14} aria-hidden />}
            {uploading ? 'Uploading…' : current ? 'Replace image' : 'Upload a new image'}
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
      </figcaption>
    </figure>
  );
}
