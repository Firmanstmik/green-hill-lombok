import { slugify } from '../../domain/opportunity';
import { useAdminPath } from '../../paths';
import { CharCount, Field } from '../../ui/primitives';
import { MediaImg } from '../../ui/media';
import { StepFrame, type StepProps } from './shared';

export function SeoStep({ o, update, errors }: StepProps) {
  const { language } = useAdminPath();
  const host = typeof window !== 'undefined' ? window.location.host : 'greenhilllombok.com';
  const fallbackTitle = `${o.title || 'Opportunity'} · Green Hill Lombok`;
  const fallbackDescription = o.summary.trim();
  const shownTitle = o.seoTitle.trim() || fallbackTitle;
  const shownDescription = o.seoDescription.trim() || fallbackDescription || 'No description yet.';
  const socialImage = o.ogImage || o.images[0] || '';
  const path = `/${language}/property/${o.slug || slugify(o.title) || 'your-opportunity'}`;

  return (
    <StepFrame
      number="06"
      title="Search & sharing"
      lead="How the memo appears on Google and when a link is shared. Everything here has a sensible default."
    >
      <div className="gha-serp" aria-label="Search result preview">
        <div className="gha-serp__url">
          {host}
          {path}
        </div>
        <div className="gha-serp__title">{shownTitle}</div>
        <div className="gha-serp__desc">{shownDescription.slice(0, 170)}</div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Field
          label="Public page address"
          optional
          error={errors.slug}
          hint={
            o.publishedAt
              ? 'Already published. Changing it breaks links people may have shared.'
              : 'Follows the title automatically until you change it.'
          }
        >
          {(control) => (
            <div className="gha-input-group">
              <span
                className="gha-input gha-mono"
                aria-hidden
                style={{ width: 'auto', color: 'var(--gha-muted)', background: 'var(--gha-surface-soft)', display: 'flex', alignItems: 'center' }}
              >
                /property/
              </span>
              <input
                {...control}
                className="gha-input gha-mono"
                value={o.slug}
                placeholder={slugify(o.title) || 'your-opportunity'}
                onChange={(event) => update({ slug: event.target.value.toLowerCase().replace(/\s+/g, '-') })}
                onBlur={(event) => update({ slug: slugify(event.target.value) })}
              />
            </div>
          )}
        </Field>
      </div>

      <Field
        label="Title on Google (SEO title)"
        optional
        aside={<CharCount value={o.seoTitle} ideal={60} />}
        hint={`Leave empty to use “${fallbackTitle}”. Around 60 characters shows in full.`}
      >
        {(control) => (
          <input
            {...control}
            className="gha-input"
            maxLength={120}
            value={o.seoTitle}
            placeholder={fallbackTitle}
            onChange={(event) => update({ seoTitle: event.target.value })}
          />
        )}
      </Field>

      <Field
        label="Description on Google (meta description)"
        optional
        aside={<CharCount value={o.seoDescription} ideal={155} />}
        hint="One or two plain sentences. Around 155 characters shows in full. Leave empty to use the summary."
      >
        {(control) => (
          <textarea
            {...control}
            className="gha-textarea"
            style={{ minHeight: 88 }}
            maxLength={320}
            value={o.seoDescription}
            placeholder={fallbackDescription}
            onChange={(event) => update({ seoDescription: event.target.value })}
          />
        )}
      </Field>

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Sharing image</legend>
        <p className="gha-hint">Shown when the link is shared on WhatsApp, email or social media.</p>
        {o.images.length === 0 ? (
          <p className="gha-hint">Add photographs in Media first. The primary photograph is used by default.</p>
        ) : (
          <div className="gha-media" role="radiogroup" aria-label="Sharing image" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {o.images.map((url, index) => {
              const checked = socialImage === url;
              return (
                <label
                  key={url}
                  className="gha-tile"
                  data-primary={checked}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="gha-og"
                    className="gha-sr-only"
                    checked={checked}
                    onChange={() => update({ ogImage: index === 0 ? '' : url })}
                  />
                  <span className="gha-tile__img">
                    <MediaImg src={url} alt="" loading="lazy" />
                  </span>
                  <span className="gha-tile__caption" style={{ padding: '6px 8px' }}>
                    {index === 0 ? 'Primary (default)' : `Photograph ${String(index + 1).padStart(2, '0')}`}
                    <span className="gha-sr-only">{checked ? ', selected' : ''}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <details className="gha-fieldset" style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--gha-line)' }}>
        <summary className="gha-label" style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>
          Advanced
        </summary>
        <div style={{ marginTop: 12 }}>
          <Field
            label="Original page address (canonical link)"
            optional
            error={errors.canonicalUrl}
            hint="Only if this opportunity is also published elsewhere and that page should rank instead. Usually left empty."
          >
            {(control) => (
              <input
                {...control}
                className="gha-input"
                type="url"
                placeholder="https://"
                value={o.canonicalUrl}
                onChange={(event) => update({ canonicalUrl: event.target.value })}
              />
            )}
          </Field>
        </div>
      </details>
    </StepFrame>
  );
}
