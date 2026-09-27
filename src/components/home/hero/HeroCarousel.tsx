import { AnimatePresence, motion } from 'framer-motion';
import type { HeroSlide } from './heroData';
import { HERO_AUTO_MS, HERO_CINEMA_EASE, HERO_CROSSFADE_S } from './heroData';

type HeroCarouselProps = {
  slides: HeroSlide[];
  activeIndex: number;
  reduceMotion?: boolean;
};

/**
 * The photograph is the hero. Each plate uses the untouched master WebP.
 *
 * Motion is one continuous, restrained movement rather than a carousel:
 * - the live photograph drifts from scale 1.00 to 1.025 over its whole life
 *   (CSS, `.gh-hero-img` inside `.gh-hero-plate`);
 * - on a change the incoming plate settles from 1.025 to 1 while fading in,
 *   and the outgoing plate eases back a little while fading out, over 1.2 s.
 * Reduced motion: a plain short fade, no scale.
 */
export function HeroCarousel({ slides, activeIndex, reduceMotion = false }: HeroCarouselProps) {
  const slide = slides[activeIndex];
  const isFirst = activeIndex === 0;
  const fade = { duration: reduceMotion ? 0.3 : HERO_CROSSFADE_S, ease: HERO_CINEMA_EASE };

  return (
    <div
      id="gh-hero-stage"
      className="gh-hero-stage"
      style={{ '--gh-hero-life': `${HERO_AUTO_MS + HERO_CROSSFADE_S * 1000}ms` } as React.CSSProperties}
    >
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={slide.id}
          className="gh-hero-plate"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.025 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
          transition={{ opacity: fade, scale: fade }}
        >
          {/*
            alt="" on purpose: the photograph's CMS description is shown right
            beside it as the hero caption (HeroCaption), which is the text
            assistive technology reads. Repeating it as alt would announce the
            same sentence twice. The description stays the single source.
          */}
          <img
            src={slide.src}
            alt=""
            className="gh-hero-img"
            style={
              {
                '--gh-focus-desktop': slide.focus.desktop,
                '--gh-focus-mobile': slide.focus.mobile,
              } as React.CSSProperties
            }
            draggable={false}
            loading={isFirst ? 'eager' : 'lazy'}
            fetchPriority={isFirst ? 'high' : 'low'}
            decoding={isFirst ? 'sync' : 'async'}
            width={slide.width}
            height={slide.height}
          />
        </motion.div>
      </AnimatePresence>

      <div className="gh-hero-wash" aria-hidden />
      <div className="gh-hero-grain" aria-hidden />
    </div>
  );
}
