import type { Enquiry } from './enquiry';
import { isLive, type Opportunity, type StepId } from './opportunity';

export type AttentionGroup = 'enquiries' | 'seo' | 'media' | 'drafts' | 'content';

export type AttentionItem = {
  id: string;
  group: AttentionGroup;
  title: string;
  text: string;
  /** Admin path (relative to /:lang/admin). */
  to: string;
  urgent: boolean;
};

const DAY = 86_400_000;

/**
 * Operational signals derived only from real records. No scores, no guesses.
 * Ordered: enquiries waiting for a reply first, then publishing gaps.
 */
export function attentionItems(opportunities: Opportunity[], enquiries: Enquiry[], now = Date.now()): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const enquiry of enquiries) {
    if (enquiry.status !== 'new') continue;
    const age = Math.floor((now - new Date(enquiry.createdAt).getTime()) / DAY);
    const isPrivate = enquiry.source === 'private';
    items.push({
      id: `enquiry-${enquiry.id}`,
      group: 'enquiries',
      title: `${isPrivate ? 'Private enquiry' : 'New enquiry'} from ${enquiry.name || 'someone'}`,
      text:
        age <= 0
          ? 'Received today and not yet answered.'
          : `Waiting ${age === 1 ? 'a day' : `${age} days`} for a first reply.`,
      to: `/enquiries?id=${enquiry.id}`,
      urgent: true,
    });
  }

  const step = (o: Opportunity, s: StepId) => `/opportunities/${o.id}?step=${s}`;

  for (const o of opportunities) {
    const name = o.title || 'Untitled opportunity';
    if (o.status === 'draft') {
      if (o.images.length === 0) {
        items.push({ id: `img-${o.id}`, group: 'drafts', title: name, text: 'Draft without a primary image.', to: step(o, 'media'), urgent: false });
      }
      if (o.summary.trim().length < 20) {
        items.push({ id: `sum-${o.id}`, group: 'drafts', title: name, text: 'Draft missing a summary.', to: step(o, 'basics'), urgent: false });
      }
    }
    if (isLive(o.status) && o.visibility === 'public') {
      if (!o.seoDescription.trim()) {
        items.push({
          id: `seo-${o.id}`,
          group: 'seo',
          title: name,
          text: 'Published without an SEO description.',
          to: step(o, 'seo'),
          urgent: false,
        });
      }
      if (o.images.length > 0 && !o.imageAlt[o.images[0]]?.trim()) {
        items.push({
          id: `alt-${o.id}`,
          group: 'media',
          title: name,
          text: 'Primary image has no description for screen readers.',
          to: step(o, 'media'),
          urgent: false,
        });
      }
    }
  }

  return items;
}

export type PageAttention = { key: string; title: string; to: string; changes: boolean; translations: number };

/** Website pages with unpublished changes or English edits still to translate. */
export function contentAttention(pages: PageAttention[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const page of pages) {
    if (page.changes) {
      items.push({ id: `page-${page.key}`, group: 'content', title: page.title, text: 'Changes saved but not published yet.', to: page.to, urgent: false });
    }
    if (page.translations > 0) {
      items.push({
        id: `translate-${page.key}`,
        group: 'content',
        title: page.title,
        text: `${page.translations} ${page.translations === 1 ? 'text changed' : 'texts changed'} in English and not yet translated.`,
        to: page.to,
        urgent: false,
      });
    }
  }
  return items;
}

const GROUPS: { group: AttentionGroup; label: string; summary: (n: number) => string; to: string }[] = [
  { group: 'enquiries', label: 'Enquiries', summary: (n) => `${n === 1 ? 'person is' : 'people are'} waiting for a first reply`, to: '/enquiries?status=new' },
  { group: 'drafts', label: 'Drafts', summary: (n) => `${n === 1 ? 'thing is' : 'things are'} missing before drafts can go live`, to: '/opportunities?status=draft' },
  { group: 'media', label: 'Media', summary: (n) => `published ${n === 1 ? 'photograph has' : 'photographs have'} no description`, to: '/opportunities' },
  { group: 'seo', label: 'SEO', summary: (n) => `published ${n === 1 ? 'opportunity has' : 'opportunities have'} no search description`, to: '/opportunities' },
  { group: 'content', label: 'Website content', summary: (n) => `${n === 1 ? 'page update needs' : 'page updates need'} publishing or translating`, to: '/content' },
];

export type AttentionSection = { group: AttentionGroup; label: string; summary: string; to: string; items: AttentionItem[] };

/** Attention grouped by what Reece has to do, in a fixed order. Empty groups are left out. */
export function groupAttention(items: AttentionItem[]): AttentionSection[] {
  return GROUPS.flatMap(({ group, label, summary, to }) => {
    const list = items.filter((item) => item.group === group);
    if (!list.length) return [];
    return [{ group, label, summary: `${list.length} ${summary(list.length)}`, to: list.length === 1 ? list[0].to : to, items: list }];
  });
}
