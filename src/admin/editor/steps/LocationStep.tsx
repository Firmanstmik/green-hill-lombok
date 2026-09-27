import { lazy, Suspense, useState } from 'react';
import { Loader2, MapPin } from '@/icons/iconsax';
import { toast } from 'sonner';
import { AddressAutocomplete } from '@/components/map/AddressAutocomplete';
import POIEditor from '@/components/admin/POIEditor';
import { fetchNearbyPOIs } from '@/lib/poi';
import { REGION_SUGGESTIONS, publicLocationLine } from '../../domain/opportunity';
import { Field } from '../../ui/primitives';
import { StepFrame, type StepProps } from './shared';

const PropertyMap = lazy(() => import('@/components/map/PropertyMap').then((mod) => ({ default: mod.PropertyMap })));

const MAPBOX_READY = Boolean(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN);

function coordinateText(value: number | null) {
  return value == null ? '' : String(value);
}

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function LocationStep({ o, update, errors }: StepProps) {
  const [search, setSearch] = useState('');
  const [finding, setFinding] = useState(false);
  const hasPoint = o.latitude != null && o.longitude != null;
  const line = publicLocationLine(o);

  const findNearby = async () => {
    if (!hasPoint) return;
    setFinding(true);
    try {
      const pois = await fetchNearbyPOIs(o.latitude as number, o.longitude as number);
      update({ nearbyAmenities: pois });
      toast.success(pois.length ? `Found ${pois.length} nearby places. Remove any that are not useful.` : 'No nearby places found.');
    } catch {
      toast.error('Could not look up nearby places. You can add them by hand.');
    } finally {
      setFinding(false);
    }
  };

  return (
    <StepFrame
      number="02"
      title="Location"
      lead="Enough for a visitor to understand where it is. The area alone is fine; exact coordinates are optional."
    >
      <div className="gha-grid gha-grid--2">
        <Field label="Region" hint="For example South Lombok.">
          {(control) => (
            <>
              <input
                {...control}
                className="gha-input"
                list="gha-regions"
                value={o.region}
                onChange={(event) => update({ region: event.target.value })}
              />
              <datalist id="gha-regions">
                {REGION_SUGGESTIONS.map((region) => (
                  <option key={region} value={region} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Area" hint="Village, bay or district, e.g. Selong Belanak.">
          {(control) => (
            <input {...control} className="gha-input" value={o.area} onChange={(event) => update({ area: event.target.value })} />
          )}
        </Field>
      </div>

      <Field
        label="Location shown on the website"
        optional
        hint={
          <>
            Leave empty to show “{[o.area, o.region].filter(Boolean).join(', ') || 'Area, Region'}”. Only add a street
            address if you are happy for it to be public.
          </>
        }
      >
        {(control) => (
          <input {...control} className="gha-input" value={o.address} onChange={(event) => update({ address: event.target.value })} />
        )}
      </Field>

      {!line ? (
        <p className="gha-hint" style={{ marginTop: 12, color: 'var(--gha-gold-deep)' }}>
          Add a region or area. It is required before publishing.
        </p>
      ) : null}

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Map position</legend>
        <p className="gha-hint">
          Optional. Coordinates place a map on the memo.
          {MAPBOX_READY ? ' Search for a place, or type coordinates.' : ' Map search needs a Mapbox key; you can type coordinates instead.'}
        </p>

        {MAPBOX_READY ? (
          <div className="gha-field" style={{ marginBottom: 16 }}>
            <span className="gha-label">Search for a place</span>
            <AddressAutocomplete
              value={search}
              onChange={setSearch}
              placeholder="e.g. Selong Belanak beach"
              onSelect={(result) =>
                update({
                  latitude: Number(result.latitude.toFixed(6)),
                  longitude: Number(result.longitude.toFixed(6)),
                })
              }
            />
          </div>
        ) : null}

        <div className="gha-grid gha-grid--2">
          <Field label="Latitude" optional error={errors.latitude} hint="South Lombok is around -8.9.">
            {(control) => (
              <input
                {...control}
                className="gha-input gha-mono"
                inputMode="decimal"
                defaultValue={coordinateText(o.latitude)}
                key={`lat-${o.latitude}`}
                onBlur={(event) => update({ latitude: parseCoordinate(event.target.value) })}
              />
            )}
          </Field>
          <Field label="Longitude" optional error={errors.longitude} hint="South Lombok is around 116.2.">
            {(control) => (
              <input
                {...control}
                className="gha-input gha-mono"
                inputMode="decimal"
                defaultValue={coordinateText(o.longitude)}
                key={`lng-${o.longitude}`}
                onBlur={(event) => update({ longitude: parseCoordinate(event.target.value) })}
              />
            )}
          </Field>
        </div>

        {hasPoint && MAPBOX_READY && !errors.latitude && !errors.longitude ? (
          <div style={{ marginTop: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--gha-line)' }}>
            <Suspense fallback={<div className="gha-skel" style={{ height: 260 }} />}>
              <PropertyMap
                latitude={o.latitude as number}
                longitude={o.longitude as number}
                address={line}
                title={o.title}
                height="h-[260px]"
              />
            </Suspense>
          </div>
        ) : null}
        {hasPoint && (o.latitude as number) === 0 && (o.longitude as number) === 0 ? (
          <p className="gha-hint" style={{ marginTop: 8 }}>0, 0 is not a real position; the memo will hide the map.</p>
        ) : null}
      </fieldset>

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Access &amp; utilities</legend>
        <p className="gha-hint">Only what has been verified. Shown on the memo when filled in.</p>
        <Field label="Road access" optional hint="e.g. Paved road to the boundary, 4 m wide; last 200 m compacted track.">
          {(control) => (
            <textarea
              {...control}
              className="gha-textarea"
              style={{ minHeight: 72 }}
              maxLength={400}
              value={o.roadAccess}
              onChange={(event) => update({ roadAccess: event.target.value })}
            />
          )}
        </Field>
        <Field label="Utilities" optional hint="e.g. PLN electricity at the road; well water; no mains water yet.">
          {(control) => (
            <textarea
              {...control}
              className="gha-textarea"
              style={{ minHeight: 72 }}
              maxLength={400}
              value={o.utilities}
              onChange={(event) => update({ utilities: event.target.value })}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="gha-fieldset">
        <legend className="gha-legend">Nearby places</legend>
        <p className="gha-hint">
          Optional. Shown on the memo as a short list (beaches, airport, schools). Nothing is looked up unless you ask.
        </p>
        <button
          type="button"
          className="gha-btn gha-btn--secondary"
          disabled={!hasPoint || finding}
          onClick={() => void findNearby()}
        >
          {finding ? <Loader2 size={16} className="gha-spin" aria-hidden /> : <MapPin size={16} aria-hidden />}
          {finding ? 'Looking up nearby places…' : 'Find nearby places'}
        </button>
        {!hasPoint ? <p className="gha-hint" style={{ marginTop: 6 }}>Add coordinates first.</p> : null}
        {o.nearbyAmenities.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <POIEditor pois={o.nearbyAmenities} onChange={(pois) => update({ nearbyAmenities: pois })} loading={finding} />
          </div>
        ) : null}
      </fieldset>
    </StepFrame>
  );
}
