import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAdminSession } from '../AdminSession';
import { loadLocalStore } from '../data/localLoader';
import { ConfirmDialog } from '../ui/overlays';
import { PageHead } from '../ui/primitives';
import { useAdminPath } from '../paths';

const env = import.meta.env;
const INTEGRATIONS = [
  {
    name: 'Green Hill database',
    on: Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY),
    help: 'Supabase: opportunities, enquiries, content, notes and images.',
  },
  { name: 'Maps', on: Boolean(env.VITE_MAPBOX_ACCESS_TOKEN), help: 'Mapbox, for the location map on opportunity pages.' },
  { name: 'Site address', on: Boolean(env.VITE_SITE_URL), help: 'Used for sharing images, the sitemap and robots.txt.' },
  {
    name: 'Analytics',
    on: Boolean(env.VITE_GA4_MEASUREMENT_ID || env.VITE_META_PIXEL_ID),
    help: 'Google Analytics / Meta Pixel. Only loads on the live site once set.',
  },
];

/**
 * Only real values. Contact channels are constants in src/lib/contact.ts and
 * are shown read-only; nothing here pretends to be configurable when it is not.
 */
export function SettingsPage() {
  const { email, isLocalPreview, repository, signOut } = useAdminSession();
  const [resetOpen, setResetOpen] = useState(false);
  const { admin } = useAdminPath();

  useEffect(() => {
    document.title = 'Integrations & account · Green Hill Admin';
  }, []);

  const resetLocal = async () => {
    if (!loadLocalStore) return;
    const { resetLocalStore } = await loadLocalStore();
    resetLocalStore();
    toast.success('Local preview data cleared.');
    window.location.reload();
  };

  return (
    <div className="gha-enter">
      <PageHead eyebrow="Settings" title="Integrations & account" lead="What the admin is connected to, and your session." />

      <section className="gha-section" aria-labelledby="gha-set-contact" style={{ marginTop: 0 }}>
        <div className="gha-section__head">
          <h2 className="gha-h2" id="gha-set-contact">
            Contact &amp; search
          </h2>
        </div>
        <dl className="gha-dl">
          <div>
            <dt>Contact details</dt>
            <dd>
              Email, WhatsApp, Instagram and the WhatsApp opening message are edited in{' '}
              <Link className="gha-link" to={admin('/settings/site')}>
                Site settings
              </Link>
              .
            </dd>
          </div>
          <div>
            <dt>Enquiries</dt>
            <dd>
              Enquiries from the Green Hill Private form are saved here and then continue on WhatsApp. Opportunity pages
              link straight to WhatsApp, so record those conversations yourself with “Record enquiry”.
            </dd>
          </div>
        </dl>
      </section>

      <section className="gha-section" aria-labelledby="gha-set-integrations">
        <div className="gha-section__head">
          <h2 className="gha-h2" id="gha-set-integrations">
            Integrations
          </h2>
          <span className="gha-meta">Set by your developer · values are never shown here</span>
        </div>
        <dl className="gha-dl">
          {INTEGRATIONS.map((item) => (
            <div key={item.name}>
              <dt>{item.name}</dt>
              <dd>
                {item.on ? 'Connected' : 'Not configured'}
                <span className="gha-hint" style={{ display: 'block' }}>
                  {item.help}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="gha-section" aria-labelledby="gha-set-currency">
        <div className="gha-section__head">
          <h2 className="gha-h2" id="gha-set-currency">
            Prices
          </h2>
        </div>
        <dl className="gha-dl">
          <div>
            <dt>Source currency</dt>
            <dd>IDR by default. USD and GBP can be chosen per opportunity. The price is stored exactly as entered.</dd>
          </div>
          <div>
            <dt>Visitors</dt>
            <dd>See an approximate conversion into the currency they choose on the website.</dd>
          </div>
        </dl>
      </section>

      <section className="gha-section" aria-labelledby="gha-set-account">
        <div className="gha-section__head">
          <h2 className="gha-h2" id="gha-set-account">
            Account &amp; system
          </h2>
        </div>
        <dl className="gha-dl">
          <div>
            <dt>Signed in as</dt>
            <dd>{isLocalPreview ? 'Local preview (development only)' : email ?? '—'}</dd>
          </div>
          <div>
            <dt>Database</dt>
            <dd>
              {repository?.mode === 'supabase'
                ? 'Connected to the Green Hill database.'
                : 'Not connected. Records are kept in this browser only.'}
            </dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>One role: admin. Every change is checked by the database, not just by this screen.</dd>
          </div>
        </dl>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="gha-btn gha-btn--secondary" onClick={() => void signOut()}>
            Sign out
          </button>
          {isLocalPreview ? (
            <button type="button" className="gha-btn gha-btn--danger" onClick={() => setResetOpen(true)}>
              Clear local preview data
            </button>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Clear local preview data?"
        description="Every opportunity, enquiry, page edit and note kept in this browser is removed, and the demo opportunities are restored. The Green Hill database is not affected."
        confirmLabel="Clear data"
        tone="danger"
        onConfirm={() => void resetLocal()}
      />
    </div>
  );
}
