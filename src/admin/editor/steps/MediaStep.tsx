import { useRef, useState } from 'react';
import { ArrowUpRight, FileText, FileUp, Loader2, Trash2 } from '@/icons/iconsax';
import { toast } from 'sonner';
import { getEmbedUrl } from '@/lib/video-utils';
import { useRepository } from '../../AdminSession';
import { isPrivateRef } from '../../domain/media';
import { isLive } from '../../domain/opportunity';
import { Field } from '../../ui/primitives';
import { MediaManager } from '../MediaManager';
import { StepFrame, type StepProps } from './shared';

function DocumentField({
  label,
  value,
  error,
  onChange,
  help,
  show,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (url: string) => void;
  help: string;
  /** Omitted for documents that are never public (the memorandum). */
  show?: { checked: boolean; available: boolean; onChange: (checked: boolean) => void };
}) {
  const repository = useRepository();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const canUpload = repository.mode === 'supabase';

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const replacing = Boolean(value);
      onChange(await repository.uploadDocument(file));
      toast.success(replacing ? `${label} replaced.` : `${label} uploaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload this document.');
    } finally {
      setBusy(false);
    }
  };

  // Private files open through a short-lived signed link. The tab is opened
  // first so the browser does not treat it as an unrequested pop-up.
  const openStored = async () => {
    const tab = window.open('about:blank', '_blank');
    try {
      const url = (await repository.resolveMedia([value]))[value];
      if (!url) throw new Error('This document could not be found in storage.');
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      }
    } catch (err) {
      tab?.close();
      toast.error(err instanceof Error ? err.message : 'Could not open this document.');
    }
  };

  const stored = isPrivateRef(value);

  const picker = (
    <input
      ref={fileRef}
      type="file"
      accept="application/pdf"
      className="gha-sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void upload(file);
      }}
    />
  );

  return (
    <Field
      label={label}
      optional
      error={error}
      hint={
        <>
          {help}{' '}
          {stored
            ? 'Stored privately: only you can open it.'
            : canUpload
              ? 'Upload a PDF (kept private) or paste a link.'
              : 'Paste a link to the PDF (uploads need the Green Hill database).'}{' '}
          {show ? null : <span className="gha-soon">Never shown on the website</span>}
          {show ? (
            <label className="gha-switch" style={{ display: 'flex', marginTop: 10 }}>
              <input
                type="checkbox"
                checked={show.checked}
                disabled={!show.available}
                onChange={(event) => show.onChange(event.target.checked)}
              />
              <span className="gha-switch__track" aria-hidden />
              {show.available
                ? 'Offer it for download on the website'
                : 'Offer it for download (available once the opportunity is public or a private teaser)'}
            </label>
          ) : null}
        </>
      }
    >
      {(control) =>
        stored ? (
          <div className="gha-doc__row">
            <span
              id={control.id}
              aria-describedby={control['aria-describedby']}
              className="gha-input"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FileText size={16} aria-hidden />
              PDF uploaded
            </span>
            <button type="button" className="gha-btn gha-btn--secondary" onClick={() => void openStored()} disabled={busy}>
              <ArrowUpRight size={16} aria-hidden />
              Open
              <span className="gha-sr-only">{label} (opens in a new tab)</span>
            </button>
            <button
              type="button"
              className="gha-btn gha-btn--secondary"
              onClick={() => fileRef.current?.click()}
              disabled={busy || !canUpload}
            >
              {busy ? <Loader2 size={16} className="gha-spin" aria-hidden /> : <FileUp size={16} aria-hidden />}
              {busy ? 'Uploading…' : 'Replace'}
              <span className="gha-sr-only"> {label}</span>
            </button>
            <button
              type="button"
              className="gha-btn gha-btn--danger gha-btn--icon"
              onClick={() => onChange('')}
              disabled={busy}
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <Trash2 size={15} aria-hidden />
            </button>
            {picker}
          </div>
        ) : (
          <div className="gha-doc__row">
            <input
              {...control}
              className="gha-input"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
            {canUpload ? (
              <>
                <button
                  type="button"
                  className="gha-btn gha-btn--secondary"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                >
                  {busy ? <Loader2 size={16} className="gha-spin" aria-hidden /> : <FileUp size={16} aria-hidden />}
                  {busy ? 'Uploading…' : 'Upload PDF'}
                </button>
                {picker}
              </>
            ) : null}
          </div>
        )
      }
    </Field>
  );
}

export function MediaStep({ o, update, errors }: StepProps) {
  // Documents can be offered on public pages, or on a Green Hill Private teaser.
  const canOffer = o.visibility === 'public' || o.privateTeaser;
  const embeddable = o.videoUrl.trim() ? Boolean(getEmbedUrl(o.videoUrl.trim())) : null;

  return (
    <StepFrame
      number="04"
      title="Media"
      lead="Between one and eight photographs. Four to six usually tells the story well."
    >
      <MediaManager
        images={o.images}
        imageAlt={o.imageAlt}
        keepOne={isLive(o.status)}
        title={o.title}
        onChange={(images, imageAlt) => update({ images, imageAlt })}
      />

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Film &amp; documents</legend>
        <p className="gha-hint">All optional.</p>
        <div className="gha-docs">
          <Field
            label="Video"
            optional
            error={errors.videoUrl ?? (embeddable === false ? 'This link is not a YouTube or Vimeo video, so it cannot be shown on the memo.' : undefined)}
            hint="A YouTube or Vimeo link. Drone footage works the same way. It appears on the memo under the description."
          >
            {(control) => (
              <input
                {...control}
                className="gha-input"
                type="url"
                inputMode="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={o.videoUrl}
                onChange={(event) => update({ videoUrl: event.target.value })}
              />
            )}
          </Field>
          <DocumentField
            label="Brochure"
            value={o.brochureUrl}
            error={errors.brochureUrl}
            onChange={(brochureUrl) => update({ brochureUrl })}
            help="An information pack for serious enquiries."
            show={{
              checked: Boolean(o.disclosure.brochure),
              available: canOffer,
              onChange: (checked) => update({ disclosure: { ...o.disclosure, brochure: checked } }),
            }}
          />
          <DocumentField
            label="Masterplan"
            value={o.masterplanUrl}
            error={errors.masterplanUrl}
            onChange={(masterplanUrl) => update({ masterplanUrl })}
            help="Site plan or masterplan drawing."
            show={{
              checked: Boolean(o.disclosure.masterplan),
              available: canOffer,
              onChange: (checked) => update({ disclosure: { ...o.disclosure, masterplan: checked } }),
            }}
          />
          <DocumentField
            label="Investment memorandum"
            value={o.memorandumUrl}
            error={errors.memorandumUrl}
            onChange={(memorandumUrl) => update({ memorandumUrl })}
            help="The private PDF you send after qualifying an investor. Open it here to download and send."
          />
        </div>
      </fieldset>
    </StepFrame>
  );
}
