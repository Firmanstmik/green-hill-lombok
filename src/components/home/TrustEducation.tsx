import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@/icons/iconsax';
import { Link } from 'react-router-dom';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import placePhoto from '@/assets/greenhill/why-lombok-section-land-ocean.webp';
import { BUYING_KEYS, PLACE_KEYS } from '@/components/home/trustEducationKeys';
import { useContentImage } from '@/content/hooks';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Section 05 — Why Lombok / Trust Education.
 * Editorial three-column chapter: Place · Buying · Photograph.
 * No card UI. Gateway only — no legal advice or stats.
 */
export function TrustEducation() {
  const photo = useContentImage('home.trust.photo', placePhoto, 'cms.home.trust.photo.alt');
  const { ref, isInView } = useInView({ threshold: 0.12 });
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();

  const reveal = (delay: number, y = 14) => {
    if (reduce) {
      return {
        initial: { opacity: 0 },
        animate: isInView ? { opacity: 1 } : { opacity: 0 },
        transition: { duration: 0.4, delay: Math.min(delay, 0.1), ease: EASE },
      };
    }
    return {
      initial: { opacity: 0, y },
      animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y },
      transition: { duration: 0.82, delay, ease: EASE },
    };
  };

  const imageReveal = reduce
    ? {
        initial: { opacity: 0 },
        animate: isInView ? { opacity: 1 } : { opacity: 0 },
        transition: { duration: 0.45, delay: 0.1, ease: EASE },
      }
    : {
        initial: { opacity: 0, y: 16, scale: 1.015 },
        animate: isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 1.015 },
        transition: { duration: 1.05, delay: 0.36, ease: EASE },
      };

  const headlineLines = t('trust.headline').split('|');

  return (
    <section id="why-lombok" className="gh-trust" aria-labelledby="gh-trust-heading">
      <div className="gh-trust__inner" ref={ref}>
        <header className="gh-trust__intro">
          <p className="gh-trust__eyebrow">
            <BrandCurveMark className="gh-trust__eyebrow-mark" isInView={isInView} />
            <motion.span {...reveal(0.14, 8)}>{t('trust.eyebrow')}</motion.span>
          </p>

          <h2 id="gh-trust-heading" className="gh-trust__headline">
            {headlineLines.map((line, i) => (
              <motion.span
                key={i}
                className="gh-trust__headline-line"
                {...reveal(0.22 + i * 0.07, 12)}
              >
                {line}
              </motion.span>
            ))}
          </h2>

          <motion.p className="gh-trust__lead" {...reveal(0.4, 10)}>
            {t('trust.lead')}
          </motion.p>
        </header>

        <div className="gh-trust__body">
          {/* 01 — Place */}
          <motion.div className="gh-trust__chapter gh-trust__chapter--place" {...reveal(0.44, 12)}>
            <p className="gh-trust__chapter-sig">
              <span className="gh-trust__chapter-num" aria-hidden>
                01
              </span>
              <span className="gh-trust__chapter-label">{t('trust.placeLabel')}</span>
            </p>

            <ul className="gh-trust__themes">
              {PLACE_KEYS.map((key, i) => (
                <li key={key} className="gh-trust__theme">
                  <motion.div className="gh-trust__theme-inner" {...reveal(0.5 + i * 0.05, 8)}>
                    <span className="gh-trust__theme-title">{t(`trust.place.${key}.title`)}</span>
                    <span className="gh-trust__theme-body">{t(`trust.place.${key}.body`)}</span>
                  </motion.div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* 02 — Buying */}
          <motion.div className="gh-trust__chapter gh-trust__chapter--buying" {...reveal(0.5, 12)}>
            <p className="gh-trust__chapter-sig">
              <span className="gh-trust__chapter-num" aria-hidden>
                02
              </span>
              <span className="gh-trust__chapter-label">{t('trust.buyingLabel')}</span>
            </p>
            <p className="gh-trust__buying-lead">{t('trust.buyingLead')}</p>

            <ul className="gh-trust__pathways">
              {BUYING_KEYS.map((key, i) => {
                const num = String(i + 1).padStart(2, '0');
                return (
                  <li key={key}>
                    <Link
                      to={`/${language}/buying-in-lombok#${key}`}
                      className="gh-trust__pathway"
                    >
                      <span className="gh-trust__pathway-num" aria-hidden>
                        {num}
                      </span>
                      <span className="gh-trust__pathway-copy">
                        <span className="gh-trust__pathway-title">
                          {t(`trust.buying.${key}.title`)}
                        </span>
                        <span className="gh-trust__pathway-body">
                          {t(`trust.buying.${key}.body`)}
                        </span>
                      </span>
                      <span className="gh-trust__pathway-cta">
                        <span>{t('trust.explore')}</span>
                        <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          {/* Photograph — visual anchor */}
          <motion.figure className="gh-trust__media" {...imageReveal}>
            <img
              src={photo.src}
              alt={photo.alt || 'Dirt path through green hills overlooking the ocean in South Lombok'}
              width={900}
              height={1200}
              className="gh-trust__img"
              loading="lazy"
              decoding="async"
            />
          </motion.figure>
        </div>

        <motion.div className="gh-trust__footer" {...reveal(0.68, 10)}>
          <Link to={`/${language}/buying-in-lombok`} className="gh-trust__cta">
            <span className="gh-trust__cta-label">{t('trust.cta')}</span>
            <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
