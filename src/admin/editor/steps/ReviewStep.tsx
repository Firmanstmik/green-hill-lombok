import { useState } from 'react';
import { Check, Eye, Loader2, Lock } from 'lucide-react';
import { formatMoney } from '@/lib/opportunityPrice';
import {
  STATUS_LABEL,
  formatArea,
  isLive,
  isReadyToPublish,
  optionalChecks,
  publicLocationLine,
  requiredChecks,
  slugify,
  type OpportunityStatus,
} from '../../domain/opportunity';
import { useAdminPath } from '../../paths';
import { StepFrame, type StepProps } from './shared';

type ReviewProps = StepProps & {
  onPublish: (status: OpportunityStatus) => void;
  onPreview: () => void;
  publishing: boolean;
};

export function ReviewStep({ o, goTo, onPublish, onPreview, publishing }: ReviewProps) {
  const { language } = useAdminPath();
  const [status, setStatus] = useState<OpportunityStatus>(isLive(o.status) ? o.status : 'available');
  const required = requiredChecks(o);
  const optional = optionalChecks(o);
  const ready = isReadyToPublish(o);
  const missing = required.filter((check) => !check.done);
  const isPrivate = o.visibility === 'private';
  const live = isLive(o.status);
  const price =
    o.priceOnRequest || !o.priceAmount
      ? 'Price on request'
      : o.priceDisplay === 'range' && o.priceAmountMax
        ? `${formatMoney(o.priceAmount, o.priceCurrency)} – ${formatMoney(o.priceAmountMax, o.priceCurrency)}`
        : o.priceDisplay === 'from'
          ? `From ${formatMoney(o.priceAmount, o.priceCurrency)}`
          : formatMoney(o.priceAmount, o.priceCurrency);
  const url = `/${language}/property/${o.slug || slugify(o.title) || '…'}`;

  const publicRows: { label: string; value: string }[] = [
    { label: 'Appears', value: isPrivate ? 'Private: never shown on the website' : 'Public' },
    { label: 'Status', value: STATUS_LABEL[live ? o.status : status] },
    { label: 'Title', value: o.title || '—' },
    { label: 'Location', value: publicLocationLine(o) || '—' },
    { label: 'Type', value: o.type || '—' },
    ...(o.landSize ? [{ label: 'Land size', value: formatArea(o.landSize) }] : []),
    { label: 'Price', value: price },
    { label: 'Photographs', value: `${o.images.length}` },
    ...(o.tenure ? [{ label: 'Tenure', value: o.tenure }] : []),
    ...(o.featured && !isPrivate ? [{ label: 'Featured', value: 'Yes, may appear on the homepage' }] : []),
    ...(!isPrivate ? [{ label: 'Public page address', value: url }] : []),
  ];

  return (
    <StepFrame
      number="07"
      title={live ? 'Review' : 'Review & publish'}
      lead={
        live
          ? 'This opportunity is live. Here is what visitors currently see, and anything still worth adding.'
          : 'Check what is ready, then choose how it goes live.'
      }
    >
      <div className="gha-review">
        <section aria-labelledby="gha-ready">
          <h3 className="gha-h2" id="gha-ready">
            {ready ? 'Ready to publish' : `${missing.length} ${missing.length === 1 ? 'thing' : 'things'} needed to publish`}
          </h3>
          <ul className="gha-checks">
            {required.map((check) => (
              <li key={check.id}>
                <span className={`gha-check ${check.done ? 'gha-check--done' : 'gha-check--missing'}`} aria-hidden>
                  {check.done ? <Check size={13} /> : null}
                </span>
                <span>
                  {check.label}
                  <span className="gha-sr-only">{check.done ? ', done' : ', missing'}</span>
                </span>
                {!check.done ? (
                  <button type="button" className="gha-btn gha-btn--ghost gha-btn--sm" onClick={() => goTo(check.step)}>
                    Add
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <h3 className="gha-h2" style={{ marginTop: 28 }}>
            Optional
          </h3>
          <ul className="gha-checks">
            {optional.map((check) => (
              <li key={check.id}>
                <span className={`gha-check ${check.done ? 'gha-check--done' : 'gha-check--optional'}`} aria-hidden>
                  {check.done ? <Check size={13} /> : null}
                </span>
                <span style={{ color: check.done ? undefined : 'var(--gha-muted)' }}>
                  {check.label}
                  <span className="gha-sr-only">{check.done ? ', done' : ', not added'}</span>
                </span>
                {!check.done ? (
                  <button type="button" className="gha-btn gha-btn--ghost gha-btn--sm" onClick={() => goTo(check.step)}>
                    Add
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="gha-public">
          <h3 className="gha-h2" id="gha-public">
            {isPrivate ? 'What stays private' : 'What becomes public'}
          </h3>
          {isPrivate ? (
            <p className="gha-hint" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Lock size={14} aria-hidden style={{ marginTop: 3, flex: 'none' }} />
              Nothing below appears on the website. It is shown in your Private workspace, and the Green Hill Private page
              only reflects how many private opportunities exist.
            </p>
          ) : null}
          <dl className="gha-public">
            {publicRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
          <button type="button" className="gha-btn gha-btn--secondary" style={{ marginTop: 16 }} onClick={onPreview}>
            <Eye size={16} aria-hidden />
            Preview the memo
          </button>
        </section>
      </div>

      {!live && o.status !== 'archived' ? (
        <div className="gha-publish">
          <div className="gha-publish__text">
            <strong>{isPrivate ? 'Activate privately' : 'Publish opportunity'}</strong>
            {ready
              ? isPrivate
                ? 'It becomes active in your Private workspace. The website does not show it.'
                : 'It will appear on the website straight away. You can unpublish or archive it at any time.'
              : 'Complete the required items above first.'}
            <fieldset style={{ border: 0, padding: 0, margin: '14px 0 0' }}>
              <legend className="gha-sr-only">Status when published</legend>
              <div className="gha-choice" style={{ background: 'rgba(241,237,229,0.12)' }}>
                {(['available', 'reserved', 'sold'] as const).map((value) => (
                  <label key={value} style={{ color: status === value ? undefined : 'rgba(241,237,229,0.85)' }}>
                    <input type="radio" name="gha-publish-status" checked={status === value} onChange={() => setStatus(value)} />
                    {STATUS_LABEL[value]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <button
            type="button"
            className="gha-btn gha-btn--primary"
            disabled={!ready || publishing}
            onClick={() => onPublish(status)}
          >
            {publishing ? <Loader2 size={16} className="gha-spin" aria-hidden /> : null}
            {publishing ? 'Publishing…' : isPrivate ? 'Activate privately' : 'Publish opportunity'}
          </button>
        </div>
      ) : null}
    </StepFrame>
  );
}
