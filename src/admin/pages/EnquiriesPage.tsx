import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Lock, Mail, MessageCircle, Plus, Search } from '@/icons/iconsax';
import {
  useAddNote,
  useCreateEnquiry,
  useEnquiries,
  useEnquiryActivity,
  useOpportunities,
  useUpdateEnquiryStatus,
} from '../data/queries';
import {
  ENQUIRY_SOURCE_LABEL,
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_HINT,
  ENQUIRY_STATUS_LABEL,
  isOpen,
  whatsappLink,
  type Enquiry,
  type EnquirySource,
  type EnquiryStatus,
} from '../domain/enquiry';
import { errorMessage } from '../opportunityActions';
import { useAdminPath } from '../paths';
import { formatDate, formatDateTime, plural, timeAgo } from '../ui/format';
import { Modal, Sheet } from '../ui/overlays';
import { EmptyState, EnquiryStatusBadge, ErrorState, Field, PageHead, SkeletonRows } from '../ui/primitives';

type View = 'open' | EnquiryStatus | 'all';

const VIEWS: { id: View; label: string }[] = [
  { id: 'open', label: 'Open' },
  ...ENQUIRY_STATUSES.map((status) => ({ id: status as View, label: ENQUIRY_STATUS_LABEL[status] })),
  { id: 'all', label: 'All' },
];

function matchesView(enquiry: Enquiry, view: View) {
  if (view === 'all') return true;
  if (view === 'open') return isOpen(enquiry);
  return enquiry.status === view;
}

/**
 * Enquiry list + detail. Also used (filtered to private sources) by the Private workspace.
 */
/** Brief §9 / §21 qualification answers, when the visitor gave any. */
function hasProfile(e: Enquiry): boolean {
  return Boolean(e.company || e.budget || e.investorType || e.interests.length || e.objective || e.timeframe);
}

