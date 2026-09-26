import { Fragment } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Signature } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
/* Master only — no srcset ladder (rungs looked soft vs the original). */
import founderPortrait from '@/assets/greenhill/founder/green-hill-reece-green.webp';
import { useContentImage } from '@/content/hooks';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Section 02 — Founder / Reece.
 * PERSON after HERO. Editorial story only — no stats, stock, or agency chrome.
 * Anchored as #about so Hero "Meet Reece" continues to scroll here.
 */
export function FounderSection() {
  const portrait = useContentImage('home.founder.portrait', founderPortrait, 'cms.home.founder.portrait.alt');
  const { ref, isInView } = useInView({ threshold: 0.16 });
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  const reveal = (delay: number, y = 18) => {
    if (reduce) {
      return {
        initial: { opacity: 0 },
        animate: isInView ? { opacity: 1 } : { opacity: 0 },
        transition: { duration: 0.45, delay: Math.min(delay, 0.12), ease: EASE },
      };
    }
    return {
      initial: { opacity: 0, y },
      animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y },
      transition: { duration: 0.78, delay, ease: EASE },
    };
  };

  const headlineLines = t('founder.headline').split('|');
  const storyParas = [t('founder.story1'), t('founder.story2'), t('founder.story3'), t('founder.story4')];
  const quoteLines = t('founder.quote').split('|');

  return (
    <section id="about" className="gh-founder" aria-labelledby="gh-founder-heading">
      <div className="gh-founder__inner" ref={ref}>
        <div className="gh-founder__grid">
          <div className="gh-founder__copy">
            <header className="gh-founder__intro">
              <p className="gh-founder__eyebrow">
                <BrandCurveMark className="gh-founder__eyebrow-mark" isInView={isInView} />
                <motion.span {...reveal(0.14, 8)}>{t('founder.eyebrow')}</motion.span>
              </p>

              <h2 id="gh-founder-heading" className="gh-founder__headline">
                {headlineLines.map((line, i) => (
                  <motion.span
                    key={i}
                    className="gh-founder__headline-line"
                    {...reveal(0.1 + i * 0.07, 14)}
                  >
                    {line}
                  </motion.span>
                ))}
              </h2>
            </header>

            <div className="gh-founder__story">
              {storyParas.map((para, i) => (
                <motion.p
                  key={i}
                  className={`gh-founder__body${i === 0 ? ' gh-founder__body--lead' : ''}`}
                  {...reveal(0.32 + i * 0.07, 12)}
                >
                  {para}
                </motion.p>
              ))}
            </div>

            <motion.blockquote className="gh-founder__quote" {...reveal(0.52, 14)}>
              <p className="gh-founder__quote-text">
                {quoteLines.map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </p>
              <footer className="gh-founder__quote-attr">
                <Signature
                  className="gh-founder__quote-icon"
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <cite className="gh-founder__quote-name">{t('founder.name')}</cite>
                <span className="gh-founder__quote-title">{t('founder.roleShort')}</span>
              </footer>
            </motion.blockquote>
          </div>

          <div className="gh-founder__media">
            {/*
              Editorial passepartout: thin mat + gold hairline. Gallery framing,
              not a marketplace card — no glass, no soft multi-shadow stack.
            */}
            <div className="gh-founder__frame">
              <motion.div
                className="gh-founder__img-wrap"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: reduce ? 0.45 : 0.85, delay: reduce ? 0 : 0.16, ease: EASE }}
              >
                <img
                  src={portrait.src}
                  alt={portrait.alt || 'Reece Green at a villa overlooking the South Lombok coast at golden hour'}
                  width={1087}
                  height={1447}
                  className="gh-founder__img"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <p className="gh-founder__caption">
                  <span className="gh-founder__caption-name">{t('founder.name')}</span>
                  <span className="gh-founder__caption-role">{t('founder.role')}</span>
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
