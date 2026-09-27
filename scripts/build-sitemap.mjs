/**
 * Writes dist/sitemap.xml and points dist/robots.txt at it (brief §27 core SEO).
 * Runs after `vite build`. Needs the production address, which Green Hill has
 * not confirmed yet, so it does nothing unless VITE_SITE_URL is set
 * (e.g. https://greenhilllombok.com). With the database configured it also
 * lists published public opportunities and Green Hill Private teasers.
 */
import fs from 'node:fs';
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const site = (env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
if (!/^https:\/\/[^/]+$/.test(site)) {
  console.log('Sitemap skipped: set VITE_SITE_URL (https://your-domain) to generate it.');
  process.exit(0);
}

const LANGS = ['en', 'id', 'nl', 'es'];
const PAGES = ['', '/properties', '/private', '/why-lombok', '/about', '/buying-in-lombok', '/intelligence', '/enquire'];
const entries = [...PAGES.map((path) => ({ path }))];

const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const anonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();
if (/^https?:\/\//.test(supabaseUrl) && anonKey) {
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/properties?select=id,slug,listing_code,updated_at&visibility=eq.public&status=in.(available,reserved,sold)`,
      { headers },
    );
    if (res.ok) {
      for (const row of await res.json()) {
        const code = String(row.listing_code || '');
        const slug = String(row.slug || '');
        if (code.startsWith('DEMO-') || slug.startsWith('demo-')) continue;
        entries.push({ path: `/property/${row.slug || row.id}`, lastmod: row.updated_at });
      }
    }
    const teasers = await fetch(`${supabaseUrl}/rest/v1/rpc/private_teasers`, { method: 'POST', headers });
    if (teasers.ok) {
      for (const row of await teasers.json()) {
        const code = String(row.listing_code || '');
        const slug = String(row.slug || '');
        if (code.startsWith('DEMO-') || slug.startsWith('demo-')) continue;
        entries.push({ path: `/private/${row.listing_code || row.slug || row.id}` });
      }
    }
  } catch (error) {
    console.warn('Sitemap: could not read opportunities, core pages only.', error.message);
  }
}

const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const urls = entries.flatMap(({ path, lastmod }) =>
  LANGS.map((lang) => {
    const alternates = LANGS.map(
      (alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${escape(`${site}/${alt}${path}`)}"/>`,
    ).join('\n');
    return [
      '  <url>',
      `    <loc>${escape(`${site}/${lang}${path}`)}</loc>`,
      lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
      alternates,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escape(`${site}/en${path}`)}"/>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  }),
);

fs.writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
);

const robotsPath = 'dist/robots.txt';
const robots = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, 'utf8') : 'User-agent: *\nAllow: /\n';
fs.writeFileSync(
  robotsPath,
  `${robots.trimEnd()}\n\nSitemap: ${site}/sitemap.xml\n`,
);
console.log(`Sitemap: ${urls.length} URLs for ${site}`);
