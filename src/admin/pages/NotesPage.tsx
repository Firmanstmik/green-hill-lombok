import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { useNotesList } from '../data/queries';
import type { NoteRecord, NoteStatus } from '../domain/content';
import { NOTE_TOPICS } from '../domain/content';
import { useAdminPath } from '../paths';
import { formatDate, timeAgo } from '../ui/format';
import { MediaImg } from '../ui/media';
import { EmptyState, ErrorState, PageHead, SkeletonRows } from '../ui/primitives';

const VIEWS: { value: NoteStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export const NOTE_STATUS: Record<NoteStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'gha-status--draft' },
  published: { label: 'Published', cls: 'gha-status--available' },
  archived: { label: 'Archived', cls: 'gha-status--archived' },
};

const translatedInto = (note: NoteRecord) =>
  (['id', 'nl', 'es'] as const).filter((locale) => note.translations[locale]?.title.trim()).length;

/** The Notes collection: field notes written by Reece. */
export function NotesPage() {
  const { admin } = useAdminPath();
  const notes = useNotesList();
  const [params, setParams] = useSearchParams();
  const view = (params.get('status') as NoteStatus | 'all' | null) ?? 'all';

  useEffect(() => {
    document.title = 'Notes · Green Hill Admin';
  }, []);

  const list = useMemo(() => {
    const all = notes.data ?? [];
    const visible = view === 'all' ? all.filter((n) => n.status !== 'archived') : all.filter((n) => n.status === view);
    return [...visible].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }, [notes.data, view]);
  const [now] = useState(() => Date.now());

  return (
    <div className="gha-enter">
      <PageHead
        eyebrow="Editorial"
        title="Notes"
        lead="Field notes on Lombok, land and buying well. Drafts stay private until you publish."
        actions={
          <Link className="gha-btn gha-btn--primary" to={admin('/notes/new')}>
            <Plus size={16} aria-hidden />
            New note
          </Link>
        }
      />

      <div className="gha-tabs" role="group" aria-label="Show notes" style={{ marginBottom: 20 }}>
        {VIEWS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="gha-tab"
            aria-pressed={view === item.value}
            onClick={() => setParams(item.value === 'all' ? {} : { status: item.value })}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notes.error ? <ErrorState message={(notes.error as Error).message} onRetry={() => void notes.refetch()} /> : null}
      {notes.isLoading ? <SkeletonRows rows={3} /> : null}
      {notes.data && list.length === 0 ? (
        <div className="gha-panel">
          <EmptyState
            title={view === 'all' ? 'No notes yet' : `No ${VIEWS.find((v) => v.value === view)?.label.toLowerCase()}`}
            text={view === 'all' ? 'Write the first note when you have something worth sharing from the ground.' : undefined}
            action={
              view === 'all' ? (
                <Link className="gha-btn gha-btn--secondary" to={admin('/notes/new')}>
                  Write a note
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : null}
      {list.length ? (
        <ul className="gha-content-list" aria-label="Notes">
          {list.map((note) => {
            const status = NOTE_STATUS[note.status];
            const topic = NOTE_TOPICS.find((t) => t.value === note.topic)?.label;
            const translations = translatedInto(note);
            return (
              <li key={note.id}>
                <Link className="gha-content-row" to={admin(`/notes/${note.id}`)}>
                  <span className="gha-content-row__thumb" aria-hidden>
                    {note.coverImage ? <MediaImg src={note.coverImage} alt="" /> : null}
                  </span>
                  <span className="gha-content-row__main">
                    <span className="gha-content-row__title">{note.translations.en.title || 'Untitled note'}</span>
                    <span className="gha-content-row__text">
                      {[topic, note.status === 'published' && note.publishedOn ? formatDate(note.publishedOn) : null, note.author]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="gha-content-row__meta">
                    <span className={`gha-status ${status.cls}`}>{status.label}</span>
                    <span className="gha-meta">{translations ? `+${translations} languages` : 'English only'}</span>
                    {note.updatedAt ? <span className="gha-meta">Edited {timeAgo(note.updatedAt, now)}</span> : null}
                  </span>
                  <ArrowRight size={16} aria-hidden className="gha-content-row__go" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
