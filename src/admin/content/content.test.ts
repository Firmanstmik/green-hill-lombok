import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeRows } from '@/content/ContentContext';
import { PAGES, allFields, allMedia, pageDef } from '@/content/schema';
import { ORIGINAL_MEDIA, originalValue } from '@/content/originals';
import { noteFromRow } from '@/content/types';
import { generalWhatsAppLink, getContact, setContactOverrides, whatsAppConversation } from '@/lib/contact';
import {
  convertImage,
  emptyNote,
  noteFromDbRow,
  noteProblems,
  noteToDbRow,
  siteNamesIn,
  sitePrefix,
  type ContentRow,
  type NoteRecord,
} from '../domain/content';
import { contentAttention, groupAttention, type AttentionItem } from '../domain/attention';
import { ConflictError } from '../data/repository';
import { createLocalRepository, localContentRows, localNoteRows, resetLocalStore } from '../data/localStore';

const SUPABASE = 'https://example.supabase.co';

function row(page: string, locale: string, status: 'draft' | 'published', fields: Record<string, string>, media = {}): ContentRow {
  return { page, locale, status, fields, media };
}

describe('content model', () => {
  it('every field key is unique within a page and every page has a title', () => {
    for (const page of PAGES) {
      const keys = allFields(page).map((f) => f.key);
      expect(new Set(keys).size, page.key).toBe(keys.length);
      expect(page.title).toBeTruthy();
    }
  });

  it('shows the approved shipped copy as the original value', () => {
    expect(originalValue('hero.headline', 'en')).toBeTruthy();
    expect(originalValue('hero.headline', 'nl')).not.toBe(originalValue('hero.headline', 'en'));
    expect(originalValue('cms.site.contact.email', '*')).toContain('@');
    // Extra Buying topics have no shipped copy: hidden until written.
    expect(originalValue('cms.buying.topic.ptPma.title', 'en')).toBe('');
  });

  it('every field without a cms. prefix has approved English copy (no mistyped keys)', () => {
    const missing = PAGES.flatMap((page) => allFields(page))
      .filter((field) => !field.key.startsWith('cms.') && originalValue(field.key, 'en') === '')
      .map((field) => field.key);
    expect(missing).toEqual([]);
  });

  it('every image slot has a shipped original to restore', () => {
    const missing = PAGES.flatMap((page) => allMedia(page)).filter((media) => !ORIGINAL_MEDIA[media.slot]).map((m) => m.slot);
    expect(missing).toEqual([]);
  });

  it('keeps the form questions, navigation and system messages out of the content model', () => {
    const keys = PAGES.flatMap((page) => allFields(page)).map((field) => field.key);
    expect(keys.some((key) => key.startsWith('enquiry.form.') || key.startsWith('navigation.') || key.startsWith('common.'))).toBe(false);
  });

  it('requires the legal disclaimers on Why Lombok and Buying in Lombok', () => {
    for (const key of ['whyLombok', 'buying']) {
      const required = allFields(pageDef(key)!).filter((f) => f.required);
      expect(required.length, key).toBeGreaterThan(0);
    }
  });
});

describe('published content and preview', () => {
  const rows = [
    row('home', 'en', 'published', { 'hero.title': 'Live title', 'hero.subtitle': 'Live subtitle' }),
    row('home', '*', 'published', {}, { 'home.hero.slide1': { url: 'https://cdn/live.webp' } }),
    row('home', 'en', 'draft', { 'hero.title': 'Draft title' }),
    row('home', '*', 'draft', {}, {}),
    row('about', 'en', 'published', { 'about.title': 'About live' }),
  ];

  it('visitors only ever get published values', () => {
    const merged = mergeRows(rows, false);
    expect(merged.fields.en['hero.title']).toBe('Live title');
    expect(merged.media['home.hero.slide1'].url).toBe('https://cdn/live.webp');
  });

  it('preview replaces a page with its draft, including cleared values, and leaves other pages alone', () => {
    const merged = mergeRows(rows, true);
    expect(merged.fields.en['hero.title']).toBe('Draft title');
    expect(merged.fields.en['hero.subtitle']).toBeUndefined();
    expect(merged.media['home.hero.slide1']).toBeUndefined();
    expect(merged.fields.en['about.title']).toBe('About live');
  });

  it('draft notes are hidden unless previewing', () => {
    const draft = { id: 'n1', slug: 'a-note', status: 'draft', translations: { en: { title: 'A note' } } };
    expect(noteFromRow(draft, false).published).toBe(false);
    expect(noteFromRow(draft, true).published).toBe(true);
    expect(noteFromRow({ ...draft, status: 'archived' }, true).published).toBe(false);
  });
});

