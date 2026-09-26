/**
 * Client-side page SEO that updates existing head tags in place.
 * Avoids duplicate meta[name=description] / og:* left by index.html.
 */

export type PageSeoInput = {
  title: string;
  description: string;
  /** Absolute or origin-relative path, e.g. /en/intelligence */
  canonicalPath: string;
  lang: string;
  image?: string;
  ogType?: 'website' | 'article';
};

type MetaKey = { attr: 'name' | 'property'; key: string };

const META_KEYS: MetaKey[] = [
  { attr: 'name', key: 'description' },
  { attr: 'property', key: 'og:title' },
  { attr: 'property', key: 'og:description' },
  { attr: 'property', key: 'og:type' },
  { attr: 'property', key: 'og:image' },
  { attr: 'property', key: 'og:url' },
  { attr: 'name', key: 'twitter:title' },
  { attr: 'name', key: 'twitter:description' },
];

function metaSelector(attr: 'name' | 'property', key: string) {
  return `meta[${attr}="${key}"]`;
}

function ensureMeta(attr: 'name' | 'property', key: string): HTMLMetaElement {
  let el = document.head.querySelector(metaSelector(attr, key)) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

function ensureCanonical(): HTMLLinkElement {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  return link;
}

/**
 * Apply page SEO. Returns a cleanup that restores prior head values.
 */
export function applyPageSeo(input: PageSeoInput): () => void {
  const previousTitle = document.title;
  const previousLang = document.documentElement.lang;
  const previousMeta = new Map<string, string | null>();
  const previousCanonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
  const createdCanonical = !document.head.querySelector('link[rel="canonical"]');

  const origin = window.location.origin;
  const canonical = input.canonicalPath.startsWith('http')
    ? input.canonicalPath
    : `${origin}${input.canonicalPath.startsWith('/') ? '' : '/'}${input.canonicalPath}`;

  document.title = input.title;
  document.documentElement.lang = input.lang;

  const values: Record<string, string | undefined> = {
    'name:description': input.description,
    'property:og:title': input.title,
    'property:og:description': input.description,
    'property:og:type': input.ogType ?? 'website',
    'property:og:image': input.image,
    'property:og:url': canonical,
    'name:twitter:title': input.title,
    'name:twitter:description': input.description,
  };

  for (const { attr, key } of META_KEYS) {
    const mapKey = `${attr}:${key}`;
    const next = values[mapKey];
    if (next == null || next === '') continue;

    const existing = document.head.querySelector(metaSelector(attr, key)) as HTMLMetaElement | null;
    previousMeta.set(mapKey, existing?.getAttribute('content') ?? null);

    // Remove duplicate siblings so only one tag remains.
    document.head.querySelectorAll(metaSelector(attr, key)).forEach((node, index) => {
      if (index > 0) node.remove();
    });

    const el = ensureMeta(attr, key);
    el.setAttribute('content', next);
  }

  const link = ensureCanonical();
  link.setAttribute('href', canonical);

  return () => {
    document.title = previousTitle;
    document.documentElement.lang = previousLang;

    for (const { attr, key } of META_KEYS) {
      const mapKey = `${attr}:${key}`;
      if (!previousMeta.has(mapKey)) continue;
      const prev = previousMeta.get(mapKey);
      const el = document.head.querySelector(metaSelector(attr, key)) as HTMLMetaElement | null;
      if (!el) continue;
      if (prev == null) {
        el.remove();
      } else {
        el.setAttribute('content', prev);
      }
    }

    const canonicalEl = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonicalEl) {
      if (createdCanonical && previousCanonical == null) {
        canonicalEl.remove();
      } else if (previousCanonical != null) {
        canonicalEl.setAttribute('href', previousCanonical);
      }
    }
  };
}
