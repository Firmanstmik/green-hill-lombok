import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Home,
  LandPlot,
  Layers,
  Lock,
  Scale,
  BriefcaseBusiness,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  Focus,
  DoorOpen,
  UserRound,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useFocusTrap } from '@/components/layout/useFocusTrap';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { GhIconArrow } from '@/components/brand/GhIcons';
import { HeroPlotMark } from '@/components/home/hero/HeroPlotMark';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInView } from '@/hooks/useInView';
import { generalWhatsAppLink, getPublicWhatsAppUrl } from '@/lib/contact';
import heroPortrait from '@/assets/greenhill/founder/green-hill-reece-green.webp';
import heroCutout from '@/assets/greenhill/founder/green-hill-reece-cutout.png';
import heroAtmosphere from '@/assets/greenhill/about-sec.webp';
import storyPhoto from '@/assets/greenhill/about-story-premium.webp';
import placePhoto from '@/assets/greenhill/about-place-premium.webp';
import placeBrandLogo2x from '@/assets/greenhill/hero/green-hill-logo-hero-stacked-hd-768.webp';
import placeBrandLogoPng from '@/assets/greenhill/hero/green-hill-logo-hero-stacked-hd-640.png';
import approachGroundPhoto from '@/assets/greenhill/source/reece-scooter-elevated-original.jpg';
import approachFeaturePhoto from '@/assets/greenhill/source/reece-suv-elevated-original.jpg';
import approachSelectivePhoto from '@/assets/greenhill/hero/green-hill-hero-land-light-1200.webp';
import approachLongTermPhoto from '@/assets/greenhill/land-holding.jpg';
import finalBackdrop from '@/assets/greenhill/bg-sec-talk-to-reece.webp';
import groundPhoto from '@/assets/greenhill/hero/green-hill-hero-on-the-ground-1506.webp';
import { useContentImage } from '@/content/hooks';

const EASE = [0.22, 1, 0.36, 1] as const;
const HERO_CARD_KEYS = ['ground', 'selective', 'relationship'] as const;
const PRINCIPLE_KEYS = ['ground', 'selective', 'relationship', 'longTerm'] as const;
const RELATION_KEYS = ['landowners', 'developers', 'notaries', 'professionals'] as const;
const RELATION_ICONS = {
  landowners: LandPlot,
  developers: Building2,
  notaries: Scale,
  professionals: BriefcaseBusiness,
} as const;
const SELECT_KEYS = [
  { key: 'land', to: 'properties' },
  { key: 'villas', to: 'properties' },
  { key: 'development', to: 'private' },
  { key: 'private', to: 'private' },
] as const;
const SELECT_ICONS = {
  land: LandPlot,
  villas: Home,
  development: Layers,
  private: Lock,
} as const;
const GROUND_POINT_KEYS = ['visited', 'selective', 'relationships', 'personal'] as const;
const GROUND_ICONS = {
  visited: MapPinned,
  selective: Focus,
  relationships: DoorOpen,
  personal: UserRound,
} as const;

