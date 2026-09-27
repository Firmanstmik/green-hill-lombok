import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from '@/icons/iconsax';
import { PAGES } from '@/content/schema';
import { useAdminPath } from '../paths';
import ContentEditorPage from './ContentEditorPage';
import { PAGE_ROUTE, PageStatusChip, usePageStates } from './ContentOverviewPage';

/**
 * Routes onto the structured editor. Site settings and Footer & contact are
 * two views of the same "site" record, so there is one source for each value.
 */
export function ContentPageRoute() {
  const { page } = useParams();
  if (page === 'footer') return <FooterContactPage />;
  return <ContentEditorPage pageKey={page} />;
}

function FooterContactPage() {
  const { admin } = useAdminPath();
  return (
    <ContentEditorPage
      pageKey="site"
      sections={['footer']}
      title="Footer & contact"
      intro="The footer shown at the bottom of every page."
      footer={
        <p className="gha-hint">
          Email, WhatsApp and Instagram are edited in{' '}
          <Link className="gha-link" to={admin('/settings/site')}>
            Site settings
          </Link>
          ; the footer uses them automatically.
        </p>
      }
    />
  );
}

export function SiteSettingsPage() {
  return (
    <ContentEditorPage
      pageKey="site"
      sections={['contact']}
      title="Site settings"
      intro="Contact details used by every “Talk to Reece” button, the footer and the contact panel."
    />
  );
}

export function SeoSettingsPage() {
  const { admin } = useAdminPath();
  const { states } = usePageStates();
  const pages = PAGES.filter((page) => page.group === 'content');
  return (
    <ContentEditorPage
      pageKey="seo"
      title="SEO & social"
      footer={
        <>
          <section className="gha-section" aria-labelledby="gha-seo-pages">
            <div className="gha-section__head">
              <h2 className="gha-h2" id="gha-seo-pages">
                Each page
              </h2>
            </div>
            <p className="gha-hint" style={{ marginTop: 0 }}>
              Every page has its own title, description and sharing image under “Search &amp; sharing”. Opportunities and notes
              have theirs in their own editor.
            </p>
            <ul className="gha-content-list" aria-label="Page search settings">
              {pages.map((page) => (
                <li key={page.key}>
                  <Link className="gha-content-row" to={`${admin(PAGE_ROUTE[page.key])}#section-seo`}>
                    <span className="gha-content-row__main">
                      <span className="gha-content-row__title">{page.title}</span>
                    </span>
                    <span className="gha-content-row__meta">
                      <PageStatusChip state={states?.[page.key]} />
                    </span>
                    <ArrowRight size={16} aria-hidden className="gha-content-row__go" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="gha-section" aria-labelledby="gha-seo-robots">
            <div className="gha-section__head">
              <h2 className="gha-h2" id="gha-seo-robots">
                Search engine access
              </h2>
              <span className="gha-meta">Managed in the site code</span>
            </div>
            <dl className="gha-dl">
              <div>
                <dt>Public pages</dt>
                <dd>Open to search engines in all four languages.</dd>
              </div>
              <div>
                <dt>Private opportunities, admin and previews</dt>
                <dd>Never indexed.</dd>
              </div>
            </dl>
            <div className="gha-alert gha-alert--gold" style={{ marginTop: 12 }}>
              <div>
                <span className="gha-alert__title">Hiding the whole site from Google</span>
                <span>
                  This is deliberately not a switch here: a “noindex” left on by mistake removes Green Hill from search.
                  Ask your developer if the site ever needs to be hidden.
                </span>
              </div>
            </div>
          </section>
        </>
      }
    />
  );
}
