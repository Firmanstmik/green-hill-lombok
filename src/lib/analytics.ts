/**
 * GA4 and Meta Pixel (brief §10, §27).
 *
 * Nothing loads unless Green Hill's own IDs are configured at build time:
 *   VITE_GA4_MEASUREMENT_ID  e.g. G-XXXXXXXXXX
 *   VITE_META_PIXEL_ID       e.g. 1234567890
 * Nothing loads in development or on admin pages. IDs are validated so a
 * mistyped value can never inject script.
 *
 * Consent: for visitors from the UK/EU a cookie-consent decision is required
 * before enabling these in production (see docs/green-hill-production-handover.md).
 */

type Params = Record<string, string | number | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: unknown;
  }
}

const GA_ID = (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined)?.trim() ?? '';
const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() ?? '';

const gaEnabled = import.meta.env.PROD && /^G-[A-Z0-9]{4,20}$/.test(GA_ID);
const pixelEnabled = import.meta.env.PROD && /^\d{6,20}$/.test(PIXEL_ID);

let started = false;

const isAdminPath = (path: string) => /^\/[a-z]{2}\/admin(\/|$)|^\/admin(\/|$)/.test(path);

function loadScript(src: string) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (gaEnabled) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { send_page_view: false });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
  }
  if (pixelEnabled && !window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args);
      else fbq.queue!.push(args);
    } as NonNullable<Window['fbq']>;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
  }
}

export const analyticsConfigured = gaEnabled || pixelEnabled;

/** Called on every public route change. */
export function trackPageView(path: string) {
  if (!analyticsConfigured || isAdminPath(path)) return;
  start();
  window.gtag?.('event', 'page_view', { page_path: path, page_location: window.location.href });
  window.fbq?.('track', 'PageView');
}

/** An enquiry was submitted (standard or Green Hill Private). */
export function trackLead(params: Params) {
  if (!analyticsConfigured || isAdminPath(window.location.pathname)) return;
  start();
  window.gtag?.('event', 'generate_lead', params);
  window.fbq?.('track', 'Lead', params);
}

/** A "Talk to Reece" WhatsApp / email hand-off. */
export function trackContact(params: Params) {
  if (!analyticsConfigured || isAdminPath(window.location.pathname)) return;
  start();
  window.gtag?.('event', 'contact', params);
  window.fbq?.('track', 'Contact', params);
}
