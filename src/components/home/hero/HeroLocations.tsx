import { motion } from 'framer-motion';
import type { HeroSlide } from './heroData';
import { useHeroReveal } from './useHeroReveal';

type Props = {
  slides: HeroSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  progress: number;
};

/**
 * Chapter navigation — an editorial contents list, not a carousel widget.
 *
 * Deliberately not the ARIA tab pattern: three `role="tab"` controls pointing
 * at a single element that is no `tabpanel` is invalid, and screen readers
 * already get the chapter change from the hero's live region. Plain buttons
 * carrying `aria-current` describe this honestly.
 */
export function HeroLocations({ slides, activeIndex, onSelect, progress }: Props) {
  const { reveal } = useHeroReveal();

  return (
    <motion.nav className="gh-hero-chapters" aria-label="Hero chapters" {...reveal(1.22, 8)}>
      <ol className="gh-hero-chapters__list">
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          return (
            <li key={slide.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={`gh-hero-chapter${active ? ' is-active' : ''}`}
                aria-current={active ? 'true' : undefined}
                aria-label={`Chapter ${slide.number}, ${slide.title}`}
              >
                <span className="gh-hero-chapter__rule" aria-hidden>
                  <span
                    className="gh-hero-chapter__fill"
                    style={{ transform: `scaleX(${active ? Math.max(0.04, progress) : 0})` }}
                  />
                </span>
                <span className="gh-hero-chapter__num" aria-hidden>
                  {slide.number}
                </span>
                <span className="gh-hero-chapter__title" aria-hidden>
                  {slide.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </motion.nav>
  );
}
