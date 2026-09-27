import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@/icons/iconsax';
import { Link } from 'react-router-dom';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { useInView } from '@/hooks/useInView';
import { useLanguage } from '@/contexts/LanguageContext';
import { generalWhatsAppLink, getPublicWhatsAppUrl } from '@/lib/contact';
import { trackContact } from '@/lib/analytics';
import talkPhoto1 from '@/assets/greenhill/sec-talk-to-reece1.webp';
import talkPhoto2 from '@/assets/greenhill/sec-talk-to-reece2.webp';
import talkPhoto3 from '@/assets/greenhill/sec-talk-to-reece3.webp';
import talkBackdrop from '@/assets/greenhill/bg-sec-talk-to-reece.webp';
import { useContentImage } from '@/content/hooks';

const EASE = [0.22, 1, 0.36, 1] as const;

const STEP_KEYS = ['start', 'discuss', 'explore'] as const;

const GALLERY = [
  {
    src: talkPhoto1,
    alt: 'Reece on site in South Lombok: real ground, real landscape',
    className: 'gh-final__plate--lead',
  },
  {
    src: talkPhoto2,
    alt: 'Elevated Lombok land and coastal light from the ground',
    className: 'gh-final__plate--top',
  },
  {
    src: talkPhoto3,
    alt: 'South Lombok hillside and ocean from a site visit',
    className: 'gh-final__plate--bottom',
  },
] as const;

/**
 * Section 06 — Final CTA / Talk to Reece.
 * Personal invitation to begin a conversation — not a contact form.
 * Anchored as #contact for Hero/Nav/Private CTAs.
 * Does not invent or expose unverified WhatsApp/email/phone.
 */
export function FinalCTA() {
  const plates = [
    useContentImage('home.final.photo', talkPhoto1, 'cms.home.final.photo.alt'),
    useContentImage('home.final.photo2', talkPhoto2, 'cms.home.final.photo2.alt'),
    useContentImage('home.final.photo3', talkPhoto3, 'cms.home.final.photo3.alt'),
  ];
  const gallery = GALLERY.map((plate, i) => ({ ...plate, src: plates[i].src, alt: plates[i].alt || plate.alt }));
  const { ref, isInView } = useInView({ threshold: 0.14 });
  const { language, t } = useLanguage();
  const reduce = useReducedMotion();
  const [pendingShown, setPendingShown] = useState(false);
  const whatsappUrl = getPublicWhatsAppUrl();

  const reveal = (delay: number, duration: number, y = 14) => {
    if (reduce) {
      return {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      };
    }
    return {
      initial: { opacity: 0, y },
      animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y },
      transition: { duration, delay, ease: EASE },
    };
  };

  const plateReveal = (delay: number) => {
    if (reduce) {
      return {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      };
    }
    return {
      initial: { opacity: 0, y: 16 },
      animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
      transition: { duration: 0.85, delay, ease: EASE },
    };
  };

  const headlineLines = t('final.headline').split('|');

  const handleSpeak = () => {
    if (whatsappUrl) {
      trackContact({ channel: 'whatsapp', form: 'home-final' });
      window.open(generalWhatsAppLink(language), '_blank', 'noopener,noreferrer');
      return;
    }
    setPendingShown(true);
  };

  return (
    <section id="contact" className="gh-final" aria-labelledby="gh-final-heading">
      <div className="gh-final__backdrop" aria-hidden>
        <img
          src={talkBackdrop}
          alt=""
          width={1920}
          height={1080}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="gh-final__inner" ref={ref}>
        <div className="gh-final__top">
          <div className="gh-final__copy">
            <motion.p className="gh-final__eyebrow" {...reveal(0, 0.4, 8)}>
              <BrandCurveMark className="gh-final__eyebrow-mark" isInView={isInView} />
              <span>{t('final.eyebrow')}</span>
            </motion.p>

            <h2 id="gh-final-heading" className="gh-final__headline">
              {headlineLines.map((line, i) => (
                <motion.span
                  key={i}
                  className="gh-final__headline-line"
                  {...reveal(0.15 + i * 0.06, 0.6, 12)}
                >
                  {line}
                </motion.span>
              ))}
            </h2>

            <motion.p className="gh-final__lead" {...reveal(0.3, 0.55, 10)}>
              {t('final.lead')}
            </motion.p>

            <motion.div className="gh-final__actions" {...reveal(0.45, 0.55, 8)}>
              <button
                type="button"
                className="gh-final__cta gh-final__cta--primary"
                onClick={handleSpeak}
              >
                <span className="gh-final__cta-label">{t('final.primaryCta')}</span>
                <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
              </button>

              <Link
                to={`/${language}/properties`}
                className="gh-final__cta gh-final__cta--secondary"
              >
                <span className="gh-final__cta-label">{t('final.secondaryCta')}</span>
                <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
              </Link>
            </motion.div>

            <motion.p className="gh-final__alt" {...reveal(0.55, 0.55, 6)}>
              <Link to={`/${language}/enquire`}>{t('final.profileCta')}</Link>
            </motion.p>

            {pendingShown && !whatsappUrl && (
              <p className="gh-final__pending" role="status">
                {t('final.contactPending')}
              </p>
            )}
          </div>

          <div className="gh-final__gallery">
            {gallery.map((plate, i) => (
              <motion.figure
                key={plate.className}
                className={`gh-final__plate ${plate.className}`}
                {...plateReveal(0.12 + i * 0.1)}
              >
                <img
                  src={plate.src}
                  alt={plate.alt}
                  width={720}
                  height={960}
                  className="gh-final__img"
                  loading="lazy"
                  decoding="async"
                />
              </motion.figure>
            ))}
          </div>
        </div>

        <ol className="gh-final__steps">
          {STEP_KEYS.map((key, i) => (
            <motion.li
              key={key}
              className="gh-final__step"
              {...reveal(0.7 + i * 0.08, 0.55, 10)}
            >
              <span className="gh-final__step-num" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="gh-final__step-title">{t(`final.steps.${key}.title`)}</span>
              <span className="gh-final__step-body">{t(`final.steps.${key}.body`)}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
