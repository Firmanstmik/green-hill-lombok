import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronDown,
  FileText,
  KeyRound,
  LandPlot,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from '@/icons/iconsax';
import logoIvory from '@/assets/greenhill/hero/green-hill-logo-hero-168.webp';
import logoSolid from '@/assets/greenhill/hero/green-hill-logo-solid-112.webp';
import { useAdminSession } from './AdminSession';
import { useEnquiries, useOpportunities } from './data/queries';
import {
  NAV_GROUPS,
  SECTION_TITLES,
  activeGroup,
  adminSection,
  currentItem,
  readNavPrefs,
  writeNavPrefs,
  type GroupId,
  type NavPrefs,
} from './navigation';
import { useAdminPath } from './paths';
import { ActionMenu } from './ui/overlays';
import { displayName, initials, useSelf } from './users/usersApi';

const GROUP_ICONS: Record<GroupId, LucideIcon> = {
  content: FileText,
  opportunities: LandPlot,
  relationships: UsersRound,
  settings: Settings2,
};

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

function useDesktop() {
  const query = '(min-width: 1024px)';
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

export function AdminShell() {
  const { admin, site } = useAdminPath();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { email, isLocalPreview, signOut } = useAdminSession();
  const self = useSelf();
  const desktop = useDesktop();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefs, setPrefs] = useState<NavPrefs>(readNavPrefs);
  const mainRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const opportunities = useOpportunities();
  const enquiries = useEnquiries();

  useFocusOnNavigate(mainRef);

  const section = adminSection(pathname);
  const status = new URLSearchParams(search).get('status') ?? 'all';
  const group = activeGroup(section);
  const current = currentItem(section, status);
  const collapsed = desktop && prefs.collapsed;

  const updatePrefs = useCallback((next: (prev: NavPrefs) => NavPrefs) => {
    setPrefs((prev) => {
      const value = next(prev);
      writeNavPrefs(value);
      return value;
    });
  }, []);

  // The group of the page you are on opens by itself (not remembered); only
  // groups you open or close yourself are remembered. Arriving on a page
  // reopens its group even if you had closed it earlier.
  useEffect(() => {
    if (!group) return;
    updatePrefs((prev) => {
      if (prev.groups[group] !== false) return prev;
      const groups = { ...prev.groups };
      delete groups[group];
      return { ...prev, groups };
    });
  }, [group, updatePrefs]);
  const isOpen = (id: GroupId) => prefs.groups[id] ?? id === group;

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, search]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.querySelector<HTMLElement>('#gha-sidebar .gha-drawer-close')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const counts = useMemo(() => {
    const list = opportunities.data ?? [];
    const byView: Record<string, number> = { all: 0, private: 0 };
    for (const item of list) {
      byView[item.status] = (byView[item.status] ?? 0) + 1;
      if (item.status !== 'archived') byView.all += 1;
      if (item.visibility === 'private' && item.status !== 'archived') byView.private += 1;
    }
    return byView;
  }, [opportunities.data]);

  const newEnquiries = (enquiries.data ?? []).filter((item) => item.status === 'new').length;

  const countFor = (groupId: GroupId, id: string): ReactNode => {
    if (id === 'enquiries') {
      return newEnquiries > 0 ? (
        <span className="gha-nav__count gha-nav__count--alert" aria-label={`${newEnquiries} new`}>
          {newEnquiries}
        </span>
      ) : null;
    }
    if (groupId !== 'opportunities' || !opportunities.data) return null;
    const view = id === 'private' ? 'private' : id.replace(/^opportunities-/, '');
    return view ? <span className="gha-nav__count">{counts[view] ?? 0}</span> : null;
  };

  const who = self ? displayName(self) : email ?? (isLocalPreview ? 'Local preview' : 'Admin');
  const monogram = self ? initials(self) : email ? initials({ fullName: '', email }) : 'GH';
  const changePasswordHref = site('/auth/update-password');

  const accountEntries = [
    { kind: 'label' as const, label: email ?? 'Local preview' },
    { kind: 'item' as const, label: 'Account', icon: <UserRound size={16} aria-hidden />, onSelect: () => navigate(admin('/settings/account')) },
    ...(isLocalPreview
      ? []
      : [{ kind: 'item' as const, label: 'Change password', icon: <KeyRound size={16} aria-hidden />, onSelect: () => navigate(changePasswordHref) }]),
    { kind: 'separator' as const },
    { kind: 'item' as const, label: 'Sign out', icon: <LogOut size={16} aria-hidden />, onSelect: () => void signOut() },
  ];

  const toggleGroup = (id: GroupId) =>
    updatePrefs((prev) => ({ ...prev, groups: { ...prev.groups, [id]: !(prev.groups[id] ?? id === group) } }));

  const crumb = SECTION_TITLES[group ?? 'overview'];

  return (
    <div className="gh-admin">
      <a className="gha-skip" href="#gha-main">
        Skip to content
      </a>
      <div className="gha-shell" data-collapsed={collapsed}>
        <div className="gha-scrim" data-open={drawerOpen} onClick={() => setDrawerOpen(false)} aria-hidden />

        <aside className="gha-sidebar" data-open={drawerOpen} aria-label="Admin navigation" id="gha-sidebar">
          <div className="gha-sidebar__head">
            <Link className="gha-brand" to={admin()} aria-label="Green Hill Admin: overview">
              <img className="gha-brand__logo" src={logoIvory} alt="" width={168} height={46} />
              <span className="gha-brand__role">Admin</span>
            </Link>
            {desktop ? (
              <button
                type="button"
                className="gha-rail-toggle"
                onClick={() => updatePrefs((prev) => ({ ...prev, collapsed: !prev.collapsed }))}
                aria-label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
                aria-expanded={!collapsed}
                data-tip={collapsed ? 'Expand' : undefined}
              >
                {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
              </button>
            ) : (
              <button type="button" className="gha-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
                <X size={20} aria-hidden />
              </button>
            )}
          </div>

          <nav className="gha-nav" aria-label="Sections">
            <Link
              className="gha-nav__link gha-nav__top"
              to={admin()}
              aria-current={section === '/' ? 'page' : undefined}
              data-tip={collapsed ? 'Overview' : undefined}
            >
              <LayoutGrid size={18} aria-hidden />
              <span className="gha-nav__text">Overview</span>
            </Link>

            {NAV_GROUPS.map((navGroup) => {
              const Icon = GROUP_ICONS[navGroup.id];
              const open = isOpen(navGroup.id);
              const here = group === navGroup.id;
              if (collapsed) {
                return (
                  <Link
                    key={navGroup.id}
                    className="gha-nav__link gha-nav__top"
                    to={admin(navGroup.to)}
                    aria-current={here ? 'page' : undefined}
                    data-tip={navGroup.label}
                  >
                    <Icon size={18} aria-hidden />
                    <span className="gha-nav__text">{navGroup.label}</span>
                    {navGroup.id === 'relationships' && newEnquiries > 0 ? (
                      <span className="gha-nav__dot" aria-label={`${newEnquiries} new enquiries`} />
                    ) : null}
                  </Link>
                );
              }
              return (
                <div className="gha-nav__group" key={navGroup.id} data-here={here || undefined}>
                  <button
                    type="button"
                    className="gha-nav__toggle"
                    aria-expanded={open}
                    aria-controls={`gha-nav-${navGroup.id}`}
                    onClick={() => toggleGroup(navGroup.id)}
                  >
                    <Icon size={18} aria-hidden />
                    <span className="gha-nav__text">{navGroup.label}</span>
                    {!open && navGroup.id === 'relationships' && newEnquiries > 0 ? (
                      <span className="gha-nav__dot" aria-label={`${newEnquiries} new enquiries`} />
                    ) : null}
                    <ChevronDown size={16} className="gha-nav__chevron" aria-hidden />
                  </button>
                  <div className="gha-nav__panel" id={`gha-nav-${navGroup.id}`} data-open={open} {...(open ? {} : { inert: '' })}>
                    <div className="gha-nav__sub">
                      {navGroup.items.map((item) => (
                        <Link
                          key={item.id}
                          className="gha-nav__link"
                          to={admin(item.to)}
                          aria-current={current === item.id ? 'page' : undefined}
                        >
                          <span className="gha-nav__text">{item.label}</span>
                          {countFor(navGroup.id, item.id)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="gha-sidebar__foot">
            <a
              className="gha-nav__link gha-nav__top"
              href={site('/')}
              target="_blank"
              rel="noreferrer"
              data-tip={collapsed ? 'Website' : undefined}
            >
              <ArrowUpRight size={18} aria-hidden />
              <span className="gha-nav__text">Website</span>
              <span className="gha-sr-only">(opens in a new tab)</span>
            </a>
            {desktop ? (
              <ActionMenu
                label="Account menu"
                entries={accountEntries}
                trigger={
                  <button type="button" className="gha-account" data-tip={collapsed ? who : undefined}>
                    <span className="gha-avatar" aria-hidden>
                      {monogram}
                    </span>
                    <span className="gha-account__text">
                      <span className="gha-account__name">{who}</span>
                      <span className="gha-account__role">Admin</span>
                    </span>
                  </button>
                }
              />
            ) : (
              <div className="gha-drawer-account">
                <div className="gha-account gha-account--static">
                  <span className="gha-avatar" aria-hidden>
                    {monogram}
                  </span>
                  <span className="gha-account__text">
                    <span className="gha-account__name">{who}</span>
                    <span className="gha-account__role">Admin</span>
                  </span>
                </div>
                <Link className="gha-nav__link" to={admin('/settings/account')}>
                  <UserRound size={17} aria-hidden />
                  <span className="gha-nav__text">Account</span>
                </Link>
                {!isLocalPreview ? (
                  <Link className="gha-nav__link" to={changePasswordHref}>
                    <KeyRound size={17} aria-hidden />
                    <span className="gha-nav__text">Change password</span>
                  </Link>
                ) : null}
                <button type="button" className="gha-nav__link gha-nav__button" onClick={() => void signOut()}>
                  <LogOut size={17} aria-hidden />
                  <span className="gha-nav__text">Sign out</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="gha-main">
          <header className="gha-topbar">
            <button
              ref={menuButtonRef}
              type="button"
              className="gha-btn gha-btn--ghost gha-btn--icon gha-topbar__menu"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              aria-controls="gha-sidebar"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={20} aria-hidden />
            </button>
            <Link className="gha-topbar__brand" to={admin()} aria-label="Green Hill Admin: overview">
              <img src={logoSolid} alt="" width={96} height={26} />
              <span className="gha-topbar__role">Admin</span>
            </Link>
            <span className="gha-topbar__crumb">
              Green Hill Admin <span aria-hidden>·</span> {crumb}
            </span>
            <span className="gha-topbar__spacer" />
            <a className="gha-btn gha-btn--ghost gha-btn--sm gha-topbar__site" href={site('/')} target="_blank" rel="noreferrer">
              <span className="gha-topbar__site-label">Website</span>
              <ArrowUpRight size={15} aria-hidden />
              <span className="gha-sr-only">(opens in a new tab)</span>
            </a>
            {!desktop ? (
              <ActionMenu
                label="Account menu"
                entries={accountEntries}
                trigger={
                  <button type="button" className="gha-avatar gha-avatar--button">
                    {monogram}
                  </button>
                }
              />
            ) : null}
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
