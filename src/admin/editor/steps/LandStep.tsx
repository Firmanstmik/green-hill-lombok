import {
  DEVELOPMENT_STATUSES,
  FURNISHINGS,
  TENURES,
  TERM_TENURES,
  ZONINGS,
  type Opportunity,
} from '../../domain/opportunity';
import { Field, type FieldControlProps } from '../../ui/primitives';
import { StepFrame, numberText, parseNumber, type StepProps } from './shared';

function NumberInput({
  control,
  value,
  unit,
  onChange,
  decimals = false,
}: {
  control: FieldControlProps;
  value: number | null;
  unit?: string;
  onChange: (value: number | null) => void;
  decimals?: boolean;
}) {
  const input = (
    <input
      {...control}
      className="gha-input gha-mono"
      inputMode={decimals ? 'decimal' : 'numeric'}
      placeholder="Not specified"
      value={numberText(value)}
      onChange={(event) => onChange(parseNumber(event.target.value))}
    />
  );
  return unit ? (
    <div className="gha-input-suffix">
      {input}
      <span aria-hidden>{unit}</span>
    </div>
  ) : (
    input
  );
}

function ChoiceSelect({
  control,
  value,
  options,
  onChange,
}: {
  control: FieldControlProps;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <select {...control} className="gha-select" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Not specified</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
    </select>
  );
}

export function LandStep({ o, update }: StepProps) {
  const set = <K extends keyof Opportunity>(key: K) => (value: Opportunity[K]) => update({ [key]: value } as Partial<Opportunity>);
  const showTerm = TERM_TENURES.includes(o.tenure);
  const built = o.type !== 'Land';

  return (
    <StepFrame
      number="03"
      title="Land & specifications"
      lead="Only what you know to be true. Anything left empty stays “Not specified” and is simply not shown."
    >
      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Land</legend>
        <div className="gha-grid gha-grid--2" style={{ marginTop: 16 }}>
          <Field
            label="Land size"
            optional
            hint={
              o.landSize && o.landSize >= 10000
                ? `= ${(o.landSize / 10000).toLocaleString('en-US', { maximumFractionDigits: 2 })} ha. Large sites are shown in hectares and m² on the website.`
                : 'In square metres. 10,000 m² = 1 hectare.'
            }
          >
            {(control) => <NumberInput control={control} value={o.landSize} unit="m²" decimals onChange={set('landSize')} />}
          </Field>
          <Field label="Building area" optional hint={built ? undefined : 'Leave empty for bare land.'}>
            {(control) => <NumberInput control={control} value={o.buildingArea} unit="m²" decimals onChange={set('buildingArea')} />}
          </Field>
        </div>
        {built ? (
          <div className="gha-grid gha-grid--2">
            <Field label="Bedrooms" optional>
              {(control) => <NumberInput control={control} value={o.bedrooms} onChange={set('bedrooms')} />}
            </Field>
            <Field label="Bathrooms" optional>
              {(control) => <NumberInput control={control} value={o.bathrooms} onChange={set('bathrooms')} />}
            </Field>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Tenure &amp; planning</legend>
        <p className="gha-hint">
          Record what the documents say. The website shows these values as written, without interpretation.
        </p>
        <div className="gha-grid gha-grid--2">
          <Field label="Tenure" optional>
            {(control) => <ChoiceSelect control={control} value={o.tenure} options={TENURES} onChange={set('tenure')} />}
          </Field>
          {showTerm ? (
            <Field label="Term remaining" optional hint="Years left on the current title or lease.">
              {(control) => <NumberInput control={control} value={o.leaseYears} unit="years" onChange={set('leaseYears')} />}
            </Field>
          ) : (
            <div />
          )}
        </div>
        <div className="gha-grid gha-grid--2">
          <Field label="Zoning" optional>
            {(control) => <ChoiceSelect control={control} value={o.zoning} options={ZONINGS} onChange={set('zoning')} />}
          </Field>
          <Field label="Development status" optional>
            {(control) => (
              <ChoiceSelect
                control={control}
                value={o.developmentStatus}
                options={DEVELOPMENT_STATUSES}
                onChange={set('developmentStatus')}
              />
            )}
          </Field>
        </div>
      </fieldset>

      {built ? (
        <fieldset className="gha-fieldset">
          <legend className="gha-legend">Building details</legend>
          <div className="gha-grid" style={{ marginTop: 16 }}>
            <Field label="Storeys" optional>
              {(control) => <NumberInput control={control} value={o.stories} onChange={set('stories')} />}
            </Field>
            <Field label="Year built" optional>
              {(control) => (
                <input
                  {...control}
                  className="gha-input gha-mono"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Not specified"
                  value={o.yearBuilt}
                  onChange={(event) => update({ yearBuilt: event.target.value.replace(/[^\d]/g, '') })}
                />
              )}
            </Field>
            <Field label="Furnishing" optional>
              {(control) => <ChoiceSelect control={control} value={o.furnishing} options={FURNISHINGS} onChange={set('furnishing')} />}
            </Field>
          </div>
        </fieldset>
      ) : null}

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Developer or landowner</legend>
        <Field
          label="Developer / landowner name"
          optional
          hint="Private. Never shown on the website unless you switch it on for a Green Hill Private teaser."
        >
          {(control) => (
            <input
              {...control}
              className="gha-input"
              maxLength={160}
              value={o.developerName}
              onChange={(event) => update({ developerName: event.target.value })}
            />
          )}
        </Field>
      </fieldset>
    </StepFrame>
  );
}
