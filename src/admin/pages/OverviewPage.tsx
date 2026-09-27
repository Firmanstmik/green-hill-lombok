import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from '@/icons/iconsax';
import { useEnquiries, useOpportunities } from '../data/queries';
import { PAGES } from '@/content/schema';
import { useContactSettings } from '@/content/hooks';
import { attentionItems, contentAttention, groupAttention } from '../domain/attention';
import { PAGE_ROUTE, usePageStates } from '../content/ContentOverviewPage';
import { ENQUIRY_SOURCE_LABEL } from '../domain/enquiry';
import { publicLocationLine } from '../domain/opportunity';
import { useAdminPath } from '../paths';
import { formatDate, timeAgo } from '../ui/format';
import { useSelf } from '../users/usersApi';
import {
  EmptyState,
  EnquiryStatusBadge,
  ErrorState,
  PageHead,
  SkeletonRows,
  StatusBadge,
  Thumb,
  VisibilityBadge,
} from '../ui/primitives';

function greeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function OverviewPage() {
  const { admin } = useAdminPath();
  const opportunities = useOpportunities();
  const enquiries = useEnquiries();

  useEffect(() => {
    document.title = 'Overview · Green Hill Admin';
  }, []);

  const opps = useMemo(() => opportunities.data ?? [], [opportunities.data]);
  const enqs = useMemo(() => enquiries.data ?? [], [enquiries.data]);

  const signals = useMemo(() => {
    const active = opps.filter((o) => o.status === 'available' || o.status === 'reserved').length;
    const drafts = opps.filter((o) => o.status === 'draft').length;
    const privateCount = opps.filter((o) => o.visibility === 'private' && o.status !== 'archived').length;
    const fresh = enqs.filter((e) => e.status === 'new').length;
    return { active, drafts, privateCount, fresh };
  }, [opps, enqs]);

  const { states } = usePageStates();
  const sections = useMemo(() => {
    const pages = PAGES.map((page) => ({
      key: page.key,
      title: page.key === 'site' ? 'Footer & contact' : page.title,
      to: PAGE_ROUTE[page.key],
      changes: states?.[page.key]?.status === 'changes',
      translations: states?.[page.key]?.translations ?? 0,
    }));
    return groupAttention([...attentionItems(opps, enqs), ...contentAttention(pages)]);
  }, [opps, enqs, states]);
  // The signed-in admin's own name when set; otherwise the site's contact name.
  const self = useSelf();
  const contactName = useContactSettings().name;
  const firstName = (self?.fullName || contactName).split(' ')[0] || 'Reece';
  const recentOpps = useMemo(() => opps.filter((o) => o.status !== 'archived').slice(0, 5), [opps]);
  const recentEnqs = enqs.slice(0, 5);
  const loading = opportunities.isLoading || enquiries.isLoading;
  const value = (n: number) => (loading ? '–' : String(n));

  return (
    <div className="gha-enter">
      <PageHead
        eyebrow="Overview"
        title={`${greeting()}, ${firstName}.`}
        lead="Here’s where Green Hill stands today."
        actions={
          <Link className="gha-btn gha-btn--primary" to={admin('/opportunities/new')}>
            <Plus size={18} aria-hidden />
            Add opportunity
          </Link>
        }
      />

      <section aria-label="Current state" className="gha-signals">
        <Link className="gha-signal" to={admin('/opportunities')}>
          <span className="gha-signal__label">Active opportunities</span>
          <span className="gha-signal__value">{value(signals.active)}</span>
          <span className="gha-signal__note">Available or reserved</span>
        </Link>
        <Link className="gha-signal" to={admin('/opportunities?status=draft')}>
          <span className="gha-signal__label">Drafts</span>
          <span className="gha-signal__value">{value(signals.drafts)}</span>
          <span className="gha-signal__note">Not yet published</span>
        </Link>
        <Link className="gha-signal" to={admin('/private')}>
          <span className="gha-signal__label">Private</span>
          <span className="gha-signal__value">{value(signals.privateCount)}</span>
          <span className="gha-signal__note">Handled directly, never listed</span>
        </Link>
        <Link className="gha-signal" to={admin('/enquiries?status=new')}>
          <span className="gha-signal__label">New enquiries</span>
          <span className="gha-signal__value">{value(signals.fresh)}</span>
          <span className="gha-signal__note">Waiting for a first reply</span>
        </Link>
      </section>

      {opportunities.isError ? (
        <div className="gha-section">
          <ErrorState message={(opportunities.error as Error).message} onRetry={() => void opportunities.refetch()} />
        </div>
      ) : null}

      <div className="gha-columns">
        <div>
          <section className="gha-section" aria-labelledby="gha-attention">
            <div className="gha-section__head">
              <h2 className="gha-h2" id="gha-attention">
                What needs your attention
              </h2>
            </div>
            {loading ? (
              <SkeletonRows rows={3} />
            ) : sections.length === 0 ? (
              <EmptyState
                compact
                title="Nothing waiting on you"
                text="Every enquiry has a reply, every published opportunity is complete and the website is up to date."
              />
            ) : (
              <ul className="gha-attention-groups">
                {sections.map((section) => (
                  <li key={section.group} className="gha-attention-group">
                    <div className="gha-attention-group__head">
                      <span className="gha-attention-group__label">{section.label}</span>
                      <span className="gha-attention-group__count">{section.items.length}</span>
                      <span className="gha-attention-group__summary">{section.summary}</span>
                      <Link className="gha-link gha-attention-group__go" to={admin(section.to)}>
                        Review <span aria-hidden>→</span>
                        <span className="gha-sr-only"> {section.label.toLowerCase()}</span>
                      </Link>
                    </div>
                    <ul className="gha-attention">
                      {section.items.slice(0, 4).map((item) => (
                        <li key={item.id}>
                          <Link to={admin(item.to)}>
                            <span
                              className={`gha-attention__mark${item.urgent ? '' : ' gha-attention__mark--quiet'}`}
                              aria-hidden
                            />
                            <span>
                              <span className="gha-attention__title">{item.title}</span>
                              <span className="gha-attention__text">{item.text}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {section.items.length > 4 ? (
                      <p className="gha-meta" style={{ margin: '6px 0 0' }}>
                        And {section.items.length - 4} more.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="gha-section" aria-labelledby="gha-recent-opps">
            <div className="gha-section__head">
              <h2 className="gha-h2" id="gha-recent-opps">
                Recently updated opportunities
              </h2>
              <Link className="gha-link" to={admin('/opportunities')}>
                All opportunities
              </Link>
            </div>
            {loading ? (
              <SkeletonRows rows={3} />
            ) : recentOpps.length === 0 ? (
              <EmptyState
                compact
                title="No opportunities yet"
                text="Your first opportunity will appear here as soon as you save it."
              />
            ) : (
              <ul className="gha-list">
                {recentOpps.map((o) => (
                  <li key={o.id}>
                    <Link className="gha-list__item" to={admin(`/opportunities/${o.id}`)}>
                      <Thumb src={o.images[0] ?? ''} size="sm" />
                      <span className="gha-list__body">
                        <span className="gha-opp__title">{o.title || 'Untitled opportunity'}</span>
                        <span className="gha-opp__sub">
                          {publicLocationLine(o) || 'Location not set'} · Updated {formatDate(o.updatedAt)}
                        </span>
                      </span>
                      <span className="gha-list__end">
                        <StatusBadge status={o.status} />
                        {o.visibility === 'private' ? <VisibilityBadge visibility="private" teaser={o.privateTeaser} /> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="gha-section" aria-labelledby="gha-recent-enq">
          <div className="gha-section__head">
            <h2 className="gha-h2" id="gha-recent-enq">
              Recent enquiries
            </h2>
            <Link className="gha-link" to={admin('/enquiries')}>
              All enquiries
            </Link>
          </div>
          {loading ? (
            <SkeletonRows rows={3} />
          ) : recentEnqs.length === 0 ? (
            <EmptyState
              compact
              title="No enquiries yet"
              text="Your conversations will appear here once someone reaches out."
            />
          ) : (
            <ul className="gha-list">
              {recentEnqs.map((e) => (
                <li key={e.id}>
                  <Link className="gha-list__item" to={admin(`/enquiries?id=${e.id}`)}>
                    <span className="gha-list__body">
                      <span className="gha-opp__title">{e.name}</span>
                      <span className="gha-opp__sub">
                        {e.opportunityTitle || e.enquiryType || ENQUIRY_SOURCE_LABEL[e.source]} · {timeAgo(e.createdAt)}
                      </span>
                    </span>
                    <span className="gha-list__end">
                      <EnquiryStatusBadge status={e.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
