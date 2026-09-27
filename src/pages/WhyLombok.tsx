import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Maximize2, X } from '@/icons/iconsax';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useFocusTrap } from '@/components/layout/useFocusTrap';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { GhIconArrow } from '@/components/brand/GhIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInView } from '@/hooks/useInView';
import heroPhoto from '@/assets/greenhill/hero section image bg/green-hill-hero-section-1.webp';
import placePhoto from '@/assets/greenhill/land-holding.jpg';
import placePhotoCoast from '@/assets/greenhill/land-coastal.jpg';
import placePhotoLand from '@/assets/greenhill/hero-land-landscape.jpg';
import placePhotoOcean from '@/assets/greenhill/why-lombok-section-land-ocean.webp';
import southPhoto from '@/assets/greenhill/gh-private-why-landscape.jpg';
import pacePhoto from '@/assets/greenhill/land-coastal.jpg';
import accessPhoto from '@/assets/greenhill/land-hillside.jpg';
import accessPhotoHills from '@/assets/greenhill/hero-hills.webp';
import accessPhotoCoast from '@/assets/greenhill/land-beach.jpg';
import longerPhoto from '@/assets/greenhill/why-lombok-section-land-ocean.webp';
import founderPortrait from '@/assets/greenhill/founder/green-hill-reece-green.webp';
import finalBackdrop from '@/assets/greenhill/hero-hills.webp';
import { useContentImage } from '@/content/hooks';

const EASE = [0.22, 1, 0.36, 1] as const;
const SOUTH_LABELS = ['land', 'coast', 'lifestyle', 'access'] as const;
const CARD_AUTOPLAY_MS = 4800;

const PLACE_SLIDES = [placePhoto, placePhotoLand, placePhotoCoast, placePhotoOcean] as const;
const ACCESS_SLIDES = [accessPhoto, accessPhotoHills, southPhoto, accessPhotoCoast] as const;

const speakLines = (value: string) => value.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();

function reveal(inView: boolean, reduce: boolean, delay = 0, y = 14) {
  if (reduce) {
    return {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y },
    transition: { duration: 0.82, delay, ease: EASE },
  };
}

