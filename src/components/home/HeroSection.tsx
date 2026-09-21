import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { HeroCarousel } from './hero/HeroCarousel';
import { HeroContent } from './hero/HeroContent';
import { HeroFounder } from './hero/HeroFounder';
import { HeroLocations } from './hero/HeroLocations';
import { HeroScrollCue } from './hero/HeroScrollCue';
import { HERO_AUTO_MS, HERO_SLIDES } from './hero/heroData';

/** Matches the navbar's solid height so anchored scrolls clear it. */
const NAV_OFFSET = 104;

/**
 * Preload the LCP master — single untouched WebP, same URL the carousel uses.
 */
function useHeroPreload() {
  useEffect(() => {
    const first = HERO_SLIDES[0];
    const link = document.createElement('link');
    link.rel = 'preload';
    link.setAttribute('as', 'image');
    link.type = 'image/webp';
    link.href = first.src;
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
}

/**
 * Warm the next master before the crossfade so the plate never flashes empty.
 */
function useHeroPrefetch(nextIndex: number) {
  useEffect(() => {
    const next = HERO_SLIDES[nextIndex];
    if (!next) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.setAttribute('as', 'image');
    link.type = 'image/webp';
    link.href = next.src;
    link.setAttribute('fetchpriority', 'low');
    document.head.appendChild(link);
    return () => link.remove();
  }, [nextIndex]);
}

/**
 * Editorial hero — Person · Place · Opportunity.
 * No marketplace chrome, no lead form: one photograph, one message.
 */
export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  /**
   * Autoplay halts for independent reasons — keyboard focus inside the hero,
   * the hero scrolled out of view, the tab hidden. Tracking them separately
   * stops one reason from clearing another's pause.
   */
  const [holds, setHolds] = useState({ focus: false, offscreen: false, hidden: false });
  const paused = holds.focus || holds.offscreen || holds.hidden;
  const total = HERO_SLIDES.length;
  const pauseRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

  const hold = useCallback(
    (key: keyof typeof holds, value: boolean) =>
      setHolds((h) => (h[key] === value ? h : { ...h, [key]: value })),
    []
  );

  useHeroPreload();
  useHeroPrefetch((slide + 1) % total);

  const goTo = useCallback(
    (index: number) => {
      setSlide(((index % total) + total) % total);
      setProgress(0);
    },
    [total]
  );

  useEffect(() => {
    pauseRef.current = paused;
  }, [paused]);

  /** Don't burn frames advancing a hero nobody is looking at. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => hold('offscreen', !entry.isIntersecting),
      { threshold: 0.25 }
    );
    observer.observe(el);

    const onVisibility = () => hold('hidden', document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hold]);

  useEffect(() => {
    if (reduceMotion) {
      setProgress(1);
      return;
    }

    let frame = 0;
    let start = performance.now();
    let frozenElapsed = 0;
    let isFrozen = false;

    const tick = (now: number) => {
      if (pauseRef.current) {
        if (!isFrozen) {
          frozenElapsed = now - start;
          isFrozen = true;
        }
        frame = requestAnimationFrame(tick);
        return;
      }

      if (isFrozen) {
        start = now - frozenElapsed;
        isFrozen = false;
      }

      const ratio = Math.min(1, (now - start) / HERO_AUTO_MS);
      setProgress(ratio);

      if (ratio >= 1) {
        setSlide((s) => (s + 1) % total);
        setProgress(0);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [slide, total, reduceMotion]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const scrollNext = () => {
    const main = document.querySelector('main');
    const next = main?.querySelector('section:nth-of-type(2)') as HTMLElement | null;
    if (!next) return;
    const top = next.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      className="gh-hero"
      aria-roledescription="carousel"
      aria-label="Green Hill Lombok"
      onFocusCapture={() => hold('focus', true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hold('focus', false);
      }}
    >
      <HeroCarousel slides={HERO_SLIDES} activeIndex={slide} reduceMotion={!!reduceMotion} />

      <div className="gh-hero-frame">
        <div className="gh-hero-grid">
          <HeroContent onSpeak={() => scrollTo('contact')} />
          <HeroFounder onMeet={() => scrollTo('about')} />
        </div>

        <div className="gh-hero-bottom">
          <HeroLocations
            slides={HERO_SLIDES}
            activeIndex={slide}
            onSelect={goTo}
            progress={reduceMotion ? 1 : progress}
          />
          <HeroScrollCue onScroll={scrollNext} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {HERO_SLIDES[slide].number} {HERO_SLIDES[slide].title}
      </p>
    </section>
  );
}
