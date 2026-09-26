import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import privateCardPhoto from '@/assets/greenhill/green-hill-private.webp';
import privateBackdrop from '@/assets/greenhill/hero-hills.webp';
import { useContentImage } from '@/content/hooks';

const EASE = [0.22, 1, 0.36, 1] as const;

const PATHWAY_KEYS = ['land', 'hospitality', 'development', 'joint'] as const;

/**
 * Section 04 — Green Hill Private.
 * Discreet second journey: specialised enquiries → conversation with Reece.
 * Enquiry pathways only — not inventory claims.
 */
export function GreenHillPrivate() {
  const card = useContentImage('home.private.card', privateCardPhoto, 'cms.home.private.card.alt');
  const { ref, isInView } = useInView({ threshold: 0.14 });
  const { t, language } = useLanguage();
  const reduce = useReducedMotion();

  const reveal = (delay: number, y = 14) => {
    if (reduce) {
      return {
        initial: { opacity: 0 },
        animate: isInView ? { opacity: 1 } : { opacity: 0 },
        transition: { duration: 0.35, delay: Math.min(delay, 0.08), ease: EASE },
      };
    }
    return {
      initial: { opacity: 0, y },
      animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y },
      transition: { duration: 0.78, delay, ease: EASE },
    };
  };

  const imageReveal = reduce
    ? {
        initial: { opacity: 0 },
        animate: isInView ? { opacity: 1 } : { opacity: 0 },
        transition: { duration: 0.4, delay: 0.1, ease: EASE },
      }
    : {
        initial: { opacity: 0, y: 12, scale: 1.015 },
        animate: isInView
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 12, scale: 1.015 },
        transition: { duration: 0.95, delay: 0.22, ease: EASE },
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
      <div className="gh-private__backdrop" aria-hidden>
        <img
          src={privateBackdrop}
          alt=""
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="gh-private__inner" ref={ref}>
        <div className="gh-private__top">
          <div className="gh-private__copy">
            <p className="gh-private__eyebrow">
              <BrandCurveMark className="gh-private__eyebrow-mark" isInView={isInView} />
              <motion.span {...reveal(0.14, 8)}>{t('private.eyebrow')}</motion.span>
            </p>

            <h2 id="gh-private-heading" className="gh-private__headline">
              {headlineLines.map((line, i) => (
                <motion.span
                  key={i}
                  className="gh-private__headline-line"
                  {...reveal(0.2 + i * 0.07, 14)}
                >
                  {line}
                </motion.span>
              ))}
            </h2>

            <motion.p className="gh-private__lead" {...reveal(0.36, 10)}>
              {t('private.lead')}
            </motion.p>

            <motion.div className="gh-private__actions" {...reveal(0.46, 8)}>
              <button
                type="button"
                className="gh-private__cta"
                onClick={scrollToContact}
              >
                <span className="gh-private__cta-label">{t('private.cta')}</span>
                <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
              </button>
              <Link to={`/${language}/private`} className="gh-private__journey">
                <span>{t('private.journey')}</span>
                <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
              </Link>
            </motion.div>
          </div>

          <motion.figure className="gh-private__media" {...imageReveal}>
            <img
              src={card.src}
              alt={card.alt || 'Cultivated fields and palm-lined hills in South Lombok at warm evening light'}
              width={1440}
              height={1092}
              className="gh-private__img"
              loading="lazy"
              decoding="async"
            />
          </motion.figure>
        </div>

        <ul className="gh-private__pathways">
          {PATHWAY_KEYS.map((key, i) => (
            <motion.li
              key={key}
              className="gh-private__pathway"
              {...reveal(0.52 + i * 0.05, 10)}
            >
              <span className="gh-private__pathway-num" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="gh-private__pathway-title">{t(`private.pathways.${key}.title`)}</p>
              <p className="gh-private__pathway-body">{t(`private.pathways.${key}.body`)}</p>
            </motion.li>
          ))}
        </ul>

        <motion.p className="gh-private__note" {...reveal(0.74, 8)}>
          {t('private.note')}
        </motion.p>
      </div>
    </section>
  );
}
