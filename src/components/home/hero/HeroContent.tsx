import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@/icons/iconsax';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHeroReveal } from './useHeroReveal';
import { useHeroNarrow } from './useHeroRag';
import { HeroPlotMark } from './HeroPlotMark';
import { HeroCaption } from './HeroCaption';
import type { HeroSlide } from './heroData';

type HeroContentProps = {
  onSpeak: () => void;
  /** The chapters, for the caption that follows the photograph on screen. */
  slides: HeroSlide[];
  activeIndex: number;
};

/**
 * Primary hero message. Copy is fixed — the craft is in the typesetting:
 * the headline breaks on authored pipes rather than wherever the box ends.
 *
 * There are two authored rags, not one. The desktop rag's longest line
 * ("investment opportunities") does not fit a ~300px phone column, so it used
 * to re-wrap and produce an unplanned four-line rag with the ampersand
 * orphaned at the end of line one. The narrow rag sets the same words to
 * breaks that fit, and leads line two with the ampersand — deliberate rather
 * than stranded.
 */
export function HeroContent({ onSpeak, slides, activeIndex }: HeroContentProps) {
  const { language, t } = useLanguage();
  const { reveal } = useHeroReveal();
  const narrow = useHeroNarrow();
  const lines = t(narrow ? 'hero.headlineMobile' : 'hero.headline').split('|');
  /* Follows nav chrome settle so the composition opens as one sequence. */
  const headStart = 0.68;
  const tail = headStart + lines.length * 0.09;

  return (
    <div className="gh-hero-copy">
      <motion.p {...reveal(0.62, 8)} className="gh-hero-eyebrow">
        <HeroPlotMark />
        <span>{t('hero.locationLabel')}</span>
      </motion.p>

      <h1 className="gh-hero-display">
        {lines.map((line, i) => {
          const parts = line.split('&');
          return (
            /*
              Each line sits in its own mask. The type rises a short distance
              from under the mask edge rather than sliding in over the line
              above it, so the photograph appears to be releasing the
              typography. The gold ampersand is inside the line, so it is
              revealed by the same movement rather than animating on its own.
            */
            <span key={i} className="gh-hero-display__line">
              <motion.span
                className="gh-hero-display__reveal"
                {...reveal(headStart + i * 0.09, 22)}
              >
                {parts.map((part, j) => (
                  <Fragment key={j}>
                    {j > 0 && <em>&amp;</em>}
                    {part}
                  </Fragment>
                ))}
              </motion.span>
            </span>
          );
        })}
      </h1>

      <motion.div {...reveal(tail + 0.04, 10)}>
        <HeroCaption slides={slides} activeIndex={activeIndex} />
      </motion.div>

      <motion.p {...reveal(tail + 0.12, 12)} className="gh-hero-body">
        {t('hero.subheadline')}
      </motion.p>

      <motion.div {...reveal(tail + 0.2, 12)} className="gh-hero-actions">
        <Link to={`/${language}/properties`} className="gh-hero-btn gh-hero-btn--primary">
          <span className="gh-hero-btn__label">{t('hero.exploreOpportunities')}</span>
          <ArrowRight className="gh-hero-btn__arrow" size={15} strokeWidth={1.75} aria-hidden />
        </Link>
        <button type="button" onClick={onSpeak} className="gh-hero-btn gh-hero-btn--ghost">
          <span className="gh-hero-btn__label">{t('hero.speakWithUs')}</span>
          <ArrowRight className="gh-hero-btn__arrow" size={15} strokeWidth={1.75} aria-hidden />
        </button>
      </motion.div>
    </div>
  );
}
