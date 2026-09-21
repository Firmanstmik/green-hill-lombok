import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPublicWhatsAppUrl } from '@/lib/contact';
import ctaPhoto from '@/assets/greenhill/source/reece-scooter-elevated-original.jpg';

const EASE = [0.22, 1, 0.36, 1] as const;

const STEP_KEYS = ['start', 'discuss', 'explore'] as const;

/**
 * Section 06 — Final CTA / Talk to Reece.
 * Homepage conversion close. Anchored as #contact for Hero/Nav/Private CTAs.
 * Does not invent or expose unverified WhatsApp/email/phone.
 */
export function FinalCTA() {
  const { ref, isInView } = useInView({ threshold: 0.14 });
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();
  const [pendingShown, setPendingShown] = useState(false);
  const whatsappUrl = getPublicWhatsAppUrl();

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

  const headlineLines = t('final.headline').split('|');

  const handleSpeak = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setPendingShown(true);
  };

  return (
    <section id="contact" className="gh-final" aria-labelledby="gh-final-heading">
      <div className="gh-final__inner" ref={ref}>
        <div className="gh-final__top">
          <div className="gh-final__copy">
            <motion.p className="gh-final__eyebrow" {...reveal(0.04, 10)}>
              <span className="gh-final__eyebrow-rule" aria-hidden />
              <span>{t('final.eyebrow')}</span>
            </motion.p>

            <h2 id="gh-final-heading" className="gh-final__headline">
              {headlineLines.map((line, i) => (
                <motion.span
                  key={i}
                  className="gh-final__headline-line"
                  {...reveal(0.1 + i * 0.06, 14)}
                >
                  {line}
                </motion.span>
              ))}
            </h2>

            <motion.p className="gh-final__lead" {...reveal(0.24, 12)}>
              {t('final.lead')}
            </motion.p>

            <motion.div className="gh-final__actions" {...reveal(0.34, 10)}>
              <button type="button" className="gh-final__cta gh-final__cta--primary" onClick={handleSpeak}>
                <span>{t('final.primaryCta')}</span>
                <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
              </button>

              <Link to={`/${language}/properties`} className="gh-final__cta gh-final__cta--secondary">
                <span>{t('final.secondaryCta')}</span>
                <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
              </Link>
            </motion.div>

            {pendingShown && !whatsappUrl && (
              <p className="gh-final__pending" role="status">
                {t('final.contactPending')}
              </p>
            )}
          </div>

          <motion.figure className="gh-final__media" {...reveal(0.16, 20)}>
            <img
              src={ctaPhoto}
              alt="Adventure scooter on an elevated ridge overlooking a tropical valley and bay in South Lombok"
              width={768}
              height={1024}
              className="gh-final__img"
              loading="lazy"
              decoding="async"
            />
          </motion.figure>
        </div>

        <motion.ol className="gh-final__steps" {...reveal(0.42, 14)}>
          {STEP_KEYS.map((key, i) => (
            <li key={key} className="gh-final__step">
              <span className="gh-final__step-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="gh-final__step-title">{t(`final.steps.${key}.title`)}</span>
              <span className="gh-final__step-body">{t(`final.steps.${key}.body`)}</span>
            </li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