describe('contact settings', () => {
  beforeEach(() => setContactOverrides({}, {}));

  it('uses valid settings and ignores invalid ones', () => {
    setContactOverrides({ 'cms.site.contact.email': 'hello@example.com', 'cms.site.contact.whatsapp': '+62 812 3456 7890' });
    expect(getContact().email).toBe('hello@example.com');
    expect(getContact().whatsappUrl).toBe('https://wa.me/6281234567890');
    const before = getContact().email;
    setContactOverrides({ 'cms.site.contact.email': 'not an email', 'cms.site.contact.instagram': 'http://insecure' });
    expect(getContact().email).not.toBe('not an email');
    expect(getContact().instagramUrl.startsWith('https://')).toBe(true);
    expect(before).toBe('hello@example.com');
  });

  it('adds the opening message in the visitor language, falling back to English', () => {
    setContactOverrides(
      { 'cms.site.contact.whatsapp': '+62 812 3456 7890' },
      { en: { 'cms.site.whatsapp.message': 'Hello Reece' }, nl: { 'cms.site.whatsapp.message': 'Hallo Reece' } },
    );
    expect(generalWhatsAppLink('en')).toBe('https://wa.me/6281234567890?text=Hello%20Reece');
    expect(generalWhatsAppLink('nl')).toBe('https://wa.me/6281234567890?text=Hallo%20Reece');
    expect(generalWhatsAppLink('es')).toBe('https://wa.me/6281234567890?text=Hello%20Reece');
    setContactOverrides({}, {});
    expect(generalWhatsAppLink('en')).not.toContain('?text=');
  });

  it('builds a direct chat from the configured number and the caller message', () => {
    setContactOverrides(
      { 'cms.site.contact.whatsapp': '+62 812 3456 7890' },
      { en: { 'cms.site.whatsapp.message': 'Hello from the footer' } },
    );
    expect(whatsAppConversation('Hi Reece, from the homepage.')).toBe(
      'https://wa.me/6281234567890?text=Hi%20Reece%2C%20from%20the%20homepage.',
    );
    expect(generalWhatsAppLink('en')).toBe('https://wa.me/6281234567890?text=Hello%20from%20the%20footer');
    expect(whatsAppConversation('   ')).toBe('https://wa.me/6281234567890');
  });
});

describe('notes', () => {
  const complete = (): NoteRecord => {
    const note = emptyNote();
    note.slug = 'first-note';
    note.coverImage = 'private-media:content/a.webp';
    note.coverAlt = 'A ridge above the bay';
    note.translations.en = { ...note.translations.en, title: 'First note', excerpt: 'Short.', sections: [{ ...note.translations.en.sections[0], content: 'One paragraph.' }] };
    return note;
  };

  it('lists what is missing before a note can be published', () => {
    expect(noteProblems(emptyNote()).length).toBeGreaterThanOrEqual(4);
    expect(noteProblems(complete())).toEqual([]);
    expect(noteProblems({ ...complete(), slug: 'Not A Slug' })).toHaveLength(1);
  });

  it('round-trips through the database row and drops empty translations and parts', () => {
    const note = complete();
    note.translations.nl = { ...note.translations.en, title: '' };
    note.translations.en.sections.push({ heading: '', content: '', image: '', imageAlt: '', caption: '', pullQuote: '' });
    const back = noteFromDbRow({ ...noteToDbRow(note), id: 'n1' });
    expect(back.translations.nl).toBeUndefined();
    expect(back.translations.en.sections).toHaveLength(1);
    expect(back.slug).toBe('first-note');
  });
});

