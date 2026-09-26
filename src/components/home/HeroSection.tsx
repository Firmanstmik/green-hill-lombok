import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { HeroCarousel } from './hero/HeroCarousel';
import { HeroContent } from './hero/HeroContent';
import { HeroFounder } from './hero/HeroFounder';
import { HeroLocations } from './hero/HeroLocations';
import { HeroScrollCue } from './hero/HeroScrollCue';
import { HERO_AUTO_MS, HERO_SLIDES, type HeroSlide } from './hero/heroData';
import { useContentImage, useContentText } from '@/content/hooks';

/** Matches the navbar's solid height so anchored scrolls clear it. */
const NAV_OFFSET = 104;

/**
 * Preload the LCP master — single untouched WebP, same URL the carousel uses.
 */
function useHeroPreload(slides: HeroSlide[]) {
  const firstSrc = slides[0].src;
  useEffect(() => {
    const first = slides[0];
    const link = document.createElement('link');
    link.rel = 'preload';
    link.setAttribute('as', 'image');
    link.type = 'image/webp';
    link.href = first.src;
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
    return () => link.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstSrc]);
}

/**
 * Warm the next master before the crossfade so the plate never flashes empty.
 */
function useHeroPrefetch(slides: HeroSlide[], nextIndex: number) {
  const nextSrc = slides[nextIndex]?.src;
  useEffect(() => {
    const next = slides[nextIndex];
    if (!next) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.setAttribute('as', 'image');
    link.type = 'image/webp';
    link.href = next.src;
    link.setAttribute('fetchpriority', 'low');
    document.head.appendChild(link);
    return () => link.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextIndex, nextSrc]);
}

/** The three hero chapters with Reece's published photographs, names and descriptions. */
function useEditableHeroSlides(): HeroSlide[] {
  const i1 = useContentImage('home.hero.slide1', HERO_SLIDES[0].src, 'cms.home.hero.slide1.alt');
  const i2 = useContentImage('home.hero.slide2', HERO_SLIDES[1].src, 'cms.home.hero.slide2.alt');
  const i3 = useContentImage('home.hero.slide3', HERO_SLIDES[2].src, 'cms.home.hero.slide3.alt');
  const t1 = useContentText('cms.home.hero.slide1.title');
  const t2 = useContentText('cms.home.hero.slide2.title');
  const t3 = useContentText('cms.home.hero.slide3.title');
  return [
    [i1, t1],
    [i2, t2],
    [i3, t3],
  ].map(([image, title], index) => {
    const base = HERO_SLIDES[index];
    const img = image as ReturnType<typeof useContentImage>;
    return {
      ...base,
      src: img.src,
      alt: img.alt || base.alt,
      title: (title as string | undefined) || base.title,
      focus: img.custom && img.focus ? { desktop: img.focus, mobile: img.focus } : base.focus,
    };
  });
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
  const slides = useEditableHeroSlides();
  const total = slides.length;
  const pauseRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

  const hold = useCallback(
    (key: keyof typeof holds, value: boolean) =>
      setHolds((h) => (h[key] === value ? h : { ...h, [key]: value })),
    []
  );

  useHeroPreload(slides);
  useHeroPrefetch(slides, (slide + 1) % total);

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
      <HeroCarousel slides={slides} activeIndex={slide} reduceMotion={!!reduceMotion} />

      <div className="gh-hero-frame">
        <div className="gh-hero-grid">
          <HeroContent onSpeak={() => scrollTo('contact')} />
          <HeroFounder onMeet={() => scrollTo('about')} />
        </div>

        <div className="gh-hero-bottom">
          <HeroLocations
            slides={slides}
            activeIndex={slide}
            onSelect={goTo}
            progress={reduceMotion ? 1 : progress}
          />
          <HeroScrollCue onScroll={scrollNext} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {slides[slide].number} {slides[slide].title}
      </p>
    </section>
  );
}
