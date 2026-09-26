import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FilterState } from '@/types/filters';
import type { UseFiltersReturn } from '@/hooks/useFilters';
import type { OpportunityLens } from './opportunityMeta';
import { cn } from '@/lib/utils';

const LOMBOK_REGIONS = [
  'South Lombok',
  'Central Lombok',
  'Northwest Lombok',
  'East Lombok',
  'West Lombok',
  'Kuta Selatan',
] as const;

const LENS_LABEL: Record<OpportunityLens, string> = {
  all: 'properties.archive.all',
  land: 'properties.archive.land',
  villa: 'properties.archive.villas',
  development: 'properties.archive.development',
  private: 'properties.archive.private',
};

type Props = {
  filters: FilterState;
  setFilter: UseFiltersReturn['setFilter'];
  lenses: OpportunityLens[];
  lens: OpportunityLens;
  onLens: (lens: OpportunityLens) => void;
  onClear: () => void;
};

export function OpportunityFilters({ filters, setFilter, lenses, lens, onLens, onClear }: Props) {
  const { t } = useLanguage();
  const panelId = useId();
  const sizeId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const sizeActive = Boolean(filters.minSize || filters.maxSize);
  const regionActive = Boolean(filters.country);

  const secondaryCount =
    (filters.bedrooms !== 'any' ? 1 : 0) +
    (filters.bathrooms !== 'any' ? 1 : 0);

  useEffect(() => {
    if (!open && !sizeOpen && !regionOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSizeOpen(false);
        setRegionOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setSizeOpen(false);
        setRegionOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, sizeOpen, regionOpen]);

  const cats: OpportunityLens[] = ['all', ...lenses];

  return (
    <div className="gh-arch-filters" ref={rootRef}>
      <div className="gh-arch-filters__cats" role="tablist" aria-label={t('properties.archive.all')}>
        {cats.map((id) => {
          const active = lens === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn('gh-arch-filters__cat', active && 'is-active')}
              onClick={() => onLens(id)}
            >
              {t(LENS_LABEL[id])}
            </button>
          );
        })}
      </div>

      <div className="gh-arch-filters__tools">
        <label className="gh-arch-search">
          <svg viewBox="0 0 16 16" aria-hidden className="gh-arch-search__icon">
            <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10.4 10.4 L13.2 13.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={filters.location}
            placeholder={t('properties.archive.searchPlaceholder')}
            aria-label={t('properties.archive.searchPlaceholder')}
            onChange={(event) => setFilter('location', event.target.value)}
          />
        </label>

        <div className="gh-arch-menu">
          <button
            type="button"
            className={cn('gh-arch-select', regionOpen && 'is-open', regionActive && 'is-active')}
            aria-expanded={regionOpen}
            aria-haspopup="listbox"
            onClick={() => {
              setRegionOpen((value) => !value);
              setOpen(false);
              setSizeOpen(false);
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden className="gh-arch-select__icon">
              <path d="M8 1.6c2.2 0 4 1.7 4 4.1 0 2.8-4 8.7-4 8.7S4 8.5 4 5.7c0-2.4 1.8-4.1 4-4.1z" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="8" cy="5.6" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span>{filters.country || t('properties.archive.allRegions')}</span>
            <svg viewBox="0 0 12 8" aria-hidden className="gh-arch-select__caret">
              <path d="M1 1.5 L6 6.5 L11 1.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          {regionOpen ? (
            <ul className="gh-arch-menu__list" role="listbox" aria-label={t('properties.archive.location')}>
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!filters.country}
                  className={cn('gh-arch-menu__option', !filters.country && 'is-active')}
                  onClick={() => {
                    setFilter('country', '');
                    setRegionOpen(false);
                  }}
                >
                  {t('properties.archive.allRegions')}
                </button>
              </li>
              {LOMBOK_REGIONS.map((region) => (
                <li key={region}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={filters.country === region}
                    className={cn('gh-arch-menu__option', filters.country === region && 'is-active')}
                    onClick={() => {
                      setFilter('country', region);
                      setRegionOpen(false);
                    }}
                  >
                    {region}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="gh-arch-pop">
          <button
            type="button"
            className={cn('gh-arch-chip', sizeOpen && 'is-open', sizeActive && 'is-active')}
            aria-expanded={sizeOpen}
            aria-controls={sizeId}
            onClick={() => {
              setSizeOpen((value) => !value);
              setOpen(false);
              setRegionOpen(false);
            }}
          >
            {t('properties.archive.size')}
          </button>
          {sizeOpen ? (
            <div className="gh-arch-pop__panel gh-arch-pop__panel--size" id={sizeId}>
              <div className="gh-arch-size">
                <label>
                  <span>{t('properties.archive.sizeMin')}</span>
                  <input
                    inputMode="numeric"
                    value={filters.minSize}
                    onChange={(event) => setFilter('minSize', event.target.value.replace(/[^\d.]/g, ''))}
                  />
                </label>
                <span className="gh-arch-size__rule" aria-hidden />
                <label>
                  <span>{t('properties.archive.sizeMax')}</span>
                  <input
                    inputMode="numeric"
                    value={filters.maxSize}
                    onChange={(event) => setFilter('maxSize', event.target.value.replace(/[^\d.]/g, ''))}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <div className="gh-arch-pop gh-arch-pop--end">
          <button
            type="button"
            className={cn('gh-arch-chip', open && 'is-open', secondaryCount > 0 && 'is-active')}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setOpen((value) => !value);
              setSizeOpen(false);
              setRegionOpen(false);
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden className="gh-arch-chip__icon">
              <path d="M2 4h12M4 8h8M6 12h4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {t('properties.archive.moreFilters')}
            {secondaryCount > 0 ? <span className="gh-arch-filters__count">{secondaryCount}</span> : null}
          </button>
          {open ? (
            <div className="gh-arch-pop__panel" id={panelId}>
              <div className="gh-arch-filters__group">
                <span className="gh-arch-field__label">{t('properties.archive.bedrooms')}</span>
                <div className="gh-arch-filters__choices">
                  {(['any', '1', '2', '3', '4'] as const).map((bed) => (
                    <button
                      key={bed}
                      type="button"
                      className={cn('gh-arch-filters__choice', filters.bedrooms === bed && 'is-active')}
                      onClick={() => setFilter('bedrooms', bed)}
                    >
                      {bed === 'any' ? t('properties.archive.any') : bed}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <button type="button" className="gh-arch-clear" onClick={onClear}>
          {t('properties.archive.clearAll')}
        </button>
      </div>
    </div>
  );
}
