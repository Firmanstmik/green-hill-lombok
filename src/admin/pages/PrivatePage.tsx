import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Plus } from '@/icons/iconsax';
import { useOpportunities } from '../data/queries';
import { publicLocationLine } from '../domain/opportunity';
import { OpportunityActions } from '../opportunityActions';
import { useAdminPath } from '../paths';
import { formatDate } from '../ui/format';
import { EmptyState, ErrorState, PageHead, SkeletonRows, StatusBadge, Thumb, VisibilityBadge } from '../ui/primitives';
import { EnquiryWorkspace } from './EnquiriesPage';

export function PrivatePage() {
  const { admin } = useAdminPath();
  const opportunities = useOpportunities();

  useEffect(() => {
    document.title = 'Private · Green Hill Admin';
  }, []);

  const privateOpps = useMemo(
    () => (opportunities.data ?? []).filter((o) => o.visibility === 'private' && o.status !== 'archived'),
    [opportunities.data],
  );

  return (
    <div className="gha-enter">
      <PageHead
        eyebrow="Green Hill Private"
        title="Private"
        lead="Large opportunities and the investors asking about them, handled directly through Green Hill."
      />

      <div className="gha-alert gha-alert--info" style={{ marginBottom: 8 }}>
        <Lock size={17} aria-hidden color="var(--gha-forest)" />
        <div>
          <span className="gha-alert__title">What visitors can see</span>
          <span>
            A private opportunity is never listed on the website. If you present it as a <strong>Teaser</strong>, Green
            Hill Private shows its page with only the details you switch on; everything else, including the investment
            memorandum and your internal notes, never leaves the database.
          </span>
        </div>
      </div>

      <section className="gha-section" aria-labelledby="gha-private-opps">
        <div className="gha-section__head">
          <h2 className="gha-h2" id="gha-private-opps">
            Private opportunities
          </h2>
          <Link className="gha-link" to={admin('/opportunities?visibility=private')}>
            Open in Opportunities
          </Link>
        </div>
        <div className="gha-panel" style={{ marginTop: 12 }}>
          {opportunities.isLoading ? (
            <SkeletonRows rows={2} />
          ) : opportunities.isError ? (
            <div style={{ padding: 16 }}>
              <ErrorState message={(opportunities.error as Error).message} onRetry={() => void opportunities.refetch()} />
            </div>
          ) : privateOpps.length === 0 ? (
            <EmptyState
              compact
              title="No private opportunities"
              text="To handle an opportunity privately, set its visibility to Private in Basics."
              action={
                <Link className="gha-btn gha-btn--secondary" to={admin('/opportunities/new')}>
                  <Plus size={16} aria-hidden />
                  Add opportunity
                </Link>
              }
            />
          ) : (
            <ul className="gha-list">
              {privateOpps.map((o) => (
                <li key={o.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <Link className="gha-list__item" to={admin(`/opportunities/${o.id}`)} style={{ flex: 1, minWidth: 0 }}>
                    <Thumb src={o.images[0] ?? ''} size="sm" />
                    <span className="gha-list__body">
                      <span className="gha-opp__title">{o.title || 'Untitled opportunity'}</span>
                      <span className="gha-opp__sub">
                        {[publicLocationLine(o), o.type, o.reference].filter(Boolean).join(' · ')} · Updated {formatDate(o.updatedAt)}
                      </span>
                    </span>
                    <span className="gha-list__end">
                      <VisibilityBadge visibility="private" teaser={o.privateTeaser} />
                      <StatusBadge status={o.status} />
                    </span>
                  </Link>
                  <span style={{ paddingRight: 8 }}>
                    <OpportunityActions opportunity={o} compact />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="gha-section" aria-labelledby="gha-private-enq">
        <div className="gha-section__head">
          <h2 className="gha-h2" id="gha-private-enq">
            Private enquiries
          </h2>
        </div>
        <div style={{ marginTop: 12 }}>
          <EnquiryWorkspace privateOnly />
        </div>
      </section>
    </div>
  );
}
