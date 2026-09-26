/**
 * Link previews for WhatsApp, Facebook, LinkedIn and similar bots.
 *
 * These bots do not run JavaScript, so they only see the static tags in
 * index.html. The Vercel middleware (middleware.ts at the project root) asks
 * this module for the published title, description and image of the requested
 * page and writes them into the HTML it returns to the bot. Visitors and
 * search engines that render JavaScript never go through this path.
 *
 * Only published, public data is read, with the anon key and the same row
 * level security as the website. Relative imports only: the middleware is
 * bundled separately from the Vite app.
 */
import { PAGES } from '../content/schema';
import en from './i18n/translations/en.json';
import id from './i18n/translations/id.json';
import nl from './i18n/translations/nl.json';
import es from './i18n/translations/es.json';

export type Preview = { title: string; description: string; image: string; url: string; type: 'website' | 'article' };
export type PreviewEnv = { supabaseUrl?: string; anonKey?: string; siteUrl?: string };
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
type Row = Record<string, unknown>;

const LANGS = ['en', 'id', 'nl', 'es'] as const;
type Lang = (typeof LANGS)[number];
const BUNDLES: Record<Lang, Row> = { en, id, nl, es };
const PUBLIC_STATUSES = 'in.(available,reserved,sold)';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUFFIX = ' · Green Hill Lombok';

const BOTS =
  /(facebookexternalhit|facebot|whatsapp|linkedinbot|twitterbot|slackbot|telegrambot|discordbot|skypeuripreview|pinterest|embedly|redditbot|applebot|iframely)/i;

/** Link-preview bots only; browsers and search engines get the normal SPA. */
export function isPreviewBot(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && BOTS.test(userAgent));
}

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function bundled(lang: Lang, key: string): string {
  const value = key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Row)[part] : undefined), BUNDLES[lang]);
  return str(value);
}

/** The page's "Search & sharing" fields, straight from the content model. */
function seoFieldsFor(path: string) {
  const page = PAGES.find((p) => p.path === path && p.group === 'content');
  const seo = page?.sections.find((section) => section.id === 'seo');
  if (!page || !seo) return null;
  return { page: page.key, titleKey: seo.fields[0]?.key ?? '', descriptionKey: seo.fields[1]?.key ?? '', imageSlot: seo.media?.[0]?.slot };
}

