import { describe, expect, it } from 'vitest';
import { injectPreview, isPreviewBot, previewFor } from './socialPreview';

const ENV = { supabaseUrl: 'https://ref.supabase.co', anonKey: 'anon', siteUrl: 'https://greenhill.example' };
const ORIGIN = 'https://preview.vercel.app';

/** A fake Supabase REST endpoint: returns rows by table and records every query. */
function fakeFetch(tables: Record<string, Record<string, unknown>[]>) {
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    const table = new URL(url).pathname.split('/').pop() ?? '';
    return new Response(JSON.stringify(tables[table] ?? []), { status: 200 });
  };
  return { fetcher, calls };
}

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>Green Hill · Opportunities in Lombok</title>
    <meta name="description" content="Static description.">
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Green Hill · Opportunities in Lombok">
    <meta property="og:image" content="/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
  </head>
  <body><div id="root"></div></body>
</html>`;

describe('link preview bots', () => {
  it('recognises WhatsApp, Facebook and LinkedIn, not browsers or Google', () => {
    expect(isPreviewBot('WhatsApp/2.23.20.0 A')).toBe(true);
    expect(isPreviewBot('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
    expect(isPreviewBot('LinkedInBot/1.0 (compatible; Mozilla/5.0)')).toBe(true);
    expect(isPreviewBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0')).toBe(false);
    expect(isPreviewBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(false);
    expect(isPreviewBot(null)).toBe(false);
  });
});

describe('preview values', () => {
  it('content page: published CMS value in the visitor language, then the approved copy', async () => {
    const { fetcher, calls } = fakeFetch({
      site_content: [
        { page_key: 'whyLombok', locale: 'nl', fields: { 'whyLombok.page.seoTitle': 'Waarom Lombok · QA' }, media: {} },
        { page_key: 'whyLombok', locale: '*', fields: {}, media: { 'why.seo.image': { url: 'https://ref.supabase.co/storage/v1/object/public/site-media/w.webp' } } },
      ],
    });
    const nl = await previewFor('/nl/why-lombok', ORIGIN, ENV, fetcher);
    expect(nl).toMatchObject({
      title: 'Waarom Lombok · QA',
      image: 'https://ref.supabase.co/storage/v1/object/public/site-media/w.webp',
      url: 'https://greenhill.example/nl/why-lombok',
      type: 'website',
    });
    expect(nl?.description).toBeTruthy(); // approved Dutch description
    expect(calls[0]).toContain('status=eq.published');
    const es = await previewFor('/es/why-lombok', ORIGIN, ENV, fetcher);
    expect(es?.title).not.toBe('Waarom Lombok · QA');
    expect(es?.title).toContain('Lombok');
  });

  it('homepage without its own values uses the site defaults, then the static image', async () => {
    const { fetcher } = fakeFetch({
      site_content: [{ page_key: 'seo', locale: 'en', fields: { 'cms.seo.default.title': 'Green Hill Lombok' }, media: {} }],
    });
    const home = await previewFor('/en', ORIGIN, ENV, fetcher);
    expect(home).toMatchObject({ title: 'Green Hill Lombok', image: 'https://greenhill.example/og-image.jpg' });
  });

  it('opportunity: public live records only, its SEO values and public image', async () => {
    const { fetcher, calls } = fakeFetch({
      properties: [{ title: 'Ridge Plot', summary: 'A quiet ridge.', seo_title: '', seo_description: '', og_image: '', images: ['https://ref.supabase.co/storage/v1/object/public/property-images/1.webp'] }],
    });
    const memo = await previewFor('/en/property/ridge-plot', ORIGIN, ENV, fetcher);
    expect(memo).toMatchObject({
      title: 'Ridge Plot · Green Hill Lombok',
      description: 'A quiet ridge.',
      image: 'https://ref.supabase.co/storage/v1/object/public/property-images/1.webp',
      type: 'article',
    });
    expect(calls[0]).toContain('visibility=eq.public');
    expect(calls[0]).toContain('status=in.(available,reserved,sold)');
    expect(calls[0]).toContain('slug=eq.ridge-plot');
  });

  it('never uses a private reference as the image', async () => {
    const { fetcher } = fakeFetch({ properties: [{ title: 'Ridge Plot', og_image: 'private-media:images/x.webp', images: [] }] });
    const memo = await previewFor('/en/property/ridge-plot', ORIGIN, ENV, fetcher);
    expect(memo?.image).toBe('https://greenhill.example/og-image.jpg');
  });

  it('note: published only, visitor language with English fallback', async () => {
    const { fetcher, calls } = fakeFetch({
      notes: [{ translations: { en: { title: 'Field note', excerpt: 'After the rains.' } }, cover_image: 'https://ref.supabase.co/storage/v1/object/public/site-media/c.webp' }],
    });
    const note = await previewFor('/id/intelligence/field-note', ORIGIN, ENV, fetcher);
    expect(note).toMatchObject({ title: 'Field note · Green Hill Lombok', description: 'After the rains.', type: 'article' });
    expect(calls[0]).toContain('status=eq.published');
  });

  it('keeps the static tags for admin, private teasers, unknown languages and missing records', async () => {
    const { fetcher, calls } = fakeFetch({});
    expect(await previewFor('/en/admin', ORIGIN, ENV, fetcher)).toBeNull();
    expect(await previewFor('/en/private/GH-LOM-001', ORIGIN, ENV, fetcher)).toBeNull();
    expect(await previewFor('/xx/about', ORIGIN, ENV, fetcher)).toBeNull();
    expect(await previewFor('/en/property/unknown', ORIGIN, ENV, fetcher)).toBeNull();
    expect(calls.every((url) => !url.includes('enquiries'))).toBe(true);
  });

  it('without a database, content pages still get their approved copy', async () => {
    const about = await previewFor('/en/about', ORIGIN, {}, fakeFetch({}).fetcher);
    expect(about?.title).toContain('Reece');
    expect(about?.image).toBe(`${ORIGIN}/og-image.jpg`);
  });
});

describe('writing the preview into index.html', () => {
  it('replaces title, description and Open Graph tags, escaping the values', () => {
    const html = injectPreview(
      HTML,
      { title: 'Ridge "Plot" <A>', description: 'Sea & hills', image: 'https://cdn/x.webp', url: 'https://greenhill.example/en/property/x', type: 'article' },
      'nl',
    );
    expect(html).toContain('<title>Ridge &quot;Plot&quot; &lt;A&gt;</title>');
    expect(html).toContain('<html lang="nl"');
    expect(html).toContain('<meta name="description" content="Sea &amp; hills" />');
    expect(html).toContain('<meta property="og:image" content="https://cdn/x.webp" />');
    expect(html).toContain('<meta property="og:url" content="https://greenhill.example/en/property/x" />');
    expect(html).not.toContain('og:image:width');
    expect(html).toContain('<div id="root"></div>');
  });

  it('keeps the static size tags when the static image is used', () => {
    const html = injectPreview(HTML, { title: 'T', description: '', image: 'https://greenhill.example/og-image.jpg', url: 'u', type: 'website' });
    expect(html).toContain('og:image:width');
    expect(html).toContain('<meta name="description" content="Static description.">');
  });
});
