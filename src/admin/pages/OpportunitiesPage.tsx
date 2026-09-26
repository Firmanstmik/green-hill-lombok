import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownWideNarrow, ArrowRight, Plus, Search } from 'lucide-react';
import { useOpportunities } from '../data/queries';
import {
  OPPORTUNITY_TYPES,
  STATUS_LABEL,
  formatArea,
  publicLocationLine,
  type Opportunity,
} from '../domain/opportunity';
import {
  DEFAULT_FILTERS,
  applyOpportunityFilters,
  areaOptions,
  filtersFromParams,
  filtersToParams,
  type OpportunityFilters,
} from '../domain/opportunityFilters';
import { OpportunityActions } from '../opportunityActions';
import { useAdminPath } from '../paths';
import { formatDate, plural } from '../ui/format';
import {
  EmptyState,
  ErrorState,
  FeaturedMark,
  PageHead,
  SkeletonRows,
  StatusBadge,
  Thumb,
  VisibilityBadge,
} from '../ui/primitives';

const VIEW_TITLES: Record<string, string> = {
  all: 'All opportunities',
  draft: 'Drafts',
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  archived: 'Archived',
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export function OpportunitiesPage() {
  const { admin } = useAdminPath();
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const query = useOpportunities();
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebounced(search, 200);

  const update = (patch: Partial<OpportunityFilters>) => {
    setParams(filtersToParams({ ...filters, ...patch }), { replace: true });
  };

  useEffect(() => {
    if (debouncedSearch !== filters.q) update({ q: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Navigating from the sidebar resets the URL; keep the box in step with it.
  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  useEffect(() => {
    document.title = `${VIEW_TITLES[filters.status]} · Green Hill Admin`;
  }, [filters.status]);

  const all = useMemo(() => query.data ?? [], [query.data]);
  const areas = useMemo(() => areaOptions(all), [all]);
  const rows = useMemo(() => applyOpportunityFilters(all, filters), [all, filters]);
  const refined =
    filters.q !== '' ||
    filters.visibility !== 'all' ||
    filters.type !== 'all' ||
    filters.area !== 'all' ||
    filters.featured !== 'all';

  const addButton = (
    <Link className="gha-btn gha-btn--primary" to={admin('/opportunities/new')}>
      <Plus size={18} aria-hidden />
      Add opportunity
    </Link>
  );

  return (
    <div className="gha-enter">
      <PageHead
        eyebrow="Opportunities"
        title={VIEW_TITLES[filters.status]}
        lead="Manage the selected opportunities represented by Green Hill."
        actions={addButton}
      />

      <div className="gha-toolbar" role="search" aria-label="Filter opportunities">
        <div className="gha-search">
          <Search size={17} aria-hidden />
          <label className="gha-sr-only" htmlFor="gha-opp-search">
            Search opportunities
          </label>
          <input
            id="gha-opp-search"
            className="gha-input"
            type="search"
            placeholder="Search title, reference or area"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <label className="gha-sr-only" htmlFor="gha-f-status">Status</label>
        <select
          id="gha-f-status"
          className="gha-select"
          value={filters.status}
          onChange={(event) => update({ status: event.target.value as OpportunityFilters['status'] })}
        >
          <option value="all">All statuses</option>
          {(['draft', 'available', 'reserved', 'sold', 'archived'] as const).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>

        <label className="gha-sr-only" htmlFor="gha-f-vis">Visibility</label>
        <select
          id="gha-f-vis"
          className="gha-select"
          value={filters.visibility}
          onChange={(event) => update({ visibility: event.target.value as OpportunityFilters['visibility'] })}
        >
          <option value="all">Public &amp; private</option>
          <option value="public">Public only</option>
          <option value="private">Private only</option>
        </select>

        <label className="gha-sr-only" htmlFor="gha-f-type">Type</label>
        <select
          id="gha-f-type"
          className="gha-select"
          value={filters.type}
          onChange={(event) => update({ type: event.target.value })}
        >
          <option value="all">All types</option>
          {OPPORTUNITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {areas.length > 1 ? (
          <>
            <label className="gha-sr-only" htmlFor="gha-f-area">Area</label>
            <select
              id="gha-f-area"
              className="gha-select"
              value={filters.area}
              onChange={(event) => update({ area: event.target.value })}
            >
              <option value="all">All areas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <label className="gha-switch" style={{ minHeight: 44 }}>
          <input
            type="checkbox"
            checked={filters.featured === 'yes'}
            onChange={(event) => update({ featured: event.target.checked ? 'yes' : 'all' })}
          />
          <span className="gha-switch__track" aria-hidden />
          Featured only
        </label>

        <div className="gha-toolbar__end">
          <ArrowDownWideNarrow size={17} aria-hidden color="var(--gha-muted)" />
          <label className="gha-sr-only" htmlFor="gha-f-sort">Sort by</label>
          <select
            id="gha-f-sort"
            className="gha-select"
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as OpportunityFilters['sort'] })}
          >
            <option value="updated">Recently updated</option>
            <option value="title">Title A–Z</option>
            <option value="landSize">Largest land first</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      <p className="gha-meta" role="status" aria-live="polite" style={{ margin: '0 0 12px' }}>
        {query.isLoading
          ? 'Loading opportunities…'
          : `${plural(rows.length, 'opportunity', 'opportunities')}${refined ? ' match your filters' : ''}`}
        {refined ? (
          <>
            {' · '}
            <button
              type="button"
              className="gha-link"
              style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
              onClick={() => {
                setSearch('');
                setParams(filtersToParams({ ...DEFAULT_FILTERS, status: filters.status }), { replace: true });
              }}
            >
              Clear filters
            </button>
          </>
        ) : null}
      </p>

      {query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="gha-panel">
          <SkeletonRows label="Loading opportunities" />
        </div>
      ) : rows.length === 0 ? (
        <div className="gha-panel">
          {all.length === 0 ? (
            <EmptyState
              title="No opportunities yet"
              text="Start with the essentials: a title, the type, where it is and one photograph. Everything else can follow."
              action={addButton}
            />
          ) : refined ? (
            <EmptyState title="Nothing matches" text="Try a different search or clear the filters." compact />
          ) : (
            <EmptyState
              title={`No ${VIEW_TITLES[filters.status].toLowerCase()}`}
              text={
                filters.status === 'archived'
                  ? 'Archived opportunities will be kept here, out of sight but never lost.'
                  : 'Opportunities with this status will appear here.'
              }
              compact
            />
          )}
        </div>
      ) : (
        <div className="gha-panel">
          <div className="gha-table-wrap">
            <table className="gha-table">
              <caption className="gha-sr-only">{VIEW_TITLES[filters.status]}</caption>
              <thead>
                <tr>
                  <th scope="col">Opportunity</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="gha-table__num">Land</th>
                  <th scope="col">Status</th>
                  <th scope="col">Visibility</th>
                  <th scope="col"><span className="gha-sr-only">Featured</span></th>
                  <th scope="col">Updated</th>
                  <th scope="col"><span className="gha-sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <OpportunityRow key={o.id} o={o} />
                ))}
              </tbody>
            </table>
          </div>

          <ul className="gha-list gha-rowcards">
            {rows.map((o) => (
              <li key={o.id}>
                <OpportunityCardRow o={o} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OpportunityRow({ o }: { o: Opportunity }) {
  const { admin } = useAdminPath();
  const href = admin(`/opportunities/${o.id}`);
  const place = publicLocationLine(o).split(',').map((part) => part.trim()).filter(Boolean).join(' · ');
  return (
    <tr>
      <td style={{ maxWidth: 420 }}>
        <div className="gha-opp">
          <Thumb src={o.images[0] ?? ''} />
          <div style={{ minWidth: 0 }}>
            <Link className="gha-opp__title" to={href}>
              {o.title || 'Untitled opportunity'}
            </Link>
            <span className="gha-opp__sub">
              {place || 'Location not set'}
              {o.reference ? <span className="gha-mono"> · {o.reference}</span> : null}
            </span>
          </div>
        </div>
      </td>
      <td>
        <span className="gha-meta" style={{ color: 'var(--gha-ink)' }}>{o.type || '—'}</span>
      </td>
      <td className="gha-table__num">{formatArea(o.landSize) || <span className="gha-meta">—</span>}</td>
      <td>
        <StatusBadge status={o.status} />
      </td>
      <td>
        <VisibilityBadge visibility={o.visibility} />
      </td>
      <td>{o.featured ? <FeaturedMark /> : null}</td>
      <td className="gha-meta" style={{ whiteSpace: 'nowrap' }}>{formatDate(o.updatedAt)}</td>
      <td className="gha-table__actions">
        <Link className="gha-btn gha-btn--ghost gha-btn--sm" to={href} aria-label={`Edit ${o.title || 'untitled opportunity'}`}>
          Edit
          <ArrowRight size={15} aria-hidden />
        </Link>
        <OpportunityActions opportunity={o} compact />
      </td>
    </tr>
  );
}

function OpportunityCardRow({ o }: { o: Opportunity }) {
  const { admin } = useAdminPath();
  const place = publicLocationLine(o).split(',').map((part) => part.trim()).filter(Boolean).join(' · ');
  return (
    <div className="gha-rowcard">
      <Thumb src={o.images[0] ?? ''} />
      <div style={{ minWidth: 0 }}>
        <Link className="gha-opp__title" to={admin(`/opportunities/${o.id}`)} style={{ whiteSpace: 'normal' }}>
          {o.title || 'Untitled opportunity'}
        </Link>
        <span className="gha-opp__sub" style={{ whiteSpace: 'normal' }}>
          {[place || 'Location not set', o.type, formatArea(o.landSize)].filter(Boolean).join(' · ')}
        </span>
        <div className="gha-rowcard__meta">
          <StatusBadge status={o.status} />
          <VisibilityBadge visibility={o.visibility} />
          {o.featured ? <FeaturedMark /> : null}
          <span className="gha-meta">Updated {formatDate(o.updatedAt)}</span>
        </div>
      </div>
      <OpportunityActions opportunity={o} />
    </div>
  );
}
