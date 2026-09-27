import { useEffect, useState } from 'react';
import { GreenHillLoader } from './GreenHillLoader';
import { introState } from './introState';

/** The branded opening plays at least this long on a cold public load… */
const MIN_MS = 900;
/** …but never holds content back longer than this. */
const MAX_MS = 4000;
/** Fade into the page. */
const LEAVE_MS = 320;
/** Extra wait for the first hero photograph, so the page opens on the picture. */
const HERO_IMAGE_MS = 1500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function heroImageReady(): Promise<void> {
  const img = document.querySelector<HTMLImageElement>('.gh-hero-img');
  if (!img || img.complete) return Promise.resolve();
  return Promise.race([
    new Promise<void>((resolve) => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    }),
    sleep(HERO_IMAGE_MS),
  ]);
}

/** Admin, auth and developer pages have their own loading states. */
const SKIP = /^\/(?:[a-z]{2}\/)?(?:admin|auth|invoice)(?:\/|$)/;

/**
 * "Green Hill is opening": shown once, on the first load of the public site.
 * It finishes as soon as the page (and the hero photograph) is ready and at
 * least MIN_MS have passed, then fades into the page. Later navigations use
 * the ordinary route loader, so they stay fast.
 */
export function BrandIntro() {
  const [phase, setPhase] = useState<'show' | 'leave' | 'done'>(() => {
    // Not inside the admin's live preview (an embedded frame or ?cms-preview): it would replay on every save.
    const embedded = typeof window !== 'undefined' && (window.self !== window.top || /[?&]cms-preview=1/.test(window.location.search));
    const show = typeof window !== 'undefined' && !SKIP.test(window.location.pathname) && !embedded;
    // Set before the first route loader renders, so it stays blank under the intro.
    introState.active = show;
    return show ? 'show' : 'done';
  });

  useEffect(() => {
    if (phase !== 'show') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shownAt = performance.now();
    let cancelled = false;
    void (async () => {
      await Promise.race([introState.pageReady, sleep(MAX_MS)]);
      await heroImageReady();
      await sleep(Math.max(0, (reduce ? 0 : MIN_MS) - (performance.now() - shownAt)));
      if (!cancelled) setPhase('leave');
    })();
    return () => {
      cancelled = true;
    };
    // Runs once for the cold load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'leave') return;
    introState.active = false;
    const timer = setTimeout(() => setPhase('done'), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === 'done') return null;
  return <GreenHillLoader mode="intro" leaving={phase === 'leave'} label="Opening Green Hill" />;
}