async function getJson(fetcher: Fetcher, env: PreviewEnv, query: string): Promise<Row[]> {
  if (!env.supabaseUrl || !env.anonKey) return [];
  const response = await fetcher(`${env.supabaseUrl.replace(/\/+$/, '')}/rest/v1/${query}`, {
    headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as unknown;
  return Array.isArray(data) ? (data as Row[]) : [];
}

type Content = { fields: Record<string, Record<string, string>>; media: Record<string, { url?: string }> };

async function publishedContent(fetcher: Fetcher, env: PreviewEnv, pages: string[]): Promise<Content> {
  const rows = await getJson(
    fetcher,
    env,
    `site_content?select=page_key,locale,fields,media&status=eq.published&page_key=in.(${pages.join(',')})`,
  );
  const content: Content = { fields: {}, media: {} };
  for (const row of rows) {
    const locale = str(row.locale);
    content.fields[locale] = { ...(content.fields[locale] ?? {}), ...((row.fields as Record<string, string>) ?? {}) };
    if (locale === '*') Object.assign(content.media, (row.media as Content['media']) ?? {});
  }
  return content;
}

const value = (content: Content, key: string, lang: Lang) => str(content.fields[lang]?.[key]) || str(content.fields['*']?.[key]);
const publicImage = (url: unknown) => (/^https:\/\//.test(str(url)) ? str(url) : '');

/**
 * The preview for a path such as `/nl/why-lombok` or `/en/property/ridge-plot`.
 * Returns null for paths that keep the static tags (admin, unknown routes,
 * private teasers, records that are not public).
 */
export async function previewFor(pathname: string, origin: string, env: PreviewEnv, fetcher: Fetcher = fetch): Promise<Preview | null> {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const lang = parts[0] as Lang;
  if (!LANGS.includes(lang)) return null;
  const rest = parts.slice(1);
  const site = (env.siteUrl || origin).replace(/\/+$/, '');
  const url = `${site}/${parts.join('/')}`;
  const fallbackImage = `${site}/og-image.jpg`;

  // One opportunity (public and live only; RLS enforces the same).
  if (rest[0] === 'property' && rest[1] && rest.length === 2) {
    const key = decodeURIComponent(rest[1]);
    const [row] = await getJson(
      fetcher,
      env,
      `properties?select=title,summary,seo_title,seo_description,og_image,image_url,images&visibility=eq.public&status=${PUBLIC_STATUSES}&${UUID.test(key) ? 'id' : 'slug'}=eq.${encodeURIComponent(key)}&limit=1`,
    );
    if (!row || !str(row.title)) return null;
    const images = Array.isArray(row.images) ? row.images : [];
    return {
      title: str(row.seo_title) || `${str(row.title)}${SUFFIX}`,
      description: str(row.seo_description) || str(row.summary),
      image: publicImage(row.og_image) || publicImage(row.image_url) || publicImage(images[0]) || fallbackImage,
      url,
      type: 'article',
    };
  }

  // One note (published only).
  if (rest[0] === 'intelligence' && rest[1] && rest.length === 2) {
    const [row] = await getJson(
      fetcher,
      env,
      `notes?select=translations,cover_image,og_image&status=eq.published&slug=eq.${encodeURIComponent(decodeURIComponent(rest[1]))}&limit=1`,
    );
    const translations = (row?.translations ?? {}) as Record<string, Row>;
    const text = str(translations[lang]?.title) ? translations[lang] : translations.en;
    if (!row || !text || !str(text.title)) return null;
    return {
      title: str(text.seoTitle) || `${str(text.title)}${SUFFIX}`,
      description: str(text.seoDescription) || str(text.excerpt),
      image: publicImage(row.og_image) || publicImage(row.cover_image) || fallbackImage,
      url,
      type: 'article',
    };
  }

  // A content page: its own Search & sharing values, then the site defaults, then the approved copy.
  if (rest.length > 1) return null;
  const seo = seoFieldsFor(rest.length ? `/${rest[0]}` : '');
  if (!seo) return null;
  const content = await publishedContent(fetcher, env, [seo.page, 'seo']);
  const title =
    value(content, seo.titleKey, lang) || bundled(lang, seo.titleKey) || value(content, 'cms.seo.default.title', lang);
  const description =
    value(content, seo.descriptionKey, lang) ||
    bundled(lang, seo.descriptionKey) ||
    value(content, 'cms.seo.default.description', lang);
  const image =
    (seo.imageSlot && publicImage(content.media[seo.imageSlot]?.url)) || publicImage(content.media['seo.default.image']?.url) || fallbackImage;
  if (!title && !description && image === fallbackImage) return null;
  return { title, description, image, url, type: 'website' };
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setMeta(html: string, attr: 'name' | 'property', key: string, content: string): string {
  if (!content) return html;
  const tag = `<meta ${attr}="${key}" content="${escape(content)}" />`;
  const pattern = new RegExp(`<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'i');
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

/** Writes the preview into index.html. Empty values keep the static tags. */
export function injectPreview(html: string, preview: Preview, lang?: string): string {
  let out = html;
  if (preview.title) out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(preview.title)}</title>`);
  if (lang && /^(en|id|nl|es)$/.test(lang)) out = out.replace(/<html lang="[^"]*"/i, `<html lang="${lang}"`);
  out = setMeta(out, 'name', 'description', preview.description);
  out = setMeta(out, 'property', 'og:type', preview.type);
  out = setMeta(out, 'property', 'og:title', preview.title);
  out = setMeta(out, 'property', 'og:description', preview.description);
  // The static size tags describe og-image.jpg only.
  if (preview.image && !preview.image.endsWith('/og-image.jpg')) out = out.replace(/\s*<meta property="og:image:(width|height)"[^>]*>/gi, '');
  out = setMeta(out, 'property', 'og:image', preview.image);
  out = setMeta(out, 'property', 'og:url', preview.url);
  out = setMeta(out, 'name', 'twitter:title', preview.title);
  out = setMeta(out, 'name', 'twitter:description', preview.description);
  out = setMeta(out, 'name', 'twitter:image', preview.image);
  return out;
}
