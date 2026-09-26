import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  LayoutGrid,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import logoIvory from '@/assets/greenhill/hero/green-hill-logo-hero-168.webp';
import logoSolid from '@/assets/greenhill/hero/green-hill-logo-solid-112.webp';
import { useAdminSession } from './AdminSession';
import { useEnquiries, useOpportunities } from './data/queries';
import type { OpportunityStatus } from './domain/opportunity';
import { useAdminPath } from './paths';

const OPPORTUNITY_VIEWS: { status: OpportunityStatus | 'all'; label: string }[] = [
  { status: 'all', label: 'All' },
  { status: 'draft', label: 'Drafts' },
  { status: 'available', label: 'Available' },
  { status: 'reserved', label: 'Reserved' },
  { status: 'sold', label: 'Sold' },
  { status: 'archived', label: 'Archived' },
];

const CONTENT_LINKS = [
  { path: '/content/home', label: 'Homepage' },
  { path: '/content/about', label: 'About / Reece' },
  { path: '/content/whyLombok', label: 'Why Lombok' },
  { path: '/content/buying', label: 'Buying in Lombok' },
  { path: '/content/private', label: 'Green Hill Private' },
  { path: '/content/opportunities', label: 'Opportunities page' },
  { path: '/content/notes', label: 'Notes page' },
  { path: '/content/enquire', label: 'Enquiry page' },
  { path: '/content/footer', label: 'Footer & contact' },
];

const SETTINGS_LINKS = [
  { path: '/settings/site', label: 'Site settings' },
  { path: '/settings/seo', label: 'SEO & social' },
  { path: '/settings/integrations', label: 'Integrations' },
];

function NavGroup({
  label,
  to,
  current,
  children,
}: {
  label: string;
  to?: string;
  current?: 'page';
  children: React.ReactNode;
}) {
  return (
    <div className="gha-nav__group">
      {to ? (
        <Link className="gha-nav__heading" to={to} aria-current={current}>
          {label}
        </Link>
      ) : (
        <span className="gha-nav__heading">{label}</span>
      )}
      <div className="gha-nav__sub">{children}</div>
    </div>
  );
}

function useFocusOnNavigate(targetRef: React.RefObject<HTMLElement>) {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Move focus to the new page for keyboard and screen reader users.
    const heading = targetRef.current?.querySelector<HTMLElement>('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    } else {
      targetRef.current?.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0 });
  }, [pathname, targetRef]);
}