function titleReveal(inView: boolean, reduce: boolean, delay = 0) {
  if (reduce) {
    return {
      initial: { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' },
      animate: { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 18, clipPath: 'inset(0 0 100% 0)' },
    animate: inView
      ? { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }
      : { opacity: 0, y: 18, clipPath: 'inset(0 0 100% 0)' },
    transition: { duration: 0.92, delay, ease: EASE },
  };
}

function SectionReveal({
  children,
  className,
  labelledBy,
  threshold = 0.16,
  backdrop,
}: {
  children: (isInView: boolean, reduce: boolean) => ReactNode;
  className?: string;
  labelledBy?: string;
  threshold?: number;
  backdrop?: ReactNode;
}) {
  const { ref, isInView } = useInView({ threshold });
  const reduce = Boolean(useReducedMotion());
  return (
    <section className={className} aria-labelledby={labelledBy}>
      {backdrop}
      <div ref={ref}>{children(isInView, reduce)}</div>
    </section>
  );
}

function WhyShowcaseCard({
  slides,
  badge,
  title,
  meta,
  body,
  imageAlt,
  expandLabel,
  prevLabel,
  nextLabel,
  closeLabel,
  isInView,
  reduce,
  className,
}: {
  slides: readonly string[];
  badge: string;
  title: string;
  meta: string;
  body: string;
  imageAlt: string;
  expandLabel: string;
  prevLabel: string;
  nextLabel: string;
  closeLabel: string;
  isInView: boolean;
  reduce: boolean;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useFocusTrap(lightboxRef, open);

  const showPrev = useCallback(() => {
    setIndex((current) => (current - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const showNext = useCallback(() => {
    setIndex((current) => (current + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (reduce || paused || open || !isInView) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, CARD_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduce, paused, open, isInView, slides.length, index]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowLeft') showPrev();
      if (event.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, showPrev, showNext]);

  return (
    <>
      <motion.article
        className={['gh-why-card', className].filter(Boolean).join(' ')}
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
        animate={isInView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: reduce ? 0 : 1, delay: 0.14, ease: EASE }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        <span className="gh-why-card__bracket gh-why-card__bracket--tl" aria-hidden />
        <span className="gh-why-card__bracket gh-why-card__bracket--br" aria-hidden />

        <div className="gh-why-card__media">
          <AnimatePresence mode="wait">
            <motion.img
              key={slides[index]}
              src={slides[index]}
              alt={imageAlt}
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              className="gh-why-card__img"
              initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.01 }}
              transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
            />
          </AnimatePresence>
        </div>

        <div className="gh-why-card__veil" aria-hidden />

        {!reduce ? (
          <span
            key={`progress-${index}`}
            className={paused || open ? 'gh-why-card__progress is-paused' : 'gh-why-card__progress'}
            aria-hidden
          />
        ) : null}

        <button
          type="button"
          className="gh-why-card__expand"
          onClick={() => setOpen(true)}
          aria-label={expandLabel}
        >
          <Maximize2 size={16} strokeWidth={1.75} aria-hidden />
        </button>

        <div className="gh-why-card__copy">
          <span className="gh-why-card__badge">{badge}</span>
          <h3 className="gh-why-card__title">{title}</h3>
          <p className="gh-why-card__meta">
            <MapPin size={14} strokeWidth={1.75} aria-hidden />
            <span>{meta}</span>
          </p>
        </div>
      </motion.article>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                key="why-card-lightbox"
                className="gh-about-approach-lightbox"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gh-why-card-lightbox-title"
                initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                onClick={() => setOpen(false)}
              >
                <div
                  ref={lightboxRef}
                  className="gh-about-approach-lightbox__stage"
                  onClick={(event) => event.stopPropagation()}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={slides[index]}
                      className="gh-about-approach-lightbox__frame"
                      initial={
                        reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.97, y: 14 }
                      }
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={
                        reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.985, y: -8 }
                      }
                      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                    >
                      <img
                        className="gh-about-approach-lightbox__img"
                        src={slides[index]}
                        alt={imageAlt}
                        width={1600}
                        height={1000}
                      />
                      <div className="gh-about-approach-lightbox__veil" aria-hidden />
                      <div className="gh-about-approach-lightbox__copy">
                        <p className="gh-about-approach-lightbox__index" aria-hidden>
                          {String(index + 1).padStart(2, '0')}
                        </p>
                        <h3
                          id="gh-why-card-lightbox-title"
                          className="gh-about-approach-lightbox__title"
                        >
                          {title}
                        </h3>
                        <p className="gh-about-approach-lightbox__body">{body}</p>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <button
                    type="button"
                    className="gh-about-approach-lightbox__close"
                    onClick={() => setOpen(false)}
                    aria-label={closeLabel}
                  >
                    <X size={20} strokeWidth={1.75} aria-hidden />
                  </button>

                  <button
                    type="button"
                    className="gh-about-approach-lightbox__nav gh-about-approach-lightbox__nav--prev"
                    onClick={showPrev}
                    aria-label={prevLabel}
                  >
                    <ChevronLeft size={26} strokeWidth={1.6} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="gh-about-approach-lightbox__nav gh-about-approach-lightbox__nav--next"
                    onClick={showNext}
                    aria-label={nextLabel}
                  >
                    <ChevronRight size={26} strokeWidth={1.6} aria-hidden />
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"][data-gh-why]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute('data-gh-why', '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

const WhyLombok = () => {
  const heroImage = useContentImage('why.hero', heroPhoto);
  const place = useContentImage('why.place', placePhoto);
  const south = useContentImage('why.south', southPhoto);
  const access = useContentImage('why.access', accessPhoto);
  const pace = useContentImage('why.pace', pacePhoto);
  const longer = useContentImage('why.longer', longerPhoto);
  const seoImage = useContentImage('why.seo.image', heroPhoto);
  const placeSlides = [
    place.src,
    useContentImage('why.place.slide2', PLACE_SLIDES[1]).src,
    useContentImage('why.place.slide3', PLACE_SLIDES[2]).src,
    useContentImage('why.place.slide4', PLACE_SLIDES[3]).src,
  ];
  const accessSlides = [
    access.src,
    useContentImage('why.access.slide2', ACCESS_SLIDES[1]).src,
    south.src,
    useContentImage('why.access.slide4', ACCESS_SLIDES[3]).src,
  ];
  const portrait = useContentImage('site.reece.portrait', founderPortrait);
  const { t, language } = useLanguage();
  const reduce = Boolean(useReducedMotion());
  const hero = useInView({ threshold: 0.2 });
  const archiveHref = `/${language}/properties`;
  const buyingHref = `/${language}/buying-in-lombok`;
  const enquireHref = `/${language}/enquire`;

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const title = t('whyLombok.page.seoTitle');
    const description = t('whyLombok.page.seoDescription');
    const canonical = `${window.location.origin}/${language}/why-lombok`;
    const image = new URL(seoImage.src, window.location.origin).href;

    document.title = title;
    document.documentElement.lang = language;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:url', canonical);

    let link = document.head.querySelector('link[rel="canonical"][data-gh-why]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('data-gh-why', '');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.head.querySelectorAll('[data-gh-why]').forEach((node) => node.remove());
    };
  }, [language, t]);

  const heroReveal = (delay: number, y = 12) =>
    reduce
      ? {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          transition: { duration: 0 },
        }
      : {
          initial: { opacity: 0, y },
          animate: hero.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y },
          transition: { duration: 0.75, delay, ease: EASE },
        };

  return (
    <div className="gh-why min-h-screen">
      <Navbar />

      <main>
        <header className="gh-why-hero" ref={hero.ref} aria-labelledby="gh-why-hero-heading">
          <div className="gh-why-hero__media">
            <motion.img
              src={heroImage.src}
              alt={t('whyLombok.page.heroAlt')}
              className="gh-why-hero__img"
              width={1672}
              height={941}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.045 }}
              animate={hero.isInView ? { opacity: 1, scale: 1 } : undefined}
              transition={{ duration: reduce ? 0.4 : 1.2, ease: EASE }}
            />
          </div>
          <div className="gh-why-hero__veil" aria-hidden />

          <div className="gh-why-hero__inner">
            <p className="gh-why-hero__eyebrow">
              <BrandCurveMark className="gh-why-hero__mark" isInView={hero.isInView} />
              <motion.span {...heroReveal(0.18, 8)}>{t('whyLombok.page.eyebrow')}</motion.span>
            </p>
            <motion.h1
              id="gh-why-hero-heading"
              className="gh-why-hero__title"
              aria-label={speakLines(t('whyLombok.page.headline'))}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={hero.isInView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: reduce ? 0 : 0.85, delay: reduce ? 0 : 0.28, ease: EASE }}
            >
              {t('whyLombok.page.headline')
                .split('|')
                .map((line) => (
                  <span key={line} className="gh-why-hero__line">
                    {line}
                  </span>
                ))}
            </motion.h1>
            <motion.p className="gh-why-hero__lead" {...heroReveal(0.42, 10)}>
              {t('whyLombok.page.lead')}
            </motion.p>
            <div className="gh-why-actions gh-why-actions--center gh-why-hero__actions">
              <motion.div {...heroReveal(0.54, 8)}>
                <Link className="gh-final__cta gh-final__cta--primary" to={archiveHref}>
                  <span className="gh-final__cta-label">{t('whyLombok.page.explore')}</span>
                  <GhIconArrow size={15} aria-hidden />
                </Link>
              </motion.div>
              <Link to={enquireHref} className="gh-final__cta gh-final__cta--secondary">
                <span className="gh-final__cta-label">{t('whyLombok.page.talk')}</span>
                <GhIconArrow size={14} aria-hidden />
              </Link>
            </div>
          </div>

          <div className="gh-why-hero__wave" aria-hidden>
            <svg viewBox="0 0 1440 96" preserveAspectRatio="none">
              <path
                fill="#F1EDE5"
                d="M0 46C140 78 260 18 460 30C680 44 820 86 1040 64C1220 46 1340 16 1440 34V96H0Z"
              />
            </svg>
          </div>
        </header>

        <SectionReveal
          className="gh-why-section gh-why-section--ivory gh-why-section--after-hero"
          labelledBy="gh-why-place"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-why-split">
              <div className="gh-why-split__copy">
                <motion.p
                  className="gh-why-eyebrow gh-why-eyebrow--dark"
                  {...reveal(isInView, sectionReduce, 0, 10)}
                >
                  <BrandCurveMark className="gh-why-mark gh-why-mark--dark" isInView={isInView} />
                  <span>{t('whyLombok.page.place.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-why-place"
                  className="gh-why-title"
                  {...titleReveal(isInView, sectionReduce, 0.12)}
                >
                  {t('whyLombok.page.place.title')}
                </motion.h2>
                <motion.p
                  className="gh-why-body"
                  {...reveal(isInView, sectionReduce, 0.26, 12)}
                >
                  {t('whyLombok.page.place.body')}
                </motion.p>
              </div>
              <WhyShowcaseCard
                slides={placeSlides}
                badge={t('whyLombok.page.place.eyebrow')}
                title={t('whyLombok.page.place.cardTitle')}
                meta={t('whyLombok.page.place.location')}
                body={t('whyLombok.page.place.body')}
                imageAlt={t('whyLombok.page.place.imageAlt')}
                expandLabel={t('whyLombok.page.place.expand')}
                prevLabel={t('whyLombok.page.cardPrev')}
                nextLabel={t('whyLombok.page.cardNext')}
                closeLabel={t('navigation.close')}
                isInView={isInView}
                reduce={sectionReduce}
              />
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-why-section gh-why-section--forest"
          labelledBy="gh-why-south"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-why-south">
              <div className="gh-why-south__intro">
                <motion.p
                  className="gh-why-eyebrow"
                  {...reveal(isInView, sectionReduce, 0, 10)}
                >
                  <BrandCurveMark className="gh-why-mark" isInView={isInView} />
                  <span>{t('whyLombok.page.south.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-why-south"
                  className="gh-why-title gh-why-title--light"
                  aria-label={speakLines(t('whyLombok.page.south.title'))}
                  {...titleReveal(isInView, sectionReduce, 0.12)}
                >
                  {t('whyLombok.page.south.title')}
                </motion.h2>
                <motion.p
                  className="gh-why-body gh-why-body--light"
                  {...reveal(isInView, sectionReduce, 0.26, 12)}
                >
                  {t('whyLombok.page.south.body')}
                </motion.p>
                <motion.ul
                  className="gh-why-labels"
                  {...reveal(isInView, sectionReduce, 0.36, 10)}
                >
                  {SOUTH_LABELS.map((key) => (
                    <li key={key}>{t(`whyLombok.page.south.labels.${key}`)}</li>
                  ))}
                </motion.ul>
              </div>
              <motion.figure
                className="gh-why-south__media"
                initial={
                  sectionReduce
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 1.035 }
                }
                animate={isInView ? { opacity: 1, scale: 1 } : undefined}
                transition={{ duration: sectionReduce ? 0 : 1.05, delay: 0.14, ease: EASE }}
              >
                <img
                  src={south.src}
                  alt={t('whyLombok.page.south.imageAlt')}
                  width={1280}
                  height={720}
                  loading="lazy"
                  decoding="async"
                />
              </motion.figure>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-why-section gh-why-section--ivory gh-why-section--statement"
          labelledBy="gh-why-access"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-why-statement">
              <WhyShowcaseCard
                className="gh-why-statement__card"
                slides={accessSlides}
                badge={t('whyLombok.page.access.eyebrow')}
                title={t('whyLombok.page.access.cardTitle')}
                meta={t('whyLombok.page.access.aside')}
                body={t('whyLombok.page.access.body')}
                imageAlt={t('whyLombok.page.access.imageAlt')}
                expandLabel={t('whyLombok.page.access.expand')}
                prevLabel={t('whyLombok.page.cardPrev')}
                nextLabel={t('whyLombok.page.cardNext')}
                closeLabel={t('navigation.close')}
                isInView={isInView}
                reduce={sectionReduce}
              />
              <div className="gh-why-statement__copy">
                <motion.p
                  className="gh-why-eyebrow gh-why-eyebrow--dark"
                  {...reveal(isInView, sectionReduce, 0.08, 10)}
                >
                  <BrandCurveMark className="gh-why-mark gh-why-mark--dark" isInView={isInView} />
                  <span>{t('whyLombok.page.access.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-why-access"
                  className="gh-why-title gh-why-title--wide"
                  {...titleReveal(isInView, sectionReduce, 0.16)}
                >
                  {t('whyLombok.page.access.title')}
                </motion.h2>
                <motion.p
                  className="gh-why-body gh-why-body--measure"
                  {...reveal(isInView, sectionReduce, 0.28, 12)}
                >
                  {t('whyLombok.page.access.body')}
                </motion.p>
              </div>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-why-section gh-why-section--pace"
          labelledBy="gh-why-pace"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-why-immersive">
              <motion.figure
                className="gh-why-immersive__media"
                initial={
                  sectionReduce
                    ? { opacity: 1 }
                    : { opacity: 0, scale: 1.03 }
                }
                animate={isInView ? { opacity: 1, scale: 1 } : undefined}
                transition={{ duration: sectionReduce ? 0 : 1.15, ease: EASE }}
              >
                <img
                  src={pace.src}
                  alt={t('whyLombok.page.pace.imageAlt')}
                  width={1536}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                />
              </motion.figure>
              <div className="gh-why-immersive__copy">
                <motion.p
                  className="gh-why-eyebrow"
                  {...reveal(isInView, sectionReduce, 0.1, 10)}
                >
                  <BrandCurveMark className="gh-why-mark" isInView={isInView} />
                  <span>{t('whyLombok.page.pace.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-why-pace"
                  className="gh-why-title gh-why-title--light"
                  {...titleReveal(isInView, sectionReduce, 0.18)}
                >
                  {t('whyLombok.page.pace.title')}
                </motion.h2>
                <motion.p
                  className="gh-why-body gh-why-body--light"
                  {...reveal(isInView, sectionReduce, 0.3, 12)}
                >
                  {t('whyLombok.page.pace.body')}
                </motion.p>
              </div>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-why-section gh-why-section--ivory gh-why-section--statement"
          labelledBy="gh-why-longer"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-why-statement">
              <motion.figure
                className="gh-why-statement__media"
                initial={
                  sectionReduce
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 20 }
                }
                animate={isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: sectionReduce ? 0 : 0.95, delay: 0.06, ease: EASE }}
              >
                <img
                  src={longer.src}
                  alt={t('whyLombok.page.longer.imageAlt')}
                  width={1600}
                  height={1200}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption className="gh-why-statement__caption">
                  {t('whyLombok.page.longer.aside')}
                </figcaption>
              </motion.figure>
              <div className="gh-why-statement__copy">
                <motion.p
                  className="gh-why-eyebrow gh-why-eyebrow--dark"
                  {...reveal(isInView, sectionReduce, 0.08, 10)}
                >
                  <BrandCurveMark className="gh-why-mark gh-why-mark--dark" isInView={isInView} />
                  <span>{t('whyLombok.page.longer.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-why-longer"
                  className="gh-why-title gh-why-title--wide"
                  {...titleReveal(isInView, sectionReduce, 0.16)}
                >
                  {t('whyLombok.page.longer.title')}
                </motion.h2>
                <motion.p
                  className="gh-why-body gh-why-body--measure"
                  {...reveal(isInView, sectionReduce, 0.28, 12)}
                >
                  {t('whyLombok.page.longer.body')}
                </motion.p>
              </div>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-why-section gh-why-section--reece"
          labelledBy="gh-why-ground"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-why-reece">
              <motion.figure
                className="gh-why-reece__media"
                initial={
                  sectionReduce
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 24 }
                }
                animate={isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: sectionReduce ? 0 : 1.05, delay: 0.08, ease: EASE }}
              >
                <div className="gh-why-reece__frame">
                  <span className="gh-why-reece__bracket gh-why-reece__bracket--tl" aria-hidden />
                  <span className="gh-why-reece__bracket gh-why-reece__bracket--br" aria-hidden />
                  <div className="gh-why-reece__shot">
                    <img
                      src={portrait.src}
                      alt={t('whyLombok.page.ground.imageAlt')}
                      width={1087}
                      height={1447}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <figcaption className="gh-why-reece__caption">
                    <span className="gh-why-reece__caption-name">{t('founder.name')}</span>
                    <span className="gh-why-reece__caption-role">{t('founder.role')}</span>
                  </figcaption>
                </div>
              </motion.figure>

              <div className="gh-why-reece__copy">
                <div className="gh-why-reece__intro">
                  <motion.p
                    className="gh-why-eyebrow gh-why-eyebrow--dark"
                    {...reveal(isInView, sectionReduce, 0, 10)}
                  >
                    <BrandCurveMark className="gh-why-mark gh-why-mark--dark" isInView={isInView} />
                    <span>{t('whyLombok.page.ground.eyebrow')}</span>
                  </motion.p>
                  <motion.h2
                    id="gh-why-ground"
                    className="gh-why-title gh-why-reece__title"
                    aria-label={speakLines(t('whyLombok.page.ground.title'))}
                    {...titleReveal(isInView, sectionReduce, 0.12)}
                  >
                    {t('whyLombok.page.ground.title')
                      .split('|')
                      .map((line, index) => (
                        <span
                          key={line}
                          className={
                            index === 1
                              ? 'gh-why-title__line gh-why-reece__title-accent'
                              : 'gh-why-title__line'
                          }
                        >
                          {line}
                        </span>
                      ))}
                  </motion.h2>
                  <motion.p
                    className="gh-why-body gh-why-reece__body"
                    {...reveal(isInView, sectionReduce, 0.26, 12)}
                  >
                    {t('whyLombok.page.ground.body')}
                  </motion.p>
                </div>

                <div className="gh-why-reece__foot">
                  <motion.blockquote
                    className="gh-why-quote"
                    {...reveal(isInView, sectionReduce, 0.38, 10)}
                  >
                    <p>{t('whyLombok.page.ground.note')}</p>
                    <cite>{t('whyLombok.page.ground.attr')}</cite>
                  </motion.blockquote>
                  <Link to={enquireHref} className="gh-why-reece__cta">
                    <span>{t('whyLombok.page.talk')}</span>
                    <GhIconArrow size={14} aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </SectionReveal>

        <section className="gh-why-final" aria-labelledby="gh-why-final">
          <div className="gh-why-final__backdrop" aria-hidden>
            <img src={finalBackdrop} alt="" width={1536} height={1024} loading="lazy" decoding="async" />
          </div>
          <div className="gh-why-final__inner">
            <p className="gh-why-eyebrow gh-why-eyebrow--light">
              <BrandCurveMark className="gh-why-mark" isInView />
              <span>{t('whyLombok.page.final.eyebrow')}</span>
            </p>
            <h2 id="gh-why-final" className="gh-why-title gh-why-title--light">
              {t('whyLombok.page.final.title')}
            </h2>
            <p className="gh-why-body gh-why-body--light">{t('whyLombok.page.final.lead')}</p>
            <div className="gh-why-actions gh-why-actions--center">
              <Link className="gh-final__cta gh-final__cta--primary" to={archiveHref}>
                <span className="gh-final__cta-label">{t('whyLombok.page.explore')}</span>
                <GhIconArrow size={15} aria-hidden />
              </Link>
              <Link to={enquireHref} className="gh-final__cta gh-final__cta--secondary">
                <span className="gh-final__cta-label">{t('whyLombok.page.talk')}</span>
                <GhIconArrow size={14} aria-hidden />
              </Link>
              <Link className="gh-final__cta gh-final__cta--secondary" to={buyingHref}>
                <span className="gh-final__cta-label">{t('whyLombok.page.buying')}</span>
                <GhIconArrow size={14} aria-hidden />
              </Link>
            </div>
            <p className="gh-why-disclaimer">{t('whyLombok.page.disclaimer')}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default WhyLombok;
