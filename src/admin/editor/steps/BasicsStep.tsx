import { Globe, Lock } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAmount, formatMoney, ratesAreUsable } from '@/lib/opportunityPrice';
import {
  OPPORTUNITY_TYPES,
  PRICE_CURRENCIES,
  STATUS_LABEL,
  isLive,
  type OpportunityCurrency,
  type PriceDisplay,
  type OpportunityType,
} from '../../domain/opportunity';
import { CharCount, Field } from '../../ui/primitives';

const PRICE_DISPLAY_OPTIONS: { value: PriceDisplay; label: string }[] = [
  { value: 'exact', label: 'Exact price' },
  { value: 'from', label: 'From this price' },
  { value: 'range', label: 'A range' },
];
import { StepFrame, type StepProps } from './shared';

function groupDigits(value: number | null): string {
  return value == null ? '' : Math.round(value).toLocaleString('en-US');
}

function ApproximatePrices({ amount, currency }: { amount: number; currency: OpportunityCurrency }) {
  const { exchangeRates } = useCurrency();
  if (!ratesAreUsable(exchangeRates)) {
    return <p className="gha-hint">Approximate conversions are unavailable right now. The price is saved exactly as entered.</p>;
  }
  const others = (['IDR', 'USD', 'GBP'] as const).filter((code) => code !== currency);
  return (
    <p className="gha-hint">
      <span style={{ color: 'var(--gha-ink)', fontWeight: 500 }}>{formatMoney(amount, currency, 'en', true)}</span>
      {others.map((code) => (
        <span key={code}>
          {' '}
          · ≈ {formatMoney(convertAmount(amount, currency, code, exchangeRates), code, 'en', true)}
        </span>
      ))}
      <br />
      Conversions are approximate, at today’s rate. The price is stored exactly as entered and never converted.
    </p>
  );
}

/** Brief §18 disclosure controls (documents are chosen in the Media step). */
const DISCLOSURE_OPTIONS: { key: 'price' | 'location' | 'map' | 'tenure' | 'developer'; label: string }[] = [
  { key: 'price', label: 'Price (otherwise "Price on application")' },
  { key: 'location', label: 'Exact location (otherwise only the region, e.g. "South Lombok")' },
  { key: 'map', label: 'Map (needs the exact location)' },
  { key: 'tenure', label: 'Tenure / title' },
  { key: 'developer', label: 'Developer / landowner name' },
];