export function AdminShell() {
  const { admin, site } = useAdminPath();
  const { pathname, search } = useLocation();
  const { email, isLocalPreview, signOut } = useAdminSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const opportunities = useOpportunities();
  const enquiries = useEnquiries();

  useFocusOnNavigate(mainRef);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, search]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.querySelector<HTMLElement>('#gha-sidebar .gha-brand')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const counts = useMemo(() => {
    const list = opportunities.data ?? [];
    const byStatus: Record<string, number> = { all: 0 };
    for (const item of list) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      if (item.status !== 'archived') byStatus.all += 1;
    }
    return byStatus;
  }, [opportunities.data]);

  const newEnquiries = (enquiries.data ?? []).filter((item) => item.status === 'new').length;

  const section = pathname.replace(/^\/[a-z]{2}\/admin/, '') || '/';
  const inOpportunities = section.startsWith('/opportunities');
  const statusParam = new URLSearchParams(search).get('status') ?? 'all';
  const current = (match: boolean) => (match ? ('page' as const) : undefined);

  const crumbs: Record<string, string> = {
    '/': 'Overview',
    '/opportunities': 'Opportunities',
    '/enquiries': 'Enquiries',
    '/private': 'Private',
    '/notes': 'Notes',
    '/relationships': 'Relationships',
    '/content': 'Content',
    '/settings': 'Settings',
  };
  const crumb = crumbs[`/${section.split('/')[1] ?? ''}`.replace(/\/$/, '') || '/'] ?? 'Admin';

  return (
    <div className="gh-admin">
      <a className="gha-skip" href="#gha-main">
        Skip to content
      </a>
      <div className="gha-shell">
        {drawerOpen ? <div className="gha-scrim" onClick={() => setDrawerOpen(false)} aria-hidden /> : null}

        <aside className="gha-sidebar" data-open={drawerOpen} aria-label="Admin navigation" id="gha-sidebar">
          <Link className="gha-brand" to={admin()}>
            <img src={logoIvory} alt="Green Hill Lombok" width={168} height={46} />
            <span className="gha-brand__role">Admin</span>
          </Link>

          <nav className="gha-nav" aria-label="Sections">
            <div className="gha-nav__group">
              <Link className="gha-nav__link" to={admin()} aria-current={current(section === '/')}>
                <LayoutGrid size={18} aria-hidden />
                Overview
              </Link>
            </div>

            <NavGroup label="Content" to={admin('/content')} current={current(section === '/content')}>
              {CONTENT_LINKS.map((item) => (
                <Link
                  key={item.path}
                  className="gha-nav__link"
                  to={admin(item.path)}
                  aria-current={current(section === item.path)}
                >
                  {item.label}
                </Link>
              ))}
            </NavGroup>

            <NavGroup label="Opportunities">
              {OPPORTUNITY_VIEWS.map((view) => (
                <Link
                  key={view.status}
                  className="gha-nav__link"
                  to={view.status === 'all' ? admin('/opportunities') : admin(`/opportunities?status=${view.status}`)}
                  aria-current={current(section === '/opportunities' && statusParam === view.status)}
                  data-section={view.status === 'all' && inOpportunities && section !== '/opportunities' ? 'true' : undefined}
                >
                  {view.label}
                  {opportunities.data ? <span className="gha-nav__count">{counts[view.status] ?? 0}</span> : null}
                </Link>
              ))}
            </NavGroup>

            <NavGroup label="Relationships">
              <Link className="gha-nav__link" to={admin('/enquiries')} aria-current={current(section.startsWith('/enquiries'))}>
                Enquiries
                {newEnquiries > 0 ? (
                  <span className="gha-nav__count gha-nav__count--alert" aria-label={`${newEnquiries} new`}>
                    {newEnquiries}
                  </span>
                ) : null}
              </Link>
              <Link className="gha-nav__link" to={admin('/private')} aria-current={current(section.startsWith('/private'))}>
                Private
              </Link>
            </NavGroup>

            <NavGroup label="Editorial">
              <Link className="gha-nav__link" to={admin('/notes')} aria-current={current(section.startsWith('/notes'))}>
                Notes
              </Link>
            </NavGroup>

            <NavGroup label="Settings">
              {SETTINGS_LINKS.map((item) => (
                <Link
                  key={item.path}
                  className="gha-nav__link"
                  to={admin(item.path)}
                  aria-current={current(section === item.path)}
                >
                  {item.label}
                </Link>
              ))}
            </NavGroup>
          </nav>

          <div className="gha-sidebar__foot">
            {email ? <p className="gha-sidebar__who">Signed in as {email}</p> : null}
            {isLocalPreview ? <p className="gha-sidebar__who">Local preview session</p> : null}
            <a className="gha-nav__link" href={site('/')} target="_blank" rel="noreferrer">
              <ArrowUpRight size={18} aria-hidden />
              View website
              <span className="gha-sr-only">(opens in a new tab)</span>
            </a>
            <button type="button" className="gha-btn gha-btn--sidebar" onClick={() => void signOut()}>
              <LogOut size={18} aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        <div className="gha-main">
          <header className="gha-topbar">
            <button
              ref={menuButtonRef}
              type="button"
              className="gha-btn gha-btn--ghost gha-btn--icon gha-topbar__menu"
              aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={drawerOpen}
              aria-controls="gha-sidebar"
              onClick={() => setDrawerOpen((open) => !open)}
            >
              {drawerOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
            <Link className="gha-topbar__brand" to={admin()} aria-label="Green Hill admin overview">
              <img src={logoSolid} alt="" width={96} height={26} />
            </Link>
            <span className="gha-topbar__crumb">
              Green Hill Admin <span aria-hidden>·</span> {crumb}
            </span>
            <span className="gha-topbar__spacer" />
            <a className="gha-btn gha-btn--ghost gha-btn--sm" href={site('/')} target="_blank" rel="noreferrer">
              Website
              <ArrowUpRight size={15} aria-hidden />
              <span className="gha-sr-only">(opens in a new tab)</span>
            </a>
          </header>

          {isLocalPreview ? (
            <div className="gha-banner" role="note">
              <span>
                <strong>Local preview.</strong> No Green Hill database is connected, so records are kept in this
                browser only and nothing is published. Development builds only.
              </span>
            </div>
          ) : null}

          <main id="gha-main" ref={mainRef} className="gha-content" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
