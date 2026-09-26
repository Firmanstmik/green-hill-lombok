// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import middleware, { config } from '../../middleware';

/** The Vercel matcher is a path-to-regexp pattern made of one regex group. */
const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe('Vercel link-preview middleware', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('runs on pages only: never on admin, auth, assets or files', () => {
    for (const path of ['/', '/en', '/en/about', '/nl/property/ridge-plot', '/es/intelligence/a-note']) expect(matches(path), path).toBe(true);
    for (const path of ['/en/admin', '/en/admin/content/home', '/admin', '/en/auth/callback', '/assets/index-abc.js', '/og-image.jpg', '/index.html', '/robots.txt']) {
      expect(matches(path), path).toBe(false);
    }
  });

  it('leaves browsers untouched and falls through on any failure', async () => {
    const browser = new Request('https://greenhill.example/en', { headers: { 'user-agent': 'Mozilla/5.0 Chrome/126' } });
    expect(await middleware(browser)).toBeUndefined();
    vi.stubGlobal('fetch', async () => {
      throw new Error('network down');
    });
    const bot = new Request('https://greenhill.example/en/about', { headers: { 'user-agent': 'WhatsApp/2.23' } });
    expect(await middleware(bot)).toBeUndefined();
  });

  it('serves bots the page with its preview written in', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) =>
      String(input).endsWith('/index.html')
        ? new Response('<html lang="en"><head><title>Static</title></head><body><div id="root"></div></body></html>')
        : new Response('[]'),
    );
    const bot = new Request('https://greenhill.example/nl/about', { headers: { 'user-agent': 'LinkedInBot/1.0' } });
    const response = await middleware(bot);
    const html = await response!.text();
    expect(html).toContain('<html lang="nl"');
    expect(html).not.toContain('<title>Static</title>');
    expect(html).toContain('og:title');
    expect(html).toContain('<div id="root"></div>');
  });
});
