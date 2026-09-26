import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PAGES, type PageKey } from '@/content/schema';
import { useContentRows, useNotesList } from '../data/queries';
import { useAdminPath } from '../paths';
import { timeAgo } from '../ui/format';
import { ErrorState, PageHead, SkeletonRows } from '../ui/primitives';

type PageState = { status: 'original' | 'published' | 'changes'; updatedAt: string | null; translations: number };

/** Where each part of the site stands: original copy, published edits or unpublished changes. */
export function usePageStates(): { states: Record<string, PageState> | null; error: Error | null } {
  const rows = useContentRows();
  const states = useMemo(() => {
    if (!rows.data) return null;
    const result: Record<string, PageState> = {};
    for (const page of PAGES) {
      const own = rows.data.filter((row) => row.page === page.key);
      const drafts = own.filter((row) => row.status === 'draft');
      const published = own.filter((row) => row.status === 'published');
      const source = drafts.length ? drafts : published;
      const en = source.find((row) => row.locale === 'en')?.fields ?? {};
      const translations = ['id', 'nl', 'es'].reduce((sum, locale) => {
        const local = source.find((row) => row.locale === locale)?.fields ?? {};
        return sum + Object.keys(en).filter((key) => local[key] === undefined).length;
      }, 0);
      result[page.key] = {
        status: drafts.length ? 'changes' : published.length ? 'published' : 'original',
        updatedAt: (drafts[0] ?? published[0])?.updatedAt ?? null,
        translations,
      };
    }
    return result;
  }, [rows.data]);
  return { states, error: rows.error as Error | null };
}

export const PAGE_ROUTE: Record<PageKey, string> = {
  home: '/content/home',
  about: '/content/about',
  whyLombok: '/content/whyLombok',
  buying: '/content/buying',
  private: '/content/private',
  opportunities: '/content/opportunities',
  notes: '/content/notes',
  enquire: '/content/enquire',
  site: '/content/footer',
  seo: '/settings/seo',
};

export function PageStatusChip({ state }: { state: PageState | undefined }) {
  if (!state || state.status === 'original') return <span className="gha-status gha-status--archived">Original copy</span>;
  if (state.status === 'changes') return <span className="gha-status gha-status--draft">Unpublished changes</span>;
  return <span className="gha-status gha-status--available">Published</span>;
}

export function ContentOverviewPage() {
  const { admin } = useAdminPath();
  const { states, error } = usePageStates();
  const notes = useNotesList();

  useEffect(() => {
    document.title = 'Content · Green Hill Admin';
  }, []);

  const now = Date.now();
  const contentPages = PAGES.filter((page) => page.group === 'content');
  const noteCounts = useMemo(() => {
    const list = notes.data ?? [];
    return {
      published: list.filter((n) => n.status === 'published').length,
      drafts: list.filter((n) => n.status === 'draft').length,
    };
  }, [notes.data]);

  return (
    <div>
      <PageHead
        eyebrow="Content"
        title="The words and images on the website"
        lead="Each page keeps its approved design. Edit the text and photographs, preview them in the real page, then publish."
      />
      {error ? <ErrorState message={error.message} /> : null}
      {!states && !error ? <SkeletonRows rows={5} /> : null}
      {states ? (
        <ul className="gha-content-list" aria-label="Pages">
          {[...contentPages, ...PAGES.filter((p) => p.key === 'site')].map((page) => {
            const state = states[page.key];
            return (
              <li key={page.key}>
                <Link className="gha-content-row" to={admin(PAGE_ROUTE[page.key])}>
                  <span className="gha-content-row__main">
                    <span className="gha-content-row__title">{page.key === 'site' ? 'Footer & contact' : page.title}</span>
                    <span className="gha-content-row__text">{page.summary}</span>
                  </span>
                  <span className="gha-content-row__meta">
                    <PageStatusChip state={state} />
                    {state?.translations ? <span className="gha-soon">{state.translations} to translate</span> : null}
                    {state?.updatedAt ? <span className="gha-meta">Edited {timeAgo(state.updatedAt, now)}</span> : null}
                  </span>
                  <ArrowRight size={16} aria-hidden className="gha-content-row__go" />
                </Link>
              </li>
            );
          })}
          <li>
            <Link className="gha-content-row" to={admin('/notes')}>
              <span className="gha-content-row__main">
                <span className="gha-content-row__title">Notes</span>
                <span className="gha-content-row__text">Field notes and articles on the Notes page.</span>
              </span>
              <span className="gha-content-row__meta">
                <span className="gha-meta">
                  {noteCounts.published} published · {noteCounts.drafts} {noteCounts.drafts === 1 ? 'draft' : 'drafts'}
                </span>
              </span>
              <ArrowRight size={16} aria-hidden className="gha-content-row__go" />
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
