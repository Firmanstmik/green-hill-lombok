import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import placePhoto from '@/assets/greenhill/source/reece-elevated-valley-original.jpg';
import { BUYING_KEYS, PLACE_KEYS } from '@/components/home/trustEducationKeys';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Section 05 — Trust / Buying Education + Why Lombok.
 * Gateway only: place perspective + educational pathways. No legal advice or stats.
 */
export function TrustEducation() {
  const { ref, isInView } = useInView({ threshold: 0.12 });
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();

  const reveal = (delay: number, y = 16) => {
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
      transition: { duration: 0.72, delay, ease: EASE },
    };
  };

  const headlineLines = t('trust.headline').split('|');

  return (
    <section id="why-lombok" className="gh-trust" aria-labelledby="gh-trust-heading">
      <div className="gh-trust__inner" ref={ref}>
        <header className="gh-trust__intro">
          <motion.p className="gh-trust__eyebrow" {...reveal(0.04, 10)}>
            <span className="gh-trust__eyebrow-rule" aria-hidden />
            <span>{t('trust.eyebrow')}</span>
          </motion.p>

          <h2 id="gh-trust-heading" className="gh-trust__headline">
            {headlineLines.map((line, i) => (
              <motion.span key={i} className="gh-trust__headline-line" {...reveal(0.1 + i * 0.06, 14)}>
                {line}
              </motion.span>
            ))}
          </h2>

          <motion.p className="gh-trust__lead" {...reveal(0.22, 12)}>
            {t('trust.lead')}
          </motion.p>
        </header>

        <div className="gh-trust__split">
          <div className="gh-trust__place">
            <motion.figure className="gh-trust__media" {...reveal(0.18, 18)}>
              <img
                src={placePhoto}
                alt="Elevated hillside overlooking a palm valley and coastal bay in South Lombok"
                width={768}
                height={1024}
                className="gh-trust__img"
                loading="lazy"
                decoding="async"
              />
            </motion.figure>

            <motion.div className="gh-trust__place-copy" {...reveal(0.28, 12)}>
              <p className="gh-trust__layer-label">{t('trust.placeLabel')}</p>
              <ul className="gh-trust__themes">
                {PLACE_KEYS.map((key) => (
                  <li key={key} className="gh-trust__theme">
                    <span className="gh-trust__theme-title">{t(`trust.place.${key}.title`)}</span>
                    <span className="gh-trust__theme-body">{t(`trust.place.${key}.body`)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.div className="gh-trust__buying" {...reveal(0.32, 14)}>
            <p className="gh-trust__layer-label">{t('trust.buyingLabel')}</p>
            <p className="gh-trust__buying-lead">{t('trust.buyingLead')}</p>

            <ul className="gh-trust__pathways">
              {BUYING_KEYS.map((key) => (
                <li key={key}>
                  <Link
                    to={`/${language}/buying-in-lombok#${key}`}
                    className="gh-trust__pathway"
                  >
                    <span className="gh-trust__pathway-text">
                      <span className="gh-trust__pathway-title">{t(`trust.buying.${key}.title`)}</span>
                      <span className="gh-trust__pathway-body">{t(`trust.buying.${key}.body`)}</span>
                    </span>
                    <span className="gh-trust__pathway-cta">
                      {t('trust.explore')}
                      <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div className="gh-trust__footer" {...reveal(0.48, 12)}>
          <Link to={`/${language}/buying-in-lombok`} className="gh-trust__cta">
            <span>{t('trust.cta')}</span>
            <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
