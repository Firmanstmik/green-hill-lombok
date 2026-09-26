/**
 * Vercel Routing Middleware: link previews for WhatsApp, Facebook, LinkedIn.
 *
 * Only link-preview bots are handled here; they receive index.html with the
 * published title, description and image of the requested page written in.
 * Everyone else (visitors, Google) continues to the SPA untouched. Any error
 * or timeout also falls through to the unchanged SPA, which keeps the static
 * site-wide preview. Reads published data with the public anon key only.
 */
import { injectPreview, isPreviewBot, previewFor } from './src/lib/socialPreview';

export const config = {
  // Pages only: no files (anything with a dot), no admin, no auth plumbing.
  matcher: ['/((?!assets/|[a-z]{2}/admin|admin|[a-z]{2}/auth/|.*\\.).*)'],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  if (!isPreviewBot(request.headers.get('user-agent'))) return undefined;
  try {
    const url = new URL(request.url);
    const env = {
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY,
      siteUrl: process.env.VITE_SITE_URL,
    };
    const timeout = (ms: number) => (typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ms) : undefined);
    const preview = await previewFor(url.pathname, url.origin, env, (input, init) => fetch(input, { ...init, signal: timeout(2500) }));
    if (!preview) return undefined;
    const page = await fetch(new URL('/index.html', url.origin), { signal: timeout(2500) });
    if (!page.ok) return undefined;
    const html = injectPreview(await page.text(), preview, url.pathname.split('/')[1]);
    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=300' },
    });
  } catch {
    return undefined;
  }
}
