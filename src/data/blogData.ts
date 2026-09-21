export interface ArticleTranslation {
  title: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  sections: {
    heading: string;
    content: string;
    chartId?: string;
  }[];
}

export interface BlogArticle {
  id: string;
  slug: string;
  category: string;
  image: string;
  date: string;
  author: string;
  readingTime: number;
  translations: Partial<Record<string, ArticleTranslation>>;
}

/**
 * Resolves localized article content with strict English fallback.
 */
export function getArticleContent(article: BlogArticle, lang: string): ArticleTranslation {
  const en = article.translations.en;
  if (!en) {
    throw new Error(`[blogData] Article "${article.slug}" is missing the required English translation.`);
  }
  const localized = article.translations[lang];
  if (!localized) return en;
  return {
    ...en,
    ...localized,
    sections: localized.sections && localized.sections.length > 0 ? localized.sections : en.sections,
  };
}

/**
 * GREEN HILL PLACEHOLDER ARTICLES ONLY
 * Prior Ukon Estate editorial content removed for project isolation.
 */
export const blogArticles: BlogArticle[] = [
  {
    id: '1',
    slug: 'green-hill-placeholder-overview',
    category: 'Market',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    date: '2026-01-01',
    author: 'Green Hill Editorial (Placeholder)',
    readingTime: 3,
    translations: {
      en: {
        title: '[Placeholder] Green Hill Market Note',
        excerpt: 'Demo article for layout development only. Not real market research.',
        seoTitle: 'Green Hill Placeholder Article',
        metaDescription: 'Placeholder content for Green Hill development.',
        sections: [
          {
            heading: 'Development Placeholder',
            content:
              'This article is a temporary placeholder while Green Hill is isolated from prior-project content. Real editorial content will be authored later.',
          },
        ],
      },
    },
  },
];