const speakLines = (value: string) =>
  value
    .replace(/\|/g, ' ')
    .replace(/[~*.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

type HeroLineTone = 'quiet' | 'strong' | 'gold' | 'base';

function parseHeroLine(raw: string): { text: string; tone: HeroLineTone } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('*') && trimmed.endsWith('*') && trimmed.length > 2) {
    return { text: trimmed.slice(1, -1), tone: 'gold' };
  }
  if (trimmed.startsWith('~')) return { text: trimmed.slice(1), tone: 'strong' };
  if (trimmed.startsWith('.')) return { text: trimmed.slice(1), tone: 'quiet' };
  return { text: trimmed, tone: 'base' };
}

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
}: {
  children: (isInView: boolean, reduce: boolean) => ReactNode;
  className?: string;
  labelledBy?: string;
  threshold?: number;
}) {
  const { ref, isInView } = useInView({ threshold });
  const reduce = Boolean(useReducedMotion());
  return (
    <section className={className} aria-labelledby={labelledBy}>
      <div ref={ref}>{children(isInView, reduce)}</div>
    </section>
  );
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"][data-gh-about]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute('data-gh-about', '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

const About = () => {
  const heroBg = useContentImage('about.hero.background', heroAtmosphere);
  const story = useContentImage('about.story.photo', storyPhoto);
  const place = useContentImage('about.place.photo', placePhoto);
  const ground = useContentImage('about.ground.photo', groundPhoto);
  const seoImage = useContentImage('about.seo.image', heroPortrait);
  const feature = useContentImage('about.approach.feature', approachFeaturePhoto);
  const principleGround = useContentImage('about.approach.ground', approachGroundPhoto);
  const principleSelective = useContentImage('about.approach.selective', approachSelectivePhoto);
  const principleLongTerm = useContentImage('about.approach.longTerm', approachLongTermPhoto);
  const PRINCIPLE_PHOTOS = {
    ground: principleGround.src,
    selective: principleSelective.src,
    relationship: story.src,
    longTerm: principleLongTerm.src,
  };
  const RELATION_PHOTOS = {
    landowners: place.src,
    developers: feature.src,
    notaries: story.src,
    professionals: principleGround.src,
  };
  const { t, language } = useLanguage();
  const reduce = Boolean(useReducedMotion());
  const hero = useInView({ threshold: 0.2 });
  const whatsappUrl = getPublicWhatsAppUrl();
  const talkHref = `/${language}/#contact`;
  const archiveHref = `/${language}/properties`;
  const privateHref = `/${language}/private`;
  const whyHref = `/${language}/why-lombok`;

  const openTalk = () => {
    if (whatsappUrl) {
      window.open(generalWhatsAppLink(language), '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = talkHref;
  };

  const selectHref = (to: (typeof SELECT_KEYS)[number]['to']) =>
    to === 'private' ? privateHref : archiveHref;

  const [activeRelation, setActiveRelation] =
    useState<(typeof RELATION_KEYS)[number]>('landowners');
  const [relationView, setRelationView] = useState<(typeof RELATION_KEYS)[number] | null>(null);
  const [approachView, setApproachView] = useState<(typeof PRINCIPLE_KEYS)[number] | null>(null);
  const approachLightboxRef = useRef<HTMLDivElement>(null);
  const relationLightboxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(approachLightboxRef, approachView !== null);
  useFocusTrap(relationLightboxRef, relationView !== null);

  const approachViewIndex = approachView ? PRINCIPLE_KEYS.indexOf(approachView) : -1;
  const relationViewIndex = relationView ? RELATION_KEYS.indexOf(relationView) : -1;

  const closeApproachView = useCallback(() => setApproachView(null), []);
  const closeRelationView = useCallback(() => setRelationView(null), []);

  const openRelationDoor = useCallback((key: (typeof RELATION_KEYS)[number]) => {
    setApproachView(null);
    setActiveRelation(key);
    setRelationView(key);
  }, []);

  const openRelationTalk = useCallback(
    (key: (typeof RELATION_KEYS)[number]) => {
      const message = encodeURIComponent(t(`about.page.relations.prefills.${key}`));
      if (whatsappUrl) {
        window.open(`${whatsappUrl}?text=${message}`, '_blank', 'noopener,noreferrer');
        return;
      }
      window.location.href = talkHref;
    },
    [t, talkHref, whatsappUrl]
  );

  const showApproachPrev = useCallback(() => {
    setApproachView((current) => {
      if (!current) return current;
      const i = PRINCIPLE_KEYS.indexOf(current);
      return PRINCIPLE_KEYS[(i - 1 + PRINCIPLE_KEYS.length) % PRINCIPLE_KEYS.length];
    });
  }, []);

  const showApproachNext = useCallback(() => {
    setApproachView((current) => {
      if (!current) return current;
      const i = PRINCIPLE_KEYS.indexOf(current);
      return PRINCIPLE_KEYS[(i + 1) % PRINCIPLE_KEYS.length];
    });
  }, []);

  const showRelationPrev = useCallback(() => {
    setRelationView((current) => {
      if (!current) return current;
      const i = RELATION_KEYS.indexOf(current);
      const next = RELATION_KEYS[(i - 1 + RELATION_KEYS.length) % RELATION_KEYS.length];
      setActiveRelation(next);
      return next;
    });
  }, []);

  const showRelationNext = useCallback(() => {
    setRelationView((current) => {
      if (!current) return current;
      const i = RELATION_KEYS.indexOf(current);
      const next = RELATION_KEYS[(i + 1) % RELATION_KEYS.length];
      setActiveRelation(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!approachView && !relationView) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (approachView) closeApproachView();
        if (relationView) closeRelationView();
      }
      if (approachView) {
        if (e.key === 'ArrowLeft') showApproachPrev();
        if (e.key === 'ArrowRight') showApproachNext();
      }
      if (relationView) {
        if (e.key === 'ArrowLeft') showRelationPrev();
        if (e.key === 'ArrowRight') showRelationNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [
    approachView,
    relationView,
    closeApproachView,
    closeRelationView,
    showApproachPrev,
    showApproachNext,
    showRelationPrev,
    showRelationNext,
  ]);

  const relationTitle = t('about.page.relations.title');
  const relationTitleSplit = relationTitle.indexOf('. ');
  const relationTitleLead =
    relationTitleSplit > 0 ? relationTitle.slice(0, relationTitleSplit + 1) : relationTitle;
  const relationTitleFollow =
    relationTitleSplit > 0 ? relationTitle.slice(relationTitleSplit + 2) : '';

  const approachTitle = t('about.page.approach.title');
  const approachAccent = t('about.page.approach.titleAccent');
  const approachLeadLine = approachTitle.replace(approachAccent, '').trim();

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const title = t('about.page.seoTitle');
    const description = t('about.page.seoDescription');
    const canonical = `${window.location.origin}/${language}/about`;
    const image = new URL(seoImage.src, window.location.origin).href;

    document.title = title;
    document.documentElement.lang = language;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:url', canonical);

    let link = document.head.querySelector('link[rel="canonical"][data-gh-about]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('data-gh-about', '');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.head.querySelectorAll('[data-gh-about]').forEach((node) => node.remove());
    };
  }, [language, t]);

  const heroReveal = (delay: number, y = 12) =>
    reduce
      ? {
          initial: { opacity: 1, y: 0 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0 },
        }
      : {
          initial: { opacity: 0, y },
          animate: hero.isInView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y },
          transition: { duration: 0.75, delay, ease: EASE },
        };

  return (
    <div className="gh-about min-h-screen">
      <Navbar />

      <main>
        <header className="gh-about-hero" ref={hero.ref} aria-labelledby="gh-about-hero-heading">
          <div className="gh-about-hero__bg" aria-hidden>
            <img
              className="gh-about-hero__bg-img"
              src={heroBg.src}
              alt=""
              width={1920}
              height={1080}
              loading="eager"
              decoding="async"
            />
            <div className="gh-about-hero__veil" />
            <div className="gh-about-hero__grain" />
            <BrandCurveMark className="gh-about-hero__watermark" isInView={hero.isInView} />
          </div>

          <div className="gh-about-hero__stage">
            <div className="gh-about-hero__copy gh-hero-copy">
              <p className="gh-hero-eyebrow">
                <HeroPlotMark />
                <motion.span {...heroReveal(0.18, 8)}>{t('about.page.hero.eyebrow')}</motion.span>
              </p>

              <motion.h1
                id="gh-about-hero-heading"
                className="gh-hero-display"
                aria-label={speakLines(t('about.page.hero.headline'))}
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
                animate={hero.isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: reduce ? 0 : 0.95, delay: reduce ? 0 : 0.28, ease: EASE }}
              >
                {t('about.page.hero.headline')
                  .split('|')
                  .map((raw, index) => {
                    const { text, tone } = parseHeroLine(raw);
                    return (
                      <span key={`${tone}-${text}-${index}`} className="gh-hero-display__line">
                        <span className="gh-hero-display__reveal">
                          {tone === 'gold' ? <em>{text}</em> : text}
                        </span>
                      </span>
                    );
                  })}
              </motion.h1>

              <motion.p className="gh-hero-body" {...heroReveal(0.48, 10)}>
                {t('about.page.hero.lead')}
              </motion.p>

              <motion.div className="gh-hero-actions" {...heroReveal(0.58, 8)}>
                <button type="button" className="gh-hero-btn gh-hero-btn--primary" onClick={openTalk}>
                  <span className="gh-hero-btn__label">{t('about.page.talk')}</span>
                  <ArrowRight className="gh-hero-btn__arrow" size={15} strokeWidth={1.75} aria-hidden />
                </button>
                <Link className="gh-hero-btn gh-hero-btn--ghost" to={archiveHref}>
                  <span className="gh-hero-btn__label">{t('about.page.explore')}</span>
                  <ArrowUpRight className="gh-hero-btn__arrow" size={15} strokeWidth={1.75} aria-hidden />
                </Link>
              </motion.div>

              <motion.p className="gh-about-hero__sign" {...heroReveal(0.72, 6)}>
                <span className="gh-about-hero__sign-name">{t('about.page.hero.captionName')}</span>
                <span aria-hidden className="gh-about-hero__sign-dot" />
                <span className="gh-about-hero__sign-role">{t('about.page.hero.captionRole')}</span>
              </motion.p>
            </div>

            <div className="gh-about-hero__visual" aria-hidden={!hero.isInView}>
              <div className="gh-about-hero__blobs" aria-hidden>
                <span className="gh-about-hero__blob gh-about-hero__blob--a" />
                <span className="gh-about-hero__blob gh-about-hero__blob--b" />
                <span className="gh-about-hero__blob gh-about-hero__blob--c" />
              </div>

              <motion.figure
                className="gh-about-hero__cutout"
                initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
                animate={hero.isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: reduce ? 0.4 : 1.05, delay: reduce ? 0 : 0.22, ease: EASE }}
              >
                <img
                  src={heroCutout}
                  alt={t('about.page.hero.imageAlt')}
                  width={636}
                  height={1234}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                />
              </motion.figure>

              <ul className="gh-about-hero__cards">
                {HERO_CARD_KEYS.map((key, index) => (
                  <motion.li
                    key={key}
                    className={`gh-about-hero__card gh-about-hero__card--${index + 1}`}
                    tabIndex={0}
                    initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
                    animate={hero.isInView ? { opacity: 1, y: 0 } : undefined}
                    whileHover={reduce ? undefined : { y: -4 }}
                    whileFocus={reduce ? undefined : { y: -4 }}
                    transition={{
                      duration: reduce ? 0.3 : 0.55,
                      delay: reduce ? 0 : 0.48 + index * 0.1,
                      ease: EASE,
                    }}
                  >
                    <div className="gh-about-hero__card-head">
                      <span className="gh-about-hero__card-index" aria-hidden>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="gh-about-hero__card-rule" aria-hidden />
                    </div>
                    <p className="gh-about-hero__card-title">
                      {t(`about.page.hero.cards.${key}.title`)}
                    </p>
                    <p className="gh-about-hero__card-body">
                      {t(`about.page.hero.cards.${key}.body`)}
                    </p>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        <SectionReveal className="gh-about-section gh-about-section--ivory" labelledBy="gh-about-story">
          {(isInView, sectionReduce) => (
            <div className="gh-about-story">
              <div className="gh-about-story__layout">
                <motion.article
                  className="gh-about-story__feature"
                  initial={sectionReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
                  animate={isInView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: sectionReduce ? 0 : 0.95, delay: 0.08, ease: EASE }}
                >
                  <div className="gh-about-story__rail">
                    <div className="gh-about-story__rail-top">
                      <BrandCurveMark className="gh-about-story__rail-mark" isInView={isInView} />
                      <p className="gh-about-story__rail-label">{t('about.page.story.cardLabel')}</p>
                    </div>
                    <span className="gh-about-story__rail-note">{t('about.page.story.cardNote')}</span>
                  </div>
                  <figure className="gh-about-story__media">
                    <img
                      src={story.src}
                      alt={t('about.page.story.imageAlt')}
                      width={1152}
                      height={864}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                </motion.article>

                <div className="gh-about-story__copy">
                  <motion.p
                    className="gh-about-story__eyebrow"
                    {...reveal(isInView, sectionReduce, 0.12, 10)}
                  >
                    {t('about.page.story.eyebrow')}
                  </motion.p>
                  <motion.h2
                    id="gh-about-story"
                    className="gh-about-story__title"
                    aria-label={speakLines(t('about.page.story.title'))}
                    {...titleReveal(isInView, sectionReduce, 0.18)}
                  >
                    {t('about.page.story.title')
                      .split('|')
                      .map((line) => (
                        <span key={line} className="gh-about-story__title-line">
                          {line}
                        </span>
                      ))}
                  </motion.h2>
                  <motion.p
                    className="gh-about-story__lead"
                    {...reveal(isInView, sectionReduce, 0.28, 12)}
                  >
                    {t('about.page.story.p1')}
                  </motion.p>
                  <motion.span
                    className="gh-about-story__rule"
                    aria-hidden
                    {...reveal(isInView, sectionReduce, 0.34, 6)}
                  />
                  <motion.p
                    className="gh-about-story__body"
                    {...reveal(isInView, sectionReduce, 0.4, 12)}
                  >
                    {t('about.page.story.p2')}
                  </motion.p>
                  <motion.p
                    className="gh-about-story__body"
                    {...reveal(isInView, sectionReduce, 0.46, 12)}
                  >
                    {t('about.page.story.p3')}
                  </motion.p>
                </div>
              </div>

              <motion.blockquote className="gh-about-story__pull" {...reveal(isInView, sectionReduce, 0.52, 12)}>
                <p aria-label={speakLines(t('about.page.story.pull'))}>
                  {t('about.page.story.pull')
                    .split('|')
                    .map((line) => (
                      <span key={line} className="gh-about-story__pull-line">
                        {line}
                      </span>
                    ))}
                </p>
              </motion.blockquote>
            </div>
          )}
        </SectionReveal>

        <SectionReveal className="gh-about-section gh-about-section--place" labelledBy="gh-about-place">
          {(isInView, sectionReduce) => (
            <div className="gh-about-place">
              <div className="gh-about-place__visual" aria-hidden={!isInView}>
                <motion.img
                  className="gh-about-place__img"
                  src={place.src}
                  alt=""
                  width={1920}
                  height={1080}
                  loading="lazy"
                  decoding="async"
                  initial={sectionReduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.06 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : undefined}
                  transition={{ duration: sectionReduce ? 0 : 1.25, delay: 0.06, ease: EASE }}
                />
                <div className="gh-about-place__veil" />
              </div>

              <div className="gh-about-place__brand" aria-hidden>
                <picture>
                  <source type="image/webp" srcSet={placeBrandLogo2x} />
                  <img
                    className="gh-about-place__brand-logo"
                    src={placeBrandLogoPng}
                    alt=""
                    width={768}
                    height={579}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </div>

              <div className="gh-about-place__stage">
                <div className="gh-about-place__copy">
                  <motion.p className="gh-about-place__eyebrow" {...reveal(isInView, sectionReduce, 0.08, 10)}>
                    <BrandCurveMark className="gh-about-place__mark" isInView={isInView} />
                    <span>{t('about.page.place.eyebrow')}</span>
                  </motion.p>
                  <motion.h2
                    id="gh-about-place"
                    className="gh-about-place__title"
                    {...titleReveal(isInView, sectionReduce, 0.14)}
                  >
                    {t('about.page.place.title')}
                  </motion.h2>
                  <motion.p className="gh-about-place__body" {...reveal(isInView, sectionReduce, 0.26, 12)}>
                    {t('about.page.place.body')}
                  </motion.p>
                  <motion.div className="gh-about-place__actions" {...reveal(isInView, sectionReduce, 0.34, 8)}>
                    <Link className="gh-hero-btn gh-hero-btn--ghost" to={whyHref}>
                      <span className="gh-hero-btn__label">{t('about.page.place.link')}</span>
                      <ArrowRight className="gh-hero-btn__arrow" size={15} strokeWidth={1.75} aria-hidden />
                    </Link>
                  </motion.div>

                  <motion.aside
                    className="gh-about-place__meta"
                    aria-label={`${t('about.page.place.location')}, ${t('about.page.place.region')}`}
                    {...reveal(isInView, sectionReduce, 0.42, 10)}
                  >
                    <span className="gh-about-place__meta-index" aria-hidden>02</span>
                    <span className="gh-about-place__meta-rule" aria-hidden />
                    <span className="gh-about-place__meta-loc">{t('about.page.place.location')}</span>
                    <span className="gh-about-place__meta-region">{t('about.page.place.region')}</span>
                  </motion.aside>
                </div>
              </div>

              <span className="sr-only">{t('about.page.place.imageAlt')}</span>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-about-section gh-about-section--ivory gh-about-section--relations"
          labelledBy="gh-about-relations"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-about-relations">
              <div className="gh-about-relations__intro">
                <motion.p
                  className="gh-about-relations__eyebrow"
                  {...reveal(isInView, sectionReduce, 0, 10)}
                >
                  <BrandCurveMark className="gh-about-relations__mark" isInView={isInView} />
                  <span>{t('about.page.relations.eyebrow')}</span>
                </motion.p>

                <motion.h2
                  id="gh-about-relations"
                  className="gh-about-relations__title"
                  {...titleReveal(isInView, sectionReduce, 0.1)}
                >
                  <span className="gh-about-relations__title-lead">{relationTitleLead}</span>
                  {relationTitleFollow ? (
                    <span className="gh-about-relations__title-follow">{relationTitleFollow}</span>
                  ) : null}
                </motion.h2>

                <motion.p
                  className="gh-about-relations__body"
                  {...reveal(isInView, sectionReduce, 0.22, 12)}
                >
                  {t('about.page.relations.body')}
                </motion.p>
              </div>

              <motion.div
                className="gh-about-relations__cards"
                role="group"
                aria-label={t('about.page.relations.eyebrow')}
                {...reveal(isInView, sectionReduce, 0.3, 14)}
              >
                {RELATION_KEYS.map((key, index) => {
                  const active = activeRelation === key;
                  const Icon = RELATION_ICONS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={
                        active
                          ? 'gh-about-relations__card is-active'
                          : 'gh-about-relations__card'
                      }
                      aria-pressed={active}
                      onClick={() => openRelationDoor(key)}
                      onFocus={() => setActiveRelation(key)}
                      onMouseEnter={() => {
                        if (!sectionReduce) setActiveRelation(key);
                      }}
                    >
                      <span className="gh-about-relations__card-top">
                        <span className="gh-about-relations__card-icon" aria-hidden>
                          <Icon size={22} strokeWidth={1.4} />
                        </span>
                        <span className="gh-about-relations__card-more" aria-hidden>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </span>

                      <span className="gh-about-relations__card-title">
                        {t(`about.page.relations.labels.${key}`)}
                      </span>
                      <span className="gh-about-relations__card-body">
                        {t(`about.page.relations.cards.${key}`)}
                      </span>

                      <span className="gh-about-relations__card-action">
                        <span className="gh-about-relations__card-action-label">
                          {t('about.page.relations.cardAction')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-about-section gh-about-section--white gh-about-section--approach"
          labelledBy="gh-about-approach"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-about-approach">
              <div className="gh-about-approach__head">
                <motion.div {...reveal(isInView, sectionReduce, 0, 12)}>
                  <p className="gh-about-approach__eyebrow">
                    <BrandCurveMark className="gh-about-approach__mark" isInView={isInView} />
                    <span>{t('about.page.approach.eyebrow')}</span>
                  </p>
                  <h2 id="gh-about-approach" className="gh-about-approach__title">
                    <span className="gh-about-approach__title-lead">{approachLeadLine}</span>{' '}
                    <span className="gh-about-approach__title-accent">{approachAccent}</span>
                  </h2>
                </motion.div>
                <motion.p
                  className="gh-about-approach__lead"
                  {...reveal(isInView, sectionReduce, 0.12, 12)}
                >
                  {t('about.page.approach.lead')}
                </motion.p>
              </div>

              <div className="gh-about-approach__gallery">
                <motion.article
                  className="gh-about-approach__feature"
                  initial={sectionReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                  animate={isInView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: sectionReduce ? 0 : 0.95, delay: 0.16, ease: EASE }}
                >
                  <img
                    src={feature.src}
                    alt={t('about.page.approach.featureAlt')}
                    width={1200}
                    height={1500}
                    loading="lazy"
                    decoding="async"
                  />
                  <button
                    type="button"
                    className="gh-about-approach__chip"
                    onClick={() => {
                      setRelationView(null);
                      setApproachView('ground');
                    }}
                    aria-label={`${t('about.page.approach.view')} ${t('about.page.approach.items.ground.title')}`}
                  >
                    <Maximize2 size={15} strokeWidth={1.75} aria-hidden />
                  </button>
                  <div className="gh-about-approach__plate">
                    <div className="gh-about-approach__plate-copy">
                      <p className="gh-about-approach__plate-title">
                        {t('about.page.approach.items.ground.title')}
                      </p>
                      <p className="gh-about-approach__plate-body">
                        {t('about.page.approach.items.ground.body')}
                      </p>
                    </div>
                    <div className="gh-about-approach__plate-aside">
                      <button
                        type="button"
                        className="gh-about-approach__plate-btn"
                        onClick={openTalk}
                        aria-label={t('about.page.talk')}
                      >
                        <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden />
                      </button>
                      <p className="gh-about-approach__plate-meta">
                        {PRINCIPLE_KEYS.map((key, index) => (
                          <span key={key}>
                            {index > 0 ? <span aria-hidden> | </span> : null}
                            {t(`about.page.approach.items.${key}.title`)}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                </motion.article>

                <div className="gh-about-approach__grid">
                  {PRINCIPLE_KEYS.map((key, index) => (
                    <motion.article
                      key={key}
                      className="gh-about-approach__tile"
                      {...reveal(isInView, sectionReduce, 0.22 + index * 0.06, 14)}
                    >
                      <img
                        src={PRINCIPLE_PHOTOS[key]}
                        alt=""
                        width={800}
                        height={800}
                        loading="lazy"
                        decoding="async"
                      />
                      <button
                        type="button"
                        className="gh-about-approach__tile-trigger"
                        onClick={() => {
                          setRelationView(null);
                          setApproachView(key);
                        }}
                        aria-label={`${t('about.page.approach.view')} ${t(`about.page.approach.items.${key}.title`)}`}
                      >
                        <span className="gh-about-approach__tile-chip" aria-hidden>
                          <Maximize2 size={14} strokeWidth={1.75} />
                        </span>
                        <span className="gh-about-approach__tile-info">
                          <span className="gh-about-approach__tile-index" aria-hidden>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="gh-about-approach__tile-title">
                            {t(`about.page.approach.items.${key}.title`)}
                          </span>
                          <span className="gh-about-approach__tile-body">
                            {t(`about.page.approach.items.${key}.body`)}
                          </span>
                        </span>
                      </button>
                    </motion.article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-about-section gh-about-section--ivory gh-about-section--selects"
          labelledBy="gh-about-selects"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-about-selects">
              <div className="gh-about-selects__intro">
                <motion.p
                  className="gh-about-selects__eyebrow"
                  {...reveal(isInView, sectionReduce, 0, 10)}
                >
                  <BrandCurveMark className="gh-about-selects__mark" isInView={isInView} />
                  <span>{t('about.page.selects.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-about-selects"
                  className="gh-about-selects__title"
                  {...titleReveal(isInView, sectionReduce, 0.1)}
                >
                  {t('about.page.selects.title')}
                </motion.h2>
                <motion.p
                  className="gh-about-selects__lead"
                  {...reveal(isInView, sectionReduce, 0.2, 12)}
                >
                  {t('about.page.selects.body')}
                </motion.p>
              </div>

              <ul className="gh-about-selects__list">
                {SELECT_KEYS.map((item, index) => {
                  const Icon = SELECT_ICONS[item.key];
                  return (
                    <motion.li key={item.key} {...reveal(isInView, sectionReduce, 0.26 + index * 0.06, 12)}>
                      <Link className="gh-about-selects__col" to={selectHref(item.to)}>
                        <span className="gh-about-selects__icon" aria-hidden>
                          <Icon size={36} strokeWidth={1.25} />
                        </span>
                        <span className="gh-about-selects__label">
                          {t(`about.page.selects.items.${item.key}.title`)}
                        </span>
                        <span className="gh-about-selects__desc">
                          {t(`about.page.selects.items.${item.key}.body`)}
                        </span>
                        <span className="gh-about-selects__action">
                          {t('about.page.selects.action')}
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </SectionReveal>

        <SectionReveal className="gh-about-section gh-about-section--ground" labelledBy="gh-about-ground">
          {(isInView, sectionReduce) => {
            const groundTitle = t('about.page.ground.title');
            const groundLines = groundTitle.split('|');
            return (
            <div className="gh-about-ground">
              <div className="gh-about-ground__copy">
                <motion.p
                  className="gh-about-ground__eyebrow"
                  {...reveal(isInView, sectionReduce, 0, 10)}
                >
                  <BrandCurveMark className="gh-about-ground__mark" isInView={isInView} />
                  <span>{t('about.page.ground.eyebrow')}</span>
                </motion.p>

                <motion.h2
                  id="gh-about-ground"
                  className="gh-about-ground__title"
                  aria-label={speakLines(groundTitle)}
                  {...titleReveal(isInView, sectionReduce, 0.1)}
                >
                  {groundLines.map((line, index) => (
                    <span
                      key={line}
                      className={
                        index === groundLines.length - 1 && groundLines.length > 1
                          ? 'gh-about-ground__title-line gh-about-ground__title-line--accent'
                          : 'gh-about-ground__title-line'
                      }
                    >
                      {line}
                    </span>
                  ))}
                </motion.h2>

                <motion.p
                  className="gh-about-ground__body"
                  {...reveal(isInView, sectionReduce, 0.18, 12)}
                >
                  {t('about.page.ground.body')}
                </motion.p>

                <motion.div
                  className="gh-about-ground__offer"
                  {...reveal(isInView, sectionReduce, 0.24, 8)}
                >
                  <p className="gh-about-ground__offer-label">{t('about.page.ground.offer')}</p>
                  <span className="gh-about-ground__offer-rule" aria-hidden />
                </motion.div>

                <motion.ul
                  className="gh-about-ground__cards"
                  {...reveal(isInView, sectionReduce, 0.3, 12)}
                >
                  {GROUND_POINT_KEYS.map((key) => {
                    const Icon = GROUND_ICONS[key];
                    return (
                      <li key={key} className="gh-about-ground__card">
                        <span className="gh-about-ground__card-icon" aria-hidden>
                          <Icon size={18} strokeWidth={1.6} />
                        </span>
                        <span className="gh-about-ground__card-copy">
                          <span className="gh-about-ground__card-title">
                            {t(`about.page.ground.points.${key}.title`)}
                          </span>
                          <span className="gh-about-ground__card-body">
                            {t(`about.page.ground.points.${key}.body`)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </motion.ul>

                <motion.div {...reveal(isInView, sectionReduce, 0.4, 8)}>
                  <Link className="gh-about-ground__cta" to={archiveHref}>
                    <span>{t('about.page.ground.cta')}</span>
                    <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
                  </Link>
                </motion.div>
              </div>

              <motion.div
                className="gh-about-ground__visual"
                initial={sectionReduce ? false : { opacity: 0, y: 18 }}
                animate={isInView || sectionReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                transition={{ duration: sectionReduce ? 0 : 0.95, delay: 0.14, ease: EASE }}
              >
                <div className="gh-about-ground__visual-lines" aria-hidden />

                <figure className="gh-about-ground__media gh-about-ground__media--main">
                  <img
                    src={ground.src}
                    alt={t('about.page.ground.imageAlt')}
                    width={1600}
                    height={2000}
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    <span>{t('about.page.ground.captionName')}</span>
                    <span>{t('about.page.ground.captionRole')}</span>
                  </figcaption>
                </figure>

                <figure className="gh-about-ground__media gh-about-ground__media--inset">
                  <img
                    src={place.src}
                    alt={t('about.page.ground.insetAlt')}
                    width={900}
                    height={700}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>

                <div className="gh-about-ground__badge" aria-hidden>
                  <span className="gh-about-ground__badge-value">{t('about.page.ground.badgeValue')}</span>
                  <span className="gh-about-ground__badge-label">{t('about.page.ground.badgeLabel')}</span>
                </div>
              </motion.div>
            </div>
            );
          }}
        </SectionReveal>

        <SectionReveal
          className="gh-about-section gh-about-section--ivory gh-about-section--converse"
          labelledBy="gh-about-converse"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-about-converse">
              <motion.p
                className="gh-about-eyebrow gh-about-eyebrow--dark"
                {...reveal(isInView, sectionReduce, 0, 10)}
              >
                <BrandCurveMark className="gh-about-mark gh-about-mark--dark" isInView={isInView} />
                <span>{t('about.page.converse.eyebrow')}</span>
              </motion.p>
              <motion.h2
                id="gh-about-converse"
                className="gh-about-title"
                {...titleReveal(isInView, sectionReduce, 0.1)}
              >
                {t('about.page.converse.title')}
              </motion.h2>
              <motion.p className="gh-about-body gh-about-body--measure" {...reveal(isInView, sectionReduce, 0.22, 12)}>
                {t('about.page.converse.body')}
              </motion.p>
              <div className="gh-about-actions gh-about-actions--center">
                <motion.div {...reveal(isInView, sectionReduce, 0.32, 8)}>
                  <button type="button" className="gh-final__cta gh-final__cta--primary gh-about-cta--forest" onClick={openTalk}>
                    <span className="gh-final__cta-label">{t('about.page.talk')}</span>
                    <GhIconArrow size={15} aria-hidden />
                  </button>
                </motion.div>
                <motion.div {...reveal(isInView, sectionReduce, 0.38, 8)}>
                  <Link className="gh-final__cta gh-final__cta--secondary gh-about-cta--dark" to={archiveHref}>
                    <span className="gh-final__cta-label">{t('about.page.explore')}</span>
                    <GhIconArrow size={14} aria-hidden />
                  </Link>
                </motion.div>
              </div>
            </div>
          )}
        </SectionReveal>

        <section className="gh-about-final" aria-labelledby="gh-about-final">
          <div className="gh-about-final__backdrop" aria-hidden>
            <img src={finalBackdrop} alt="" width={1536} height={1024} loading="lazy" decoding="async" />
          </div>
          <div className="gh-about-final__inner">
            <p className="gh-about-eyebrow gh-about-eyebrow--light">
              <BrandCurveMark className="gh-about-mark" isInView />
              <span>{t('about.page.final.eyebrow')}</span>
            </p>
            <h2 id="gh-about-final" className="gh-about-title gh-about-title--light">
              {t('about.page.final.title')}
            </h2>
            <p className="gh-about-body gh-about-body--light">{t('about.page.final.lead')}</p>
            <div className="gh-about-actions gh-about-actions--center">
              <button type="button" className="gh-final__cta gh-final__cta--primary" onClick={openTalk}>
                <span className="gh-final__cta-label">{t('about.page.talk')}</span>
                <GhIconArrow size={15} aria-hidden />
              </button>
              <Link className="gh-final__cta gh-final__cta--secondary" to={archiveHref}>
                <span className="gh-final__cta-label">{t('about.page.explore')}</span>
                <GhIconArrow size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {approachView ? (
              <motion.div
                key="approach-lightbox"
                className="gh-about-approach-lightbox"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gh-about-approach-lightbox-title"
                initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                onClick={closeApproachView}
              >
                <div
                  ref={approachLightboxRef}
                  className="gh-about-approach-lightbox__stage"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={approachView}
                      className="gh-about-approach-lightbox__frame"
                      initial={reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.97, y: 14 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.985, y: -8 }}
                      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                    >
                      <img
                        className="gh-about-approach-lightbox__img"
                        src={PRINCIPLE_PHOTOS[approachView]}
                        alt=""
                        width={1600}
                        height={1200}
                      />
                      <div className="gh-about-approach-lightbox__veil" aria-hidden />
                      <div className="gh-about-approach-lightbox__copy">
                        <p className="gh-about-approach-lightbox__index" aria-hidden>
                          {String(approachViewIndex + 1).padStart(2, '0')}
                        </p>
                        <h3 id="gh-about-approach-lightbox-title" className="gh-about-approach-lightbox__title">
                          {t(`about.page.approach.items.${approachView}.title`)}
                        </h3>
                        <p className="gh-about-approach-lightbox__body">
                          {t(`about.page.approach.items.${approachView}.body`)}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <button
                    type="button"
                    className="gh-about-approach-lightbox__close"
                    onClick={closeApproachView}
                    aria-label={t('navigation.close')}
                  >
                    <X size={20} strokeWidth={1.75} aria-hidden />
                  </button>

                  <button
                    type="button"
                    className="gh-about-approach-lightbox__nav gh-about-approach-lightbox__nav--prev"
                    onClick={showApproachPrev}
                    aria-label={t('about.page.approach.prev')}
                  >
                    <ChevronLeft size={26} strokeWidth={1.6} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="gh-about-approach-lightbox__nav gh-about-approach-lightbox__nav--next"
                    onClick={showApproachNext}
                    aria-label={t('about.page.approach.next')}
                  >
                    <ChevronRight size={26} strokeWidth={1.6} aria-hidden />
                  </button>
                </div>
              </motion.div>
            ) : null}

            {relationView ? (
              <motion.div
                key="relation-door"
                className="gh-about-approach-lightbox"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gh-about-relation-door-title"
                initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                onClick={closeRelationView}
              >
                <div
                  ref={relationLightboxRef}
                  className="gh-about-approach-lightbox__stage"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={relationView}
                      className="gh-about-approach-lightbox__frame"
                      initial={reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.97, y: 14 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={reduce ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.985, y: -8 }}
                      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
                    >
                      <img
                        className="gh-about-approach-lightbox__img"
                        src={RELATION_PHOTOS[relationView]}
                        alt=""
                        width={1600}
                        height={1200}
                      />
                      <div className="gh-about-approach-lightbox__veil" aria-hidden />
                      <div className="gh-about-approach-lightbox__copy">
                        <p className="gh-about-approach-lightbox__index" aria-hidden>
                          {String(relationViewIndex + 1).padStart(2, '0')}
                        </p>
                        <h3 id="gh-about-relation-door-title" className="gh-about-approach-lightbox__title">
                          {t(`about.page.relations.labels.${relationView}`)}
                        </h3>
                        <p className="gh-about-approach-lightbox__body">
                          {t(`about.page.relations.cards.${relationView}`)}
                        </p>
                        <p className="gh-about-approach-lightbox__note">
                          {t('about.page.relations.doorNote')}
                        </p>
                        <button
                          type="button"
                          className="gh-about-approach-lightbox__cta"
                          onClick={() => openRelationTalk(relationView)}
                        >
                          <span>{t('about.page.relations.doorCta')}</span>
                          <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden />
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <button
                    type="button"
                    className="gh-about-approach-lightbox__close"
                    onClick={closeRelationView}
                    aria-label={t('navigation.close')}
                  >
                    <X size={20} strokeWidth={1.75} aria-hidden />
                  </button>

                  <button
                    type="button"
                    className="gh-about-approach-lightbox__nav gh-about-approach-lightbox__nav--prev"
                    onClick={showRelationPrev}
                    aria-label={t('about.page.relations.prev')}
                  >
                    <ChevronLeft size={26} strokeWidth={1.6} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="gh-about-approach-lightbox__nav gh-about-approach-lightbox__nav--next"
                    onClick={showRelationNext}
                    aria-label={t('about.page.relations.next')}
                  >
                    <ChevronRight size={26} strokeWidth={1.6} aria-hidden />
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )}

      <Footer />
    </div>
  );
};

export default About;
