import { AnimatePresence, motion } from 'framer-motion';
import type { HeroSlide } from './heroData';
import { HERO_CROSSFADE_S, HERO_EASE } from './heroData';

type HeroCarouselProps = {
  slides: HeroSlide[];
  activeIndex: number;
  reduceMotion?: boolean;
};

/**
 * The photograph is the hero. Transition is a straight crossfade — no slide,
 * no wipe, no Ken Burns scale. Each plate uses the untouched master WebP.
 */
export function HeroCarousel({ slides, activeIndex, reduceMotion = false }: HeroCarouselProps) {
  const slide = slides[activeIndex];
  const isFirst = activeIndex === 0;

  return (
    <div id="gh-hero-stage" className="gh-hero-stage">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={slide.id}
          className="gh-hero-plate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: reduceMotion ? 0.3 : HERO_CROSSFADE_S, ease: HERO_EASE },
          }}
        >
          <img
            src={slide.src}
            alt={slide.alt}
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