export function EnquiryWorkspace({ privateOnly = false }: { privateOnly?: boolean }) {
  const [params, setParams] = useSearchParams();
  const query = useEnquiries();
  const view = (params.get('status') as View) || 'open';
  const selectedId = params.get('id');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<'all' | EnquirySource>('all');

  const scoped = useMemo(
    () => (query.data ?? []).filter((e) => (privateOnly ? e.source === 'private' : true)),
    [query.data, privateOnly],
  );
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const v of VIEWS) result[v.id] = scoped.filter((e) => matchesView(e, v.id)).length;
    return result;
  }, [scoped]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((e) => {
      if (!matchesView(e, view)) return false;
      if (!privateOnly && source !== 'all' && e.source !== source) return false;
      if (!q) return true;
      return [e.name, e.email, e.whatsapp, e.country, e.opportunityTitle, e.enquiryType, e.message]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [scoped, view, search, source, privateOnly]);

  const selected = scoped.find((e) => e.id === selectedId) ?? null;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: key === 'status' });
  };

  if (query.isError) return <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />;

  return (
    <>
      <div className="gha-tabs" role="group" aria-label="Show enquiries by status">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="gha-tab"
            aria-pressed={view === v.id}
            onClick={() => setParam('status', v.id === 'open' ? null : v.id)}
          >
            {v.label}
            <span className="gha-tab__count">{query.isLoading ? '' : counts[v.id]}</span>
          </button>
        ))}
      </div>

      <div className="gha-toolbar" role="search" aria-label="Search enquiries">
        <div className="gha-search">
          <Search size={17} aria-hidden />
          <label className="gha-sr-only" htmlFor={`gha-enq-search-${privateOnly ? 'p' : 'a'}`}>
            Search enquiries
          </label>
          <input
            id={`gha-enq-search-${privateOnly ? 'p' : 'a'}`}
            className="gha-input"
            type="search"
            placeholder="Search name, contact, country or message"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {!privateOnly ? (
          <>
            <label className="gha-sr-only" htmlFor="gha-enq-source">Source</label>
            <select
              id="gha-enq-source"
              className="gha-select"
              value={source}
              onChange={(event) => setSource(event.target.value as typeof source)}
            >
              <option value="all">All sources</option>
              {(Object.keys(ENQUIRY_SOURCE_LABEL) as EnquirySource[]).map((key) => (
                <option key={key} value={key}>
                  {ENQUIRY_SOURCE_LABEL[key]}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <p className="gha-meta" role="status" aria-live="polite" style={{ margin: '0 0 12px' }}>
        {query.isLoading ? 'Loading enquiries…' : plural(rows.length, 'enquiry', 'enquiries')}
      </p>

      <div className="gha-panel">
        {query.isLoading ? (
          <SkeletonRows rows={4} label="Loading enquiries" />
        ) : rows.length === 0 ? (
          scoped.length === 0 ? (
            <EmptyState
              title={privateOnly ? 'No private enquiries yet' : 'No enquiries yet'}
              text={
                privateOnly
                  ? 'Enquiries sent from the Green Hill Private page will appear here.'
                  : 'Your conversations will appear here once someone reaches out. You can also record one that started on WhatsApp.'
              }
            />
          ) : (
            <EmptyState compact title="Nothing here" text="No enquiries match this view." />
          )
        ) : (
          <>
            <div className="gha-table-wrap">
              <table className="gha-table">
                <caption className="gha-sr-only">Enquiries</caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Regarding</th>
                    <th scope="col">Country</th>
                    <th scope="col">WhatsApp</th>
                    <th scope="col">Status</th>
                    <th scope="col">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <button
                          type="button"
                          className="gha-opp__title"
                          style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 500, textAlign: 'left' }}
                          onClick={() => setParam('id', e.id)}
                        >
                          {e.name}
                        </button>
                        <span className="gha-opp__sub">
                          {e.source === 'private' ? (
                            <>
                              <Lock size={11} aria-hidden /> Private ·{' '}
                            </>
                          ) : null}
                          {e.email || ENQUIRY_SOURCE_LABEL[e.source]}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span className="gha-opp__sub" style={{ color: 'var(--gha-ink)' }}>
                          {e.opportunityTitle || e.enquiryType || '—'}
                        </span>
                      </td>
                      <td className="gha-meta">{e.country || '—'}</td>
                      <td className="gha-meta gha-mono">{e.whatsapp || '—'}</td>
                      <td>
                        <EnquiryStatusBadge status={e.status} />
                      </td>
                      <td className="gha-meta" style={{ whiteSpace: 'nowrap' }} title={formatDateTime(e.createdAt)}>
                        {formatDate(e.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="gha-list gha-rowcards">
              {rows.map((e) => (
                <li key={e.id}>
                  <button type="button" className="gha-list__item" onClick={() => setParam('id', e.id)}>
                    <span className="gha-list__body">
                      <span className="gha-opp__title">{e.name}</span>
                      <span className="gha-opp__sub" style={{ whiteSpace: 'normal' }}>
                        {[e.opportunityTitle || e.enquiryType, e.country, timeAgo(e.createdAt)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="gha-list__end">
                      <EnquiryStatusBadge status={e.status} />
                      {e.source === 'private' ? <span className="gha-vis gha-vis--private">Private</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setParam('id', null)}
        label={selected ? `Enquiry from ${selected.name}` : 'Enquiry'}
        title={
          selected ? (
            <>
              <p className="gha-eyebrow" style={{ marginBottom: 6 }}>
                {ENQUIRY_SOURCE_LABEL[selected.source]}
              </p>
              <h2 className="gha-dialog__title">{selected.name}</h2>
              <p className="gha-meta" style={{ margin: '4px 0 0' }}>
                Received {formatDateTime(selected.createdAt)}
              </p>
            </>
          ) : null
        }
      >
        {selected ? <EnquiryDetail enquiry={selected} /> : null}
      </Sheet>
    </>
  );
}

function EnquiryDetail({ enquiry }: { enquiry: Enquiry }) {
  const { admin } = useAdminPath();
  const activity = useEnquiryActivity(enquiry.id);
  const updateStatus = useUpdateEnquiryStatus();
  const addNote = useAddNote();
  const [note, setNote] = useState('');
  const wa = whatsappLink(enquiry.whatsapp);

  const changeStatus = async (status: EnquiryStatus) => {
    if (status === enquiry.status) return;
    try {
      await updateStatus.mutateAsync({ id: enquiry.id, status });
      toast.success(`Marked as ${ENQUIRY_STATUS_LABEL[status].toLowerCase()}.`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update the status.'));
    }
  };

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    try {
      await addNote.mutateAsync({ enquiryId: enquiry.id, body: note });
      setNote('');
      toast.success('Note added.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save this note.'));
    }
  };

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <section aria-labelledby="gha-enq-contact">
        <h3 className="gha-h2" id="gha-enq-contact">
          Contact
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
          {wa ? (
            <a className="gha-btn gha-btn--primary gha-btn--sm" href={wa} target="_blank" rel="noreferrer">
              <MessageCircle size={15} aria-hidden />
              WhatsApp
            </a>
          ) : null}
          {enquiry.email ? (
            <a className="gha-btn gha-btn--secondary gha-btn--sm" href={`mailto:${enquiry.email}`}>
              <Mail size={15} aria-hidden />
              Email
            </a>
          ) : null}
        </div>
        <dl className="gha-contact">
          <div>
            <dt>Email</dt>
            <dd>{enquiry.email || '—'}</dd>
          </div>
          <div>
            <dt>WhatsApp</dt>
            <dd className="gha-mono">{enquiry.whatsapp || '—'}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{enquiry.country || '—'}</dd>
          </div>
          <div>
            <dt>Interest</dt>
            <dd>{enquiry.enquiryType || '—'}</dd>
          </div>
          <div>
            <dt>Opportunity</dt>
            <dd>
              {enquiry.opportunityId ? (
                <Link className="gha-link" to={admin(`/opportunities/${enquiry.opportunityId}`)}>
                  {enquiry.opportunityTitle || 'Open opportunity'}
                </Link>
              ) : (
                enquiry.opportunityTitle || '—'
              )}
            </dd>
          </div>
        </dl>
      </section>

      {hasProfile(enquiry) ? (
        <section aria-labelledby="gha-enq-profile">
          <h3 className="gha-h2" id="gha-enq-profile">
            Investor profile
          </h3>
          <dl className="gha-contact" style={{ marginTop: 12 }}>
            {[
              ['Company', enquiry.company],
              [enquiry.source === 'private' ? 'Capital available' : 'Budget', enquiry.budget],
              ['Investor type', enquiry.investorType],
              ['Interests', enquiry.interests.join(', ')],
              ['Main objective', enquiry.objective],
              ['Timeframe', enquiry.timeframe],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      ) : null}

      {enquiry.message ? (
        <section aria-labelledby="gha-enq-message">
          <h3 className="gha-h2" id="gha-enq-message" style={{ marginBottom: 12 }}>
            Message
          </h3>
          <p className="gha-message">{enquiry.message}</p>
        </section>
      ) : null}

      <section aria-labelledby="gha-enq-status">
        <h3 className="gha-h2" id="gha-enq-status" style={{ marginBottom: 12 }}>
          Where this stands
        </h3>
        <div className="gha-lifecycle" role="group" aria-labelledby="gha-enq-status">
          {ENQUIRY_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={enquiry.status === status}
              disabled={updateStatus.isPending}
              onClick={() => void changeStatus(status)}
            >
              {ENQUIRY_STATUS_LABEL[status]}
            </button>
          ))}
        </div>
        <p className="gha-hint" style={{ marginTop: 8 }}>
          {ENQUIRY_STATUS_HINT[enquiry.status]}
        </p>
      </section>

      <section aria-labelledby="gha-enq-notes">
        <h3 className="gha-h2" id="gha-enq-notes">
          Notes &amp; history
        </h3>
        <form onSubmit={submitNote} style={{ marginTop: 12 }}>
          <label className="gha-sr-only" htmlFor="gha-note">
            Add a private note
          </label>
          <textarea
            id="gha-note"
            className="gha-textarea"
            style={{ minHeight: 80 }}
            placeholder="A private note: what was discussed, what comes next…"
            maxLength={4000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <span className="gha-hint">Only visible in the admin.</span>
            <button type="submit" className="gha-btn gha-btn--secondary gha-btn--sm" disabled={!note.trim() || addNote.isPending}>
              {addNote.isPending ? <Loader2 size={14} className="gha-spin" aria-hidden /> : null}
              Add note
            </button>
          </div>
        </form>

        {activity.isLoading ? (
          <SkeletonRows rows={2} label="Loading history" />
        ) : (
          <ol className="gha-timeline" aria-label="History">
            {[...(activity.data ?? [])].reverse().map((item) => (
              <li key={item.id} data-kind={item.kind}>
                {item.kind === 'note' ? (
                  <>
                    <span className="gha-timeline__what">Note</span>
                    <p className="gha-timeline__note">{item.body}</p>
                  </>
                ) : item.kind === 'status' ? (
                  <span className="gha-timeline__what">
                    Moved from {item.fromStatus ? ENQUIRY_STATUS_LABEL[item.fromStatus] : '—'} to{' '}
                    <strong style={{ fontWeight: 500 }}>{item.toStatus ? ENQUIRY_STATUS_LABEL[item.toStatus] : '—'}</strong>
                  </span>
                ) : (
                  <span className="gha-timeline__what">Enquiry received</span>
                )}
                <time className="gha-timeline__when" dateTime={item.createdAt}>
                  {formatDateTime(item.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function RecordEnquiryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateEnquiry();
  const opportunities = useOpportunities();
  const [, setParams] = useSearchParams();
  const empty = { name: '', email: '', whatsapp: '', country: '', enquiryType: '', message: '', opportunityId: '', isPrivate: false };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(empty);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key: keyof typeof form) => (value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Add a name.');
    if (!form.email.trim() && !form.whatsapp.trim()) return setError('Add an email address or a WhatsApp number.');
    const related = (opportunities.data ?? []).find((o) => o.id === form.opportunityId);
    try {
      const saved = await create.mutateAsync({
        name: form.name,
        email: form.email,
        whatsapp: form.whatsapp,
        country: form.country,
        enquiryType: form.enquiryType,
        message: form.message,
        source: form.isPrivate ? 'private' : 'manual',
        opportunityId: related?.id ?? null,
        opportunityTitle: related?.title ?? '',
      });
      toast.success('Enquiry recorded.');
      onOpenChange(false);
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('id', saved.id);
        return next;
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not record this enquiry.'));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record an enquiry"
      description="For conversations that started on WhatsApp, by phone or in person."
    >
      <form onSubmit={submit} noValidate style={{ marginTop: 20 }}>
        <Field label="Name" required>
          {(c) => <input {...c} className="gha-input" value={form.name} onChange={(e) => set('name')(e.target.value)} />}
        </Field>
        <div className="gha-grid gha-grid--2">
          <Field label="Email" optional>
            {(c) => <input {...c} className="gha-input" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} />}
          </Field>
          <Field label="WhatsApp" optional>
            {(c) => <input {...c} className="gha-input" type="tel" value={form.whatsapp} onChange={(e) => set('whatsapp')(e.target.value)} />}
          </Field>
        </div>
        <div className="gha-grid gha-grid--2">
          <Field label="Country" optional>
            {(c) => <input {...c} className="gha-input" value={form.country} onChange={(e) => set('country')(e.target.value)} />}
          </Field>
          <Field label="Interest" optional hint="e.g. Land, Development, Hospitality">
            {(c) => <input {...c} className="gha-input" value={form.enquiryType} onChange={(e) => set('enquiryType')(e.target.value)} />}
          </Field>
        </div>
        <Field label="Related opportunity" optional>
          {(c) => (
            <select {...c} className="gha-select" value={form.opportunityId} onChange={(e) => set('opportunityId')(e.target.value)}>
              <option value="">None</option>
              {(opportunities.data ?? [])
                .filter((o) => o.status !== 'archived')
                .map((o) => (
                  <option key={o.id} value={o.id ?? ''}>
                    {o.title || 'Untitled'} {o.reference ? `(${o.reference})` : ''}
                  </option>
                ))}
            </select>
          )}
        </Field>
        <Field label="What they are looking for" optional>
          {(c) => <textarea {...c} className="gha-textarea" value={form.message} onChange={(e) => set('message')(e.target.value)} />}
        </Field>
        <label className="gha-switch" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={form.isPrivate} onChange={(e) => set('isPrivate')(e.target.checked)} />
          <span className="gha-switch__track" aria-hidden />
          Handle as a Green Hill Private enquiry
        </label>
        {error ? (
          <p className="gha-error" role="alert" style={{ marginTop: 12 }}>
            {error}
          </p>
        ) : null}
        <div className="gha-dialog__foot">
          <button type="button" className="gha-btn gha-btn--secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button type="submit" className="gha-btn gha-btn--primary" disabled={create.isPending}>
            {create.isPending ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
            Record enquiry
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function EnquiriesPage() {
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    document.title = 'Enquiries · Green Hill Admin';
  }, []);
  return (
    <div className="gha-enter">
      <PageHead
        eyebrow="Enquiries"
        title="Enquiries"
        lead="Everyone who has reached out, and where each conversation stands."
        actions={
          <button type="button" className="gha-btn gha-btn--primary" onClick={() => setRecording(true)}>
            <Plus size={18} aria-hidden />
            Record enquiry
          </button>
        }
      />
      <EnquiryWorkspace />
      <RecordEnquiryDialog open={recording} onOpenChange={setRecording} />
    </div>
  );
}