export function BasicsStep({ o, update, errors }: StepProps) {
  const live = isLive(o.status);

  return (
    <StepFrame
      number="01"
      title="Basics"
      lead="What this opportunity is called, what kind it is, and who can see it."
    >
      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Identity</legend>
        <div className="gha-grid gha-grid--2" style={{ marginTop: 16 }}>
          <Field label="Title" required hint="Short and descriptive, e.g. “Elevated Coastal Land, Selong Belanak”.">
            {(control) => (
              <input
                {...control}
                className="gha-input"
                value={o.title}
                maxLength={120}
                onChange={(event) => update({ title: event.target.value })}
              />
            )}
          </Field>
          <Field label="Reference" hint="Generated for you. Change it only if you keep your own numbering.">
            {(control) => (
              <input
                {...control}
                className="gha-input gha-mono"
                value={o.reference}
                maxLength={40}
                onChange={(event) => update({ reference: event.target.value.toUpperCase() })}
              />
            )}
          </Field>
        </div>

        <div className="gha-grid gha-grid--2">
          <Field label="Type" required>
            {(control) => (
              <select
                {...control}
                className="gha-select"
                value={o.type}
                onChange={(event) => update({ type: event.target.value as OpportunityType | '' })}
              >
                <option value="">Choose a type</option>
                {OPPORTUNITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="gha-field">
            <span className="gha-label">Status</span>
            {live ? (
              <div className="gha-choice" role="radiogroup" aria-label="Status">
                {(['available', 'reserved', 'sold'] as const).map((status) => (
                  <label key={status}>
                    <input
                      type="radio"
                      name="gha-status"
                      checked={o.status === status}
                      onChange={() => update({ status })}
                    />
                    {STATUS_LABEL[status]}
                  </label>
                ))}
              </div>
            ) : (
              <p className="gha-hint" style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
                {o.status === 'archived'
                  ? 'Archived. Restore it as a draft to work on it again.'
                  : 'Draft. You choose Available, Reserved or Sold when you publish.'}
              </p>
            )}
          </div>
        </div>

        <Field
          label="Summary"
          required
          aside={<CharCount value={o.summary} ideal={180} />}
          hint="One or two plain sentences on what it is and where. Used as the search and sharing description unless you write one in Search & sharing."
          error={o.summary && o.summary.trim().length < 20 ? 'A little more detail, please (at least 20 characters).' : undefined}
        >
          {(control) => (
            <textarea
              {...control}
              className="gha-textarea"
              style={{ minHeight: 88 }}
              value={o.summary}
              maxLength={400}
              onChange={(event) => update({ summary: event.target.value })}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Where should this opportunity appear?</legend>
        <p className="gha-hint">
          Private opportunities are handled directly through Green Hill. They stay hidden unless you present one as a
          teaser on Green Hill Private, showing only what you choose.
        </p>
        <div className="gha-options" role="radiogroup" aria-label="Visibility">
          <label className="gha-option">
            <input
              type="radio"
              name="gha-visibility"
              checked={o.visibility === 'public'}
              onChange={() => update({ visibility: 'public' })}
            />
            <span className="gha-option__icon" aria-hidden>
              <Globe size={17} />
            </span>
            <span>
              <span className="gha-option__title">Public</span>
              <span className="gha-option__text">Shown on the website once published.</span>
            </span>
          </label>
          <label className="gha-option">
            <input
              type="radio"
              name="gha-visibility"
              checked={o.visibility === 'private'}
              onChange={() => update({ visibility: 'private', featured: false })}
            />
            <span className="gha-option__icon" aria-hidden>
              <Lock size={17} />
            </span>
            <span>
              <span className="gha-option__title">Private</span>
              <span className="gha-option__text">Handled directly through Green Hill. Hidden unless you present a teaser.</span>
            </span>
          </label>
        </div>

        {o.visibility === 'private' ? (
          <div style={{ marginTop: 16 }}>
            <label className="gha-switch">
              <input
                type="checkbox"
                checked={o.privateTeaser}
                aria-describedby="gha-teaser-hint"
                onChange={(event) => update({ privateTeaser: event.target.checked })}
              />
              <span className="gha-switch__track" aria-hidden />
              Present as a teaser on Green Hill Private
            </label>
            <p className="gha-hint" id="gha-teaser-hint">
              A public page for serious enquiries. Always shown: title, summary, description, why Green Hill is
              looking at this, zoning, utilities, development status and potential, and the photographs. Shown
              only if you switch it on below: price, exact location, map, tenure, developer or landowner, and
              documents. The investment memorandum and your private notes are never shown.
            </p>
            {o.privateTeaser ? (
              <fieldset className="gha-fieldset" style={{ marginTop: 12 }}>
                <legend className="gha-label">Show on the teaser</legend>
                <p className="gha-hint">
                  Off means hidden: never sent to the website. Brochure and masterplan are chosen in Media.
                </p>
                {DISCLOSURE_OPTIONS.map((item) => (
                  <label key={item.key} className="gha-switch" style={{ display: 'flex', marginTop: 10 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(o.disclosure[item.key])}
                      disabled={item.key === 'map' && !o.disclosure.location}
                      onChange={(event) =>
                        update({
                          disclosure: {
                            ...o.disclosure,
                            [item.key]: event.target.checked,
                            // A map would reveal the exact location.
                            ...(item.key === 'location' && !event.target.checked ? { map: false } : {}),
                          },
                        })
                      }
                    />
                    <span className="gha-switch__track" aria-hidden />
                    {item.label}
                  </label>
                ))}
              </fieldset>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <label className="gha-switch">
            <input
              type="checkbox"
              checked={o.featured}
              disabled={o.visibility === 'private'}
              aria-describedby="gha-featured-hint"
              onChange={(event) => update({ featured: event.target.checked })}
            />
            <span className="gha-switch__track" aria-hidden />
            Featured
          </label>
          <p className="gha-hint" id="gha-featured-hint">
            {o.visibility === 'private'
              ? 'Private opportunities cannot be featured.'
              : 'Featured opportunities can appear in the homepage selection.'}
          </p>
        </div>
      </fieldset>

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Price</legend>
        <p className="gha-hint">IDR is the usual source currency. Visitors can view an approximate conversion.</p>
        <label className="gha-switch">
          <input
            type="checkbox"
            checked={o.priceOnRequest}
            onChange={(event) => update({ priceOnRequest: event.target.checked })}
          />
          <span className="gha-switch__track" aria-hidden />
          Price on request
        </label>

        {!o.priceOnRequest ? (
          <div style={{ marginTop: 16 }}>
            <Field label="Price" required error={errors.priceAmount}>
              {(control) => (
                <div className="gha-input-group">
                  <select
                    className="gha-select"
                    aria-label="Currency"
                    value={o.priceCurrency}
                    onChange={(event) => update({ priceCurrency: event.target.value as OpportunityCurrency })}
                  >
                    {PRICE_CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                    {o.priceCurrency === 'EUR' ? <option value="EUR">EUR (earlier opportunity)</option> : null}
                  </select>
                  <input
                    {...control}
                    className="gha-input gha-mono"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={o.priceCurrency === 'IDR' ? '4,500,000,000' : '270,000'}
                    value={groupDigits(o.priceAmount)}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/[^\d]/g, '');
                      update({ priceAmount: digits ? Number(digits) : null });
                    }}
                  />
                </div>
              )}
            </Field>
            {o.priceAmount && o.priceAmount > 0 ? (
              <div style={{ marginTop: 8 }}>
                <ApproximatePrices amount={o.priceAmount} currency={o.priceCurrency} />
              </div>
            ) : null}
            <div className="gha-field" style={{ marginTop: 16 }}>
              <span className="gha-label" id="gha-price-display">
                How the price reads on the website
              </span>
              <div className="gha-choice" role="radiogroup" aria-labelledby="gha-price-display">
                {PRICE_DISPLAY_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="gha-price-display"
                      checked={o.priceDisplay === option.value}
                      onChange={() => update({ priceDisplay: option.value })}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <p className="gha-hint">
                {o.priceDisplay === 'from'
                  ? 'Shown as “From …”, useful when the final figure depends on the plot or phase.'
                  : o.priceDisplay === 'range'
                    ? 'Shown as a range, e.g. for a site that can be bought in parts.'
                    : 'Shown exactly as entered.'}
              </p>
            </div>
            {o.priceDisplay === 'range' ? (
              <Field label="Up to" required error={errors.priceAmountMax} hint={`Same currency (${o.priceCurrency}).`}>
                {(control) => (
                  <input
                    {...control}
                    className="gha-input gha-mono"
                    inputMode="numeric"
                    autoComplete="off"
                    value={groupDigits(o.priceAmountMax)}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/[^\d]/g, '');
                      update({ priceAmountMax: digits ? Number(digits) : null });
                    }}
                  />
                )}
              </Field>
            ) : null}
          </div>
        ) : (
          <p className="gha-hint" style={{ marginTop: 8 }}>
            The website will show “Price on request”.
          </p>
        )}
      </fieldset>
    </StepFrame>
  );
}
