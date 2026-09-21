import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import privatePhoto from '@/assets/greenhill/source/reece-fields-light-original.jpg';

const EASE = [0.22, 1, 0.36, 1] as const;

const PATHWAY_KEYS = ['land', 'hospitality', 'development', 'joint'] as const;

/**
 * Section 04 — Green Hill Private.
 * Discreet second journey: specialised enquiries → direct conversation with Reece.
 * Enquiry pathways only — not inventory claims.
 */
export function GreenHillPrivate() {
  const { ref, isInView } = useInView({ threshold: 0.14 });
  const { t } = useLanguage();
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

  const headlineLines = t('private.headline').split('|');

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section id="private" className="gh-private" aria-labelledby="gh-private-heading">
      <div className="gh-private__inner" ref={ref}>
        <div className="gh-private__top">
          <div className="gh-private__copy">
            <motion.p className="gh-private__eyebrow" {...reveal(0.04, 10)}>
              <span className="gh-private__eyebrow-rule" aria-hidden />
              <span>{t('private.eyebrow')}</span>
            </motion.p>

            <h2 id="gh-private-heading" className="gh-private__headline">
              {headlineLines.map((line, i) => (
                <motion.span
                  key={i}
                  className="gh-private__headline-line"
                  {...reveal(0.1 + i * 0.06, 14)}
                >
                  {line}
                </motion.span>
              ))}
            </h2>

            <motion.p className="gh-private__lead" {...reveal(0.24, 12)}>
              {t('private.lead')}
            </motion.p>

            <motion.div {...reveal(0.34, 10)}>
              <button
                type="button"
                className="gh-private__cta"
                onClick={scrollToContact}
              >
                <span>{t('private.cta')}</span>
                <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
              </button>
            </motion.div>
          </div>

          <motion.figure className="gh-private__media" {...reveal(0.16, 20)}>
            <img
              src={privatePhoto}
              alt="Cultivated fields and palm-lined hills in South Lombok at warm evening light"
              width={768}
              height={1024}
              className="gh-private__img"
              loading="lazy"
              decoding="async"
            />
          </motion.figure>
        </div>

        <motion.ul className="gh-private__pathways" {...reveal(0.42, 14)}>
          {PATHWAY_KEYS.map((key) => (
            <li key={key} className="gh-private__pathway">
              <p className="gh-private__pathway-title">{t(`private.pathways.${key}.title`)}</p>
              <p className="gh-private__pathway-body">{t(`private.pathways.${key}.body`)}</p>
            </li>
          ))}
        </motion.ul>

        <motion.p className="gh-private__note" {...reveal(0.5, 10)}>
          {t('private.note')}
        </motion.p>
      </div>
    </section>
  );
}
