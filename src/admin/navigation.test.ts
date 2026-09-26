import { beforeEach, describe, expect, it } from 'vitest';
import { NAV_GROUPS, activeGroup, adminSection, currentItem, readNavPrefs, writeNavPrefs } from './navigation';
import { displayName, initials, inviteResult, userErrorMessage, userFromRow, userStatus } from './users/usersApi';

describe('admin navigation', () => {
  it('maps routes to their group, which opens automatically', () => {
    expect(adminSection('/en/admin')).toBe('/');
    expect(adminSection('/nl/admin/content/home/')).toBe('/content/home');
    expect(activeGroup('/')).toBeNull();
    expect(activeGroup('/content/about')).toBe('content');
    expect(activeGroup('/notes/abc')).toBe('content');
    expect(activeGroup('/opportunities/123')).toBe('opportunities');
    expect(activeGroup('/private')).toBe('opportunities');
    expect(activeGroup('/users')).toBe('relationships');
    expect(activeGroup('/enquiries')).toBe('relationships');
    expect(activeGroup('/settings/account')).toBe('settings');
  });

  it('marks exactly one current entry', () => {
    expect(currentItem('/content/home', 'all')).toBe('home');
    expect(currentItem('/opportunities', 'sold')).toBe('opportunities-sold');
    expect(currentItem('/opportunities', 'all')).toBe('opportunities-all');
    expect(currentItem('/opportunities/abc', 'all')).toBe('opportunities-all');
    expect(currentItem('/notes/new', 'all')).toBe('notes');
    expect(currentItem('/users', 'all')).toBe('users');
    expect(currentItem('/', 'all')).toBeNull();
  });

  it('covers every admin page the brief lists, in the owner’s words', () => {
    const labels = NAV_GROUPS.map((group) => [group.label, group.items.map((item) => item.label)]);
    expect(labels).toEqual([
      ['Content', ['Homepage', 'About / Reece', 'Why Lombok', 'Buying in Lombok', 'Green Hill Private', 'Opportunities page', 'Notes page', 'Enquiry page', 'Footer & contact', 'Notes (articles)']],
      ['Opportunities', ['All', 'Drafts', 'Available', 'Reserved', 'Sold', 'Private', 'Archived']],
      ['Relationships', ['Enquiries', 'Users & Admins']],
      ['Settings', ['Site settings', 'SEO & social', 'Account']],
    ]);
  });

  describe('preferences', () => {
    beforeEach(() => localStorage.clear());

    it('remembers open groups and the collapsed rail, and ignores anything else', () => {
      expect(readNavPrefs()).toEqual({ groups: {}, collapsed: false });
      writeNavPrefs({ groups: { content: true, settings: false }, collapsed: true });
      expect(readNavPrefs()).toEqual({ groups: { content: true, settings: false }, collapsed: true });
      localStorage.setItem('gh-admin-nav', JSON.stringify({ groups: { content: 'yes', admin: true }, collapsed: 1, isAdmin: true }));
      expect(readNavPrefs()).toEqual({ groups: {}, collapsed: false });
      localStorage.setItem('gh-admin-nav', '{not json');
      expect(readNavPrefs()).toEqual({ groups: {}, collapsed: false });
    });
  });
});

describe('users & admins helpers', () => {
  const row = {
    id: 'u1',
    email: 'reeceygreen88@gmail.com',
    full_name: null,
    preferred_language: null,
    is_admin: true,
    is_self: false,
    created_at: '2026-09-26T09:09:12Z',
    last_sign_in_at: null,
    email_confirmed_at: '2026-09-26T09:09:12Z',
    invited_at: null,
  };

  it('shows only states the data can tell apart', () => {
    expect(userStatus(userFromRow(row))).toBe('active');
    expect(userStatus(userFromRow({ ...row, invited_at: '2026-09-27T00:00:00Z', email_confirmed_at: null }))).toBe('invited');
    expect(userStatus(userFromRow({ ...row, is_admin: false }))).toBe('no-access');
  });

  it('names people by their name, or their email when none is set', () => {
    const reece = userFromRow(row);
    expect(displayName(reece)).toBe('reeceygreen88@gmail.com');
    expect(initials(reece)).toBe('RE');
    expect(initials({ fullName: 'Firman Maulana', email: 'x@y.z' })).toBe('FM');
    expect(initials({ fullName: '', email: 'firman.maulana@gmail.com' })).toBe('FM');
  });

  it('turns database and invitation outcomes into calm, honest sentences', () => {
    expect(userErrorMessage({ message: 'gh:last_admin' })).toMatch(/at least one admin/);
    expect(userErrorMessage({ message: 'gh:self_access' })).toMatch(/your own admin access/);
    expect(userErrorMessage({ code: 'PGRST202', message: 'Could not find the function public.admin_list_users' })).toMatch(/isn’t switched on yet/);
    expect(userErrorMessage({ message: 'syntax error at or near' })).toMatch(/Something went wrong/);
    expect(inviteResult('invited')).toMatchObject({ ok: true });
    expect(inviteResult('access_granted')).toMatchObject({ ok: true, message: expect.stringMatching(/already has an account/) });
    expect(inviteResult('already_admin')).toMatchObject({ ok: false, message: 'Already an admin.' });
    expect(inviteResult('email_unavailable')).toMatchObject({ ok: false, message: expect.stringMatching(/SMTP/) });
    expect(inviteResult('not_deployed').message).toMatch(/hasn’t been deployed/);
    expect(inviteResult('something-new')).toMatchObject({ ok: false });
  });
});