describe('content images', () => {
  it('publishing turns private uploads into public site-media copies and unpublishing reverses it', () => {
    const toPublic = new Set<string>();
    const toPrivate = new Set<string>();
    const published = convertImage('private-media:content/a.webp', true, SUPABASE, toPublic, toPrivate);
    expect(published).toBe(`${sitePrefix(SUPABASE)}a.webp`);
    expect([...toPublic]).toEqual(['a.webp']);
    expect(convertImage(published, false, SUPABASE, toPublic, toPrivate)).toBe('private-media:content/a.webp');
    expect([...toPrivate]).toEqual(['a.webp']);
  });

  it('never publishes opportunity media through content', () => {
    const toPublic = new Set<string>();
    expect(convertImage('private-media:opp-1/x.webp', true, SUPABASE, toPublic, new Set())).toBe('private-media:opp-1/x.webp');
    expect(toPublic.size).toBe(0);
  });

  it('finds the public copies an object refers to', () => {
    const value = { a: { url: `${sitePrefix(SUPABASE)}one.webp` }, b: [`${sitePrefix(SUPABASE)}two.webp?v=1`], c: 'https://elsewhere/x.webp' };
    expect(siteNamesIn(value, SUPABASE).sort()).toEqual(['one.webp', 'two.webp']);
  });
});

describe('overview attention', () => {
  it('groups by the action to take, in a fixed order, with counts', () => {
    const items: AttentionItem[] = [
      { id: 'seo-1', group: 'seo', title: 'A', text: '', to: '/opportunities/1?step=seo', urgent: false },
      { id: 'enquiry-1', group: 'enquiries', title: 'B', text: '', to: '/enquiries?id=1', urgent: true },
      { id: 'seo-2', group: 'seo', title: 'C', text: '', to: '/opportunities/2?step=seo', urgent: false },
      ...contentAttention([{ key: 'home', title: 'Homepage', to: '/content/home', changes: true, translations: 2 }]),
    ];
    const groups = groupAttention(items);
    expect(groups.map((g) => g.group)).toEqual(['enquiries', 'seo', 'content']);
    expect(groups[0].to).toBe('/enquiries?id=1');
    expect(groups[1].items).toHaveLength(2);
    expect(groups[1].summary.startsWith('2 ')).toBe(true);
    expect(groups[2].items.map((i) => i.id)).toEqual(['page-home', 'translate-home']);
  });
});

describe('local preview repository: content and notes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    resetLocalStore();
  });

  it('keeps drafts out of the published rows until publish, and refuses stale saves', async () => {
    const repo = createLocalRepository();
    const v1 = await repo.saveContentDraft('home', [{ locale: 'en', fields: { 'hero.title': 'New' } }, { locale: '*', fields: {}, media: {} }], null);
    expect(localContentRows().filter((r) => r.status === 'published')).toHaveLength(0);
    await expect(repo.saveContentDraft('home', [{ locale: 'en', fields: {} }], null)).rejects.toBeInstanceOf(ConflictError);
    await repo.saveContentDraft('home', [{ locale: 'en', fields: { 'hero.title': 'Newer' } }], v1);
    // Other pages are untouched.
    expect(localContentRows().some((r) => r.page !== 'home')).toBe(false);
    await repo.publishContent('home');
    const rows = localContentRows();
    expect(rows.every((r) => r.status === 'published')).toBe(true);
    expect(rows.find((r) => r.locale === 'en')?.fields['hero.title']).toBe('Newer');
  });

  it('discarding a draft leaves the published page as it was', async () => {
    const repo = createLocalRepository();
    const v = await repo.saveContentDraft('about', [{ locale: 'en', fields: { 'about.title': 'Live' } }], null);
    await repo.publishContent('about');
    await repo.saveContentDraft('about', [{ locale: 'en', fields: { 'about.title': 'Draft' } }], null);
    await repo.discardContentDraft('about');
    const rows = localContentRows();
    expect(rows.filter((r) => r.status === 'draft')).toHaveLength(0);
    expect(rows.find((r) => r.locale === 'en')?.fields['about.title']).toBe('Live');
    expect(v).toBeTruthy();
  });

  it('saves notes as drafts, refuses incomplete publishing and duplicate addresses', async () => {
    const repo = createLocalRepository();
    const note = emptyNote();
    note.slug = 'field-note';
    note.translations.en.title = 'Field note';
    const saved = await repo.saveNote(note, null);
    expect(saved.id).toBeTruthy();
    expect(localNoteRows()[0].status).toBe('draft');
    await expect(repo.saveNote({ ...saved, status: 'published' }, saved.updatedAt)).rejects.toThrow();
    await expect(repo.saveNote({ ...note }, null)).rejects.toThrow(/page address/);
    await expect(repo.saveNote({ ...saved, author: 'X' }, 'stale')).rejects.toBeInstanceOf(ConflictError);
    await repo.deleteNote(saved.id!);
    expect(localNoteRows()).toHaveLength(0);
  });
});
