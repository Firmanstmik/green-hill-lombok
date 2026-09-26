import { useId, type ReactNode } from 'react';
import { AlertCircle, ImageIcon, Lock, Star } from 'lucide-react';
import { STATUS_LABEL, type OpportunityStatus, type Visibility } from '../domain/opportunity';
import { ENQUIRY_STATUS_LABEL, type EnquiryStatus } from '../domain/enquiry';
import { MediaImg } from './media';

/* ------------------------------------------------------------------ */
/* Field: label ↔ control ↔ hint/error wiring in one place             */
/* ------------------------------------------------------------------ */

export type FieldControlProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
};

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  required?: boolean;
  aside?: ReactNode;
  id?: string;
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({ label, hint, error, optional, required, aside, id, children }: FieldProps) {
  const auto = useId();
  const controlId = id ?? `f${auto.replace(/:/g, '')}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="gha-field">
      <div className="gha-field__row">
        <label className="gha-label" htmlFor={controlId}>
          {label}
          {required ? <span className="gha-label__tag gha-label__tag--req">Required</span> : null}
          {optional ? <span className="gha-label__tag">Optional</span> : null}
        </label>
        {aside}
      </div>
      {children({
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })}
      {error ? (
        <p className="gha-error" id={errorId} role="alert">
          <AlertCircle size={14} aria-hidden style={{ marginTop: 2 }} />
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="gha-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function CharCount({ value, ideal }: { value: string; ideal: number }) {
  const length = value.trim().length;
  return (
    <span className="gha-count" data-state={length > ideal ? 'over' : 'ok'} aria-live="polite">
      {length} / {ideal}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status + visibility                                                 */
/* ------------------------------------------------------------------ */

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return <span className={`gha-status gha-status--${status}`}>{STATUS_LABEL[status]}</span>;
}

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  return <span className={`gha-status gha-status--${status}`}>{ENQUIRY_STATUS_LABEL[status]}</span>;
}

/** Private opportunities presented as a Green Hill Private teaser do appear on the website (only disclosed fields). */
export function VisibilityBadge({ visibility, teaser }: { visibility: Visibility; teaser?: boolean }) {
  return visibility === 'private' ? (
    <span className="gha-vis gha-vis--private" title={teaser ? 'Shown on Green Hill Private as a teaser' : 'Never shown on the website'}>
      <Lock size={11} aria-hidden />
      {teaser ? 'Private · Teaser' : 'Private'}
    </span>
  ) : (
    <span className="gha-vis">Public</span>
  );
}

export function FeaturedMark() {
  return (
    <span className="gha-featured" title="Featured on the homepage">
      <Star size={16} fill="currentColor" aria-hidden />
      <span className="gha-sr-only">Featured</span>
    </span>
  );
}

export function Thumb({ src, alt = '', size }: { src: string; alt?: string; size?: 'sm' }) {
  const cls = `gha-thumb${size === 'sm' ? ' gha-thumb--sm' : ''}`;
  return src ? (
    <MediaImg className={cls} src={src} alt={alt} loading="lazy" decoding="async" />
  ) : (
    <span className={`${cls} gha-thumb--empty`} aria-hidden>
      <ImageIcon size={18} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page structure                                                      */
/* ------------------------------------------------------------------ */

export function PageHead({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="gha-page-head">
      <div>
        {eyebrow ? <p className="gha-eyebrow">{eyebrow}</p> : null}
        <h1 className="gha-title">{title}</h1>
        {lead ? <p className="gha-lead">{lead}</p> : null}
      </div>
      {actions ? <div className="gha-page-head__actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  text,
  action,
  compact,
}: {
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`gha-empty${compact ? ' gha-empty--compact' : ''}`}>
      <span className="gha-empty__rule" aria-hidden />
      <p className="gha-empty__title">{title}</p>
      {text ? <p className="gha-empty__text">{text}</p> : null}
      {action ? <div className="gha-empty__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="gha-alert" role="alert">
      <AlertCircle size={18} aria-hidden color="var(--gha-error)" />
      <div>
        <span className="gha-alert__title">Something went wrong</span>
        <span>{message}</span>
        {onRetry ? (
          <div style={{ marginTop: 10 }}>
            <button type="button" className="gha-btn gha-btn--secondary gha-btn--sm" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SkeletonRows({ rows = 5, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="gha-sr-only">{label}…</span>
      <ul className="gha-list" aria-hidden>
        {Array.from({ length: rows }).map((_, index) => (
          <li key={index} className="gha-list__item">
            <span className="gha-skel" style={{ width: 76, height: 56 }} />
            <span style={{ flex: 1 }}>
              <span className="gha-skel" style={{ width: '46%', height: 14 }} />
              <span className="gha-skel" style={{ width: '28%', height: 12, marginTop: 8 }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
