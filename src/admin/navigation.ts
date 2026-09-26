/**
 * Green Hill Admin navigation: one source for the sidebar, the collapsed
 * rail and the mobile drawer. Words are the owner's, not the developer's:
 * Content = website pages, Opportunities = land & investment listings,
 * Relationships = investor enquiries and the people who can sign in.
 */
export type GroupId = 'content' | 'opportunities' | 'relationships' | 'settings';

export type NavItem = {
  id: string;
  label: string;
  /** Path under /:lang/admin, optionally with a query string. */
  to: string;
  current: (section: string, status: string) => boolean;
};

export type NavGroupDef = {
  id: GroupId;
  label: string;
  /** Where the group's icon leads when the sidebar is collapsed. */
  to: string;
  items: NavItem[];
};

const page = (id: string, label: string, to: string): NavItem => ({ id, label, to, current: (section) => section === to });
const startsWith = (id: string, label: string, to: string): NavItem => ({
  id,
  label,
  to,
  current: (section) => section === to || section.startsWith(`${to}/`),
});
const opportunityView = (status: string, label: string): NavItem => ({
  id: `opportunities-${status}`,
  label,
  to: status === 'all' ? '/opportunities' : `/opportunities?status=${status}`,
  current: (section, current) => section === '/opportunities' && current === status,
});

export const NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'content',
    label: 'Content',
    to: '/content',
    items: [
      page('home', 'Homepage', '/content/home'),
      page('about', 'About / Reece', '/content/about'),
      page('whyLombok', 'Why Lombok', '/content/whyLombok'),
      page('buying', 'Buying in Lombok', '/content/buying'),
      page('private-page', 'Green Hill Private', '/content/private'),
      page('opportunities-page', 'Opportunities page', '/content/opportunities'),
      page('notes-page', 'Notes page', '/content/notes'),
      page('enquire', 'Enquiry page', '/content/enquire'),
      page('footer', 'Footer & contact', '/content/footer'),
      startsWith('notes', 'Notes (articles)', '/notes'),
    ],
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    to: '/opportunities',
    items: [
      opportunityView('all', 'All'),
      opportunityView('draft', 'Drafts'),
      opportunityView('available', 'Available'),
      opportunityView('reserved', 'Reserved'),
      opportunityView('sold', 'Sold'),
      startsWith('private', 'Private', '/private'),
      opportunityView('archived', 'Archived'),
    ],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    to: '/enquiries',
    items: [startsWith('enquiries', 'Enquiries', '/enquiries'), startsWith('users', 'Users & Admins', '/users')],
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/settings/site',
    items: [
      page('site', 'Site settings', '/settings/site'),
      page('seo', 'SEO & social', '/settings/seo'),
      page('account', 'Account', '/settings/account'),
    ],
  },
];

/** "/en/admin/content/home" -> "/content/home"; the overview is "/". */
export function adminSection(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}\/admin/, '').replace(/\/$/, '') || '/';
}

/** The group the current page belongs to (it opens automatically). */
export function activeGroup(section: string): GroupId | null {
  if (section.startsWith('/content') || section.startsWith('/notes')) return 'content';
  if (section.startsWith('/opportunities') || section.startsWith('/private')) return 'opportunities';
  if (section.startsWith('/enquiries') || section.startsWith('/users')) return 'relationships';
  if (section.startsWith('/settings')) return 'settings';
  return null;
}

/** The sidebar entry that marks the current page; an open opportunity keeps "All" highlighted as its section. */
export function currentItem(section: string, status: string): string | null {
  for (const group of NAV_GROUPS) {
    const hit = group.items.find((item) => item.current(section, status));
    if (hit) return hit.id;
  }
  if (section.startsWith('/opportunities/')) return 'opportunities-all';
  return null;
}

export const SECTION_TITLES: Record<GroupId | 'overview', string> = {
  overview: 'Overview',
  content: 'Content',
  opportunities: 'Opportunities',
  relationships: 'Relationships',
  settings: 'Settings',
};

// ---- UI preferences (never auth): open groups and the collapsed rail ----

const PREFS_KEY = 'gh-admin-nav';

export type NavPrefs = { groups: Partial<Record<GroupId, boolean>>; collapsed: boolean };

export function readNavPrefs(): NavPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<NavPrefs> | null;
    const groups: NavPrefs['groups'] = {};
    for (const group of NAV_GROUPS) {
      const value = raw?.groups?.[group.id];
      if (typeof value === 'boolean') groups[group.id] = value;
    }
    return { groups, collapsed: raw?.collapsed === true };
  } catch {
    return { groups: {}, collapsed: false };
  }
}

export function writeNavPrefs(prefs: NavPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private windows may refuse storage; the sidebar simply won't remember.
  }
}
