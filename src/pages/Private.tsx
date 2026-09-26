import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import {
  GhIconArrow,
  GhIconConverse,
  GhIconHills,
  GhIconLetter,
  GhIconPlace,
  GhIconSeal,
  GhIconViewfinder,
} from '@/components/brand/GhIcons';
import { isPrivateOpportunity } from '@/components/properties/opportunityMeta';
import { demoOpportunities as mockProperties, type Property } from '@/data/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInView } from '@/hooks/useInView';
import { generalWhatsAppLink, getPublicWhatsAppUrl } from '@/lib/contact';
import { isSupabaseConfigured } from '@/lib/supabase';
import { privateOpportunityCount } from '@/lib/publicOpportunities';
import { InvestorProfileForm } from '@/components/enquiry/InvestorProfileForm';
import { OpportunityCard } from '@/components/properties/OpportunityCard';
import { fetchPrivateTeasers, type TeaserRow } from '@/lib/privateTeasers';
import privateHeroPhoto from '@/assets/greenhill/green-hill-private.webp';
import talkBackdrop from '@/assets/greenhill/bg-sec-talk-to-reece.webp';
import founderPortrait from '@/assets/greenhill/founder/green-hill-reece-green.webp';
import whyLandscape from '@/assets/greenhill/gh-private-why-landscape.jpg';
import landHolding from '@/assets/greenhill/land-holding.jpg';
import approachBackdrop from '@/assets/greenhill/hero-hills.webp';
import villaPool from '@/assets/greenhill/villa-pool.jpg';
import { useContentImage } from '@/content/hooks';

const EASE = [0.22, 1, 0.36, 1] as const;

const AUDIENCE_KEYS = ['investors', 'developers', 'hospitality', 'groups'] as const;
const AUDIENCE_ICONS = {
  investors: GhIconSeal,
  developers: GhIconHills,
  hospitality: GhIconPlace,
  groups: GhIconConverse,
} as const;
const AUDIENCE_PHOTOS = {
  investors: landHolding,
  developers: whyLandscape,
  hospitality: villaPool,
  groups: privateHeroPhoto,
} as const;
const APPROACH_KEYS = ['understand', 'consider', 'explore', 'discuss'] as const;
const APPROACH_ICONS = {
  understand: GhIconConverse,
  consider: GhIconViewfinder,
  explore: GhIconHills,
  discuss: GhIconLetter,
} as const;
const PROMPT_KEYS = ['land', 'hospitality', 'development', 'brief'] as const;
const TYPE_KEYS = ['land', 'hospitality', 'development', 'investment', 'other'] as const;

type EnquiryType = (typeof TYPE_KEYS)[number];

/** Speak pipe-broken editorial lines as one readable phrase for assistive tech. */
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
    transition: { duration: 0.72, delay, ease: EASE },
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
    initial: { opacity: 0, y: 16, clipPath: 'inset(0 0 100% 0)' },
    animate: inView
      ? { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }
      : { opacity: 0, y: 16, clipPath: 'inset(0 0 100% 0)' },
    transition: { duration: 0.8, delay, ease: EASE },
  };
}

function SectionReveal({
  children,
  className,
  labelledBy,
  threshold = 0.18,
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

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"][data-gh-priv]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute('data-gh-priv', '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

const Private = () => {
  const heroImage = useContentImage('private.hero', privateHeroPhoto);
  const whyImage = useContentImage('private.why', whyLandscape);
  const seoImage = useContentImage('private.seo.image', privateHeroPhoto);
  const portrait = useContentImage('site.reece.portrait', founderPortrait);
  const { t, language } = useLanguage();
  const reduce = Boolean(useReducedMotion());
  const hero = useInView({ threshold: 0.2 });
  const final = useInView({ threshold: 0.22 });
  const formRef = useRef<HTMLDivElement>(null);
  const [privateCount, setPrivateCount] = useState(0);
  const [teasers, setTeasers] = useState<TeaserRow[]>([]);
  // A prompt elsewhere on the page pre-selects an interest in the qualification form.
  const [preset, setPreset] = useState<{ interest: string | null; n: number }>({ interest: null, n: 0 });
  const [activeAudience, setActiveAudience] =
    useState<(typeof AUDIENCE_KEYS)[number]>('investors');
  const [audiencePaused, setAudiencePaused] = useState(false);

  const talkHref = `/${language}/#contact`;
  const archiveHref = `/${language}/properties`;
  const whatsappUrl = getPublicWhatsAppUrl();

  const audienceIndex = AUDIENCE_KEYS.indexOf(activeAudience);

  const showAudiencePrev = useCallback(() => {
    setActiveAudience((current) => {
      const i = AUDIENCE_KEYS.indexOf(current);
      return AUDIENCE_KEYS[(i - 1 + AUDIENCE_KEYS.length) % AUDIENCE_KEYS.length];
    });
  }, []);

  const showAudienceNext = useCallback(() => {
    setActiveAudience((current) => {
      const i = AUDIENCE_KEYS.indexOf(current);
      return AUDIENCE_KEYS[(i + 1) % AUDIENCE_KEYS.length];
    });
  }, []);

  useEffect(() => {
    if (reduce || audiencePaused) return;
    const timer = window.setInterval(() => {
      setActiveAudience((current) => {
        const i = AUDIENCE_KEYS.indexOf(current);
        return AUDIENCE_KEYS[(i + 1) % AUDIENCE_KEYS.length];
      });
    }, 4800);
    return () => window.clearInterval(timer);
  }, [reduce, audiencePaused, activeAudience]);

  useEffect(() => {
    let active = true;

    const apply = (list: Property[]) => {
      if (!active) return;
      setPrivateCount(list.filter(isPrivateOpportunity).length);
    };

    if (!isSupabaseConfigured) {
      apply(mockProperties);
      // Development preview only: teasers from the local admin store.
      void fetchPrivateTeasers().then((list) => {
        if (active) setTeasers(list);
      });
      return () => {
        active = false;
      };
    }

    // Private records are never sent to the browser; only the count, and the
    // teasers Reece chose to present (disclosed fields only), are.
    const load = async () => {
      const [count, list] = await Promise.all([privateOpportunityCount(), fetchPrivateTeasers()]);
      if (!active) return;
      setPrivateCount(count);
      setTeasers(list);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const title = t('private.page.seoTitle');
    const description = t('private.page.seoDescription');
    const canonical = `${window.location.origin}/${language}/private`;
    const image = new URL(seoImage.src, window.location.origin).href;

    document.title = title;
    document.documentElement.lang = language;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:url', canonical);

    let link = document.head.querySelector('link[rel="canonical"][data-gh-priv]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('data-gh-priv', '');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.head.querySelectorAll('[data-gh-priv]').forEach((node) => node.remove());
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

  /** Brief §21 interests that match the page's prompts. */
  const PRESET_INTEREST: Record<EnquiryType, string | null> = {
    land: 'Land banking',
    hospitality: 'Hospitality',
    development: 'Development',
    investment: null,
    other: null,
  };

  const continueToEnquiry = (type: EnquiryType) => {
    setPreset((current) => ({ interest: PRESET_INTEREST[type], n: current.n + 1 }));
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'center',
      });
    });
  };

  const audienceIntent: Record<(typeof AUDIENCE_KEYS)[number], EnquiryType> = {
    investors: 'investment',
    developers: 'development',
    hospitality: 'hospitality',
    groups: 'investment',
  };

  const promptIntent: Record<(typeof PROMPT_KEYS)[number], EnquiryType> = {
    land: 'land',
    hospitality: 'hospitality',
    development: 'development',
    brief: 'other',
  };

  const openTalk = () => {
    if (whatsappUrl) {
      window.open(generalWhatsAppLink(language), '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = talkHref;
  };

  return (
    <div className="gh-priv min-h-screen">
      <Navbar />

      <main>
        <header className="gh-priv-hero" ref={hero.ref}>
          <div className="gh-priv-hero__copy">
            <p className="gh-priv-eyebrow">
              <BrandCurveMark className="gh-priv-mark" isInView={hero.isInView} />
              <motion.span {...heroReveal(0.16, 8)}>{t('private.page.eyebrow')}</motion.span>
            </p>
            <motion.h1
              className="gh-priv-hero__title"
              aria-label={speakLines(t('private.page.headline'))}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18, clipPath: 'inset(0 0 100% 0)' }}
              animate={
                hero.isInView
                  ? { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }
                  : undefined
              }
              transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.25, ease: EASE }}
            >
              {t('private.page.headline')
                .split('|')
                .map((line) => (
                  <span key={line} className="gh-priv-hero__line">
                    {line}
                  </span>
                ))}
            </motion.h1>
            <motion.div className="gh-priv-hero__lead" {...heroReveal(0.42, 10)}>
              {t('private.page.lead')
                .split('|')
                .map((line) => (
                  <p key={line}>{line}</p>
                ))}
            </motion.div>
            <div className="gh-priv-actions">
              <motion.button
                type="button"
                className="gh-final__cta gh-final__cta--primary"
                onClick={openTalk}
                {...heroReveal(0.54, 8)}
              >
                <span className="gh-final__cta-label">{t('private.page.talk')}</span>
                <GhIconArrow size={15} aria-hidden />
              </motion.button>
              <motion.div {...heroReveal(0.62, 8)}>
                <Link className="gh-final__cta gh-final__cta--secondary" to={archiveHref}>
                  <span className="gh-final__cta-label">{t('private.page.explore')}</span>
                  <GhIconArrow size={14} aria-hidden />
                </Link>
              </motion.div>
            </div>
          </div>
          <motion.figure
            className="gh-priv-hero__media"
            initial={
              reduce
                ? { opacity: 1, scale: 1, clipPath: 'inset(0 0 0% 0)' }
                : { opacity: 0, scale: 1.03, clipPath: 'inset(0 0 8% 0)' }
            }
            animate={
              hero.isInView
                ? { opacity: 1, scale: 1, clipPath: 'inset(0 0 0% 0)' }
                : undefined
            }
            transition={{ duration: reduce ? 0 : 1.15, delay: reduce ? 0 : 0.05, ease: EASE }}
          >
            <span className="gh-priv-hero__mat" aria-hidden />
            <div className="gh-priv-hero__shot">
              <img
                src={heroImage.src}
                alt={t('private.page.heroAlt')}
                width={1440}
                height={1092}
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
            </div>
            <span className="gh-priv-hero__veil" aria-hidden />
            <span className="gh-priv-hero__sheen" aria-hidden />
            <p className="gh-priv-hero__spine" aria-hidden>
              <span>{t('private.page.heroSpine')}</span>
            </p>
            <figcaption className="gh-priv-hero__caption">
              <BrandCurveMark className="gh-priv-hero__caption-mark" isInView={hero.isInView} />
              <span>{t('private.page.heroCaption')}</span>
            </figcaption>
          </motion.figure>
        </header>

        <SectionReveal
          className="gh-priv-section gh-priv-section--ivory gh-priv-section--audience"
          labelledBy="gh-priv-audience"
        >
          {(isInView, sectionReduce) => {
            const audienceTitle = t('private.page.audience.title');
            const audienceLines = audienceTitle.split('|');
            const ActiveIcon = AUDIENCE_ICONS[activeAudience];
            return (
              <div className="gh-priv-audience">
                <div className="gh-priv-audience__head">
                  <motion.p
                    className="gh-priv-audience__eyebrow"
                    {...reveal(isInView, sectionReduce, 0, 8)}
                  >
                    <BrandCurveMark className="gh-priv-audience__mark" isInView={isInView} />
                    <span>{t('private.page.audience.eyebrow')}</span>
                  </motion.p>
                  <motion.h2
                    id="gh-priv-audience"
                    className="gh-priv-audience__title"
                    aria-label={speakLines(audienceTitle)}
                    {...titleReveal(isInView, sectionReduce, 0.08)}
                  >
                    {audienceLines.map((line, index) => (
                      <span
                        key={line}
                        className={
                          index === 1
                            ? 'gh-priv-audience__title-line gh-priv-audience__title-line--accent'
                            : 'gh-priv-audience__title-line'
                        }
                      >
                        {line}
                      </span>
                    ))}
                  </motion.h2>
                  <motion.p
                    className="gh-priv-audience__lead"
                    {...reveal(isInView, sectionReduce, 0.16, 10)}
                  >
                    {t('private.page.audience.lead')}
                  </motion.p>
                </div>

                <motion.div
                  className="gh-priv-audience__stage"
                  style={
                    {
                      '--audience-i': audienceIndex,
                      '--audience-den': Math.max(AUDIENCE_KEYS.length - 1, 1),
                    } as CSSProperties
                  }
                  {...reveal(isInView, sectionReduce, 0.18, 12)}
                  onMouseEnter={() => setAudiencePaused(true)}
                  onMouseLeave={() => setAudiencePaused(false)}
                  onFocusCapture={() => setAudiencePaused(true)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setAudiencePaused(false);
                    }
                  }}
                >
                  <div className="gh-priv-audience__rail-wrap">
                    <span className="gh-priv-audience__track" aria-hidden />
                    <span
                      className={
                        audiencePaused || sectionReduce
                          ? 'gh-priv-audience__track-fill is-paused'
                          : 'gh-priv-audience__track-fill'
                      }
                      aria-hidden
                    />
                    <ol
                      className="gh-priv-audience__rail"
                      aria-label={t('private.page.audience.eyebrow')}
                    >
                      {AUDIENCE_KEYS.map((key, index) => {
                        const Icon = AUDIENCE_ICONS[key];
                        const active = activeAudience === key;
                        return (
                          <li
                            key={key}
                            className={
                              active
                                ? 'gh-priv-audience__step is-active'
                                : 'gh-priv-audience__step'
                            }
                          >
                            <button
                              type="button"
                              className="gh-priv-audience__step-btn"
                              aria-pressed={active}
                              onClick={() => setActiveAudience(key)}
                            >
                              <span className="gh-priv-audience__marker" aria-hidden>
                                {active && !sectionReduce ? (
                                  <svg
                                    key={`ring-${key}`}
                                    className={
                                      audiencePaused
                                        ? 'gh-priv-audience__ring is-paused'
                                        : 'gh-priv-audience__ring'
                                    }
                                    viewBox="0 0 40 40"
                                    aria-hidden
                                  >
                                    <circle
                                      className="gh-priv-audience__ring-bg"
                                      cx="20"
                                      cy="20"
                                      r="18"
                                      fill="none"
                                    />
                                    <circle
                                      className="gh-priv-audience__ring-fg"
                                      cx="20"
                                      cy="20"
                                      r="18"
                                      fill="none"
                                      pathLength={100}
                                    />
                                  </svg>
                                ) : null}
                                {active ? <Icon size={18} /> : <span>{index + 1}</span>}
                              </span>
                              <span className="gh-priv-audience__step-copy">
                                <span className="gh-priv-audience__step-title">
                                  {t(`private.page.audience.items.${key}.title`)}
                                </span>
                                <AnimatePresence initial={false}>
                                  {active ? (
                                    <motion.span
                                      key={`${key}-body`}
                                      className="gh-priv-audience__step-body"
                                      initial={
                                        sectionReduce
                                          ? { opacity: 1, height: 'auto' }
                                          : { opacity: 0, height: 0, y: 4 }
                                      }
                                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                                      exit={
                                        sectionReduce
                                          ? { opacity: 1, height: 'auto' }
                                          : { opacity: 0, height: 0, y: -2 }
                                      }
                                      transition={{ duration: sectionReduce ? 0 : 0.42, ease: EASE }}
                                    >
                                      {t(`private.page.audience.items.${key}.body`)}
                                    </motion.span>
                                  ) : null}
                                </AnimatePresence>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  <div className="gh-priv-audience__frame">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeAudience}
                        className="gh-priv-audience__shot"
                        initial={
                          sectionReduce
                            ? { opacity: 1, scale: 1 }
                            : { opacity: 0, scale: 1.04 }
                        }
                        animate={{ opacity: 1, scale: 1 }}
                        exit={
                          sectionReduce
                            ? { opacity: 1, scale: 1 }
                            : { opacity: 0, scale: 1.01 }
                        }
                        transition={{ duration: sectionReduce ? 0 : 0.65, ease: EASE }}
                      >
                        <img
                          src={AUDIENCE_PHOTOS[activeAudience]}
                          alt=""
                          width={1600}
                          height={900}
                          loading="lazy"
                          decoding="async"
                        />
                      </motion.div>
                    </AnimatePresence>

                    <div className="gh-priv-audience__veil" aria-hidden />

                    {!sectionReduce ? (
                      <span
                        key={`progress-${activeAudience}`}
                        className={
                          audiencePaused
                            ? 'gh-priv-audience__progress is-paused'
                            : 'gh-priv-audience__progress'
                        }
                        aria-hidden
                      />
                    ) : null}

                    <div className="gh-priv-audience__nav">
                      <button
                        type="button"
                        className="gh-priv-audience__nav-btn"
                        onClick={showAudiencePrev}
                        aria-label={t('private.page.audience.prev')}
                      >
                        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="gh-priv-audience__nav-btn"
                        onClick={showAudienceNext}
                        aria-label={t('private.page.audience.next')}
                      >
                        <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
                      </button>
                    </div>

                    <p
                      className="gh-priv-audience__counter"
                      aria-live="polite"
                      aria-label={`${audienceIndex + 1} ${t('private.page.audience.of')} ${AUDIENCE_KEYS.length}`}
                    >
                      {audienceIndex + 1} / {AUDIENCE_KEYS.length}
                    </p>

                    <div className="gh-priv-audience__caption">
                      <span className="gh-priv-audience__chip">
                        <ActiveIcon size={14} aria-hidden />
                        <span>
                          {t('private.page.audience.step')} {audienceIndex + 1}
                        </span>
                      </span>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={`cap-${activeAudience}`}
                          className="gh-priv-audience__caption-title"
                          initial={sectionReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={sectionReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
                          transition={{ duration: sectionReduce ? 0 : 0.4, ease: EASE }}
                        >
                          {t(`private.page.audience.items.${activeAudience}.title`)}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="gh-priv-audience__cta"
                    onClick={() => continueToEnquiry(audienceIntent[activeAudience])}
                  >
                    <span>{t('private.page.audience.continue')}</span>
                    <GhIconArrow size={15} aria-hidden />
                  </button>
                </motion.div>
              </div>
            );
          }}
        </SectionReveal>

        <SectionReveal className="gh-priv-section gh-priv-section--why" labelledBy="gh-priv-why">
          {(isInView, sectionReduce) => (
            <div className="gh-priv-why">
              <div className="gh-priv-why__intro">
                <motion.p
                  className="gh-priv-eyebrow gh-priv-eyebrow--dark"
                  {...reveal(isInView, sectionReduce, 0.08, 8)}
                >
                  <BrandCurveMark className="gh-priv-mark" isInView={isInView} />
                  <span>{t('private.page.why.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-priv-why"
                  className="gh-priv-title gh-priv-title--speak"
                  aria-label={speakLines(t('private.page.why.title'))}
                  {...titleReveal(isInView, sectionReduce, 0.14)}
                >
                  {t('private.page.why.title')
                    .split('|')
                    .map((line) => (
                      <span key={line} className="gh-priv-title__line">
                        {line}
                      </span>
                    ))}
                </motion.h2>
                <motion.p
                  className="gh-priv-body"
                  {...reveal(isInView, sectionReduce, 0.26, 10)}
                >
                  {t('private.page.why.lead')}
                </motion.p>
              </div>

              <motion.article
                className="gh-priv-why-plate"
                tabIndex={0}
                aria-label={speakLines(t('private.page.why.title'))}
                initial={
                  sectionReduce
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 18 }
                }
                animate={isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: sectionReduce ? 0 : 0.9, delay: 0.12, ease: EASE }}
              >
                <div className="gh-priv-why-plate__media">
                  <img
                    src={whyImage.src}
                    alt={t('private.page.why.imageAlt')}
                    width={1920}
                    height={1080}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="gh-priv-why-plate__veil" aria-hidden />
                <div className="gh-priv-why-plate__meta">
                  <span>{t('private.page.why.plateLabel')}</span>
                  <BrandCurveMark className="gh-priv-why-plate__mark" isInView={isInView} />
                </div>
                <ul className="gh-priv-why-reasons">
                  {(['a', 'b', 'c', 'd'] as const).map((key, index) => (
                    <li key={key} style={{ '--gh-why-i': index } as CSSProperties}>
                      <button
                        type="button"
                        className="gh-priv-why-reasons__row"
                        onClick={openTalk}
                      >
                        <span className="gh-priv-why-reasons__index" aria-hidden>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="gh-priv-why-reasons__text">
                          {t(`private.page.why.points.${key}`)}
                        </span>
                        <GhIconArrow className="gh-priv-row-arrow" size={16} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.article>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-priv-section gh-priv-section--gateway"
          labelledBy="gh-priv-opps"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-priv-gateway">
              <div className="gh-priv-gateway__copy">
                <motion.p
                  className="gh-priv-eyebrow gh-priv-eyebrow--dark"
                  {...reveal(isInView, sectionReduce, 0, 8)}
                >
                  <BrandCurveMark className="gh-priv-mark" isInView={isInView} />
                  <span>{t('private.page.opps.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-priv-opps"
                  className="gh-priv-title gh-priv-gateway__statement"
                  {...titleReveal(isInView, sectionReduce, 0.1)}
                >
                  {t('private.page.opps.statement')}
                </motion.h2>
                <motion.p
                  className="gh-priv-body gh-priv-body--narrow"
                  {...reveal(isInView, sectionReduce, 0.24, 10)}
                >
                  {teasers.length > 0
                    ? t('private.page.opps.withTeasers')
                    : privateCount > 0
                      ? t('private.page.opps.withListings')
                      : t('private.page.opps.empty')}
                </motion.p>
                <motion.div
                  className="gh-priv-actions gh-priv-actions--pad"
                  {...reveal(isInView, sectionReduce, 0.34, 8)}
                >
                  <button
                    type="button"
                    className="gh-final__cta gh-final__cta--primary gh-priv-cta--ink"
                    onClick={openTalk}
                  >
                    <span className="gh-final__cta-label">{t('private.page.talk')}</span>
                    <GhIconArrow size={15} aria-hidden />
                  </button>
                </motion.div>
              </div>
              <motion.figure
                className="gh-priv-gateway__fragment"
                aria-hidden
                initial={
                  sectionReduce
                    ? { opacity: 1, scale: 1, clipPath: 'inset(0 0 0 0)' }
                    : { opacity: 0, scale: 1.03, clipPath: 'inset(0 0 18% 0)' }
                }
                animate={
                  isInView
                    ? { opacity: 1, scale: 1, clipPath: 'inset(0 0 0% 0)' }
                    : undefined
                }
                transition={{ duration: sectionReduce ? 0 : 0.95, delay: 0.12, ease: EASE }}
              >
                <img src={landHolding} alt="" width={1536} height={1024} loading="lazy" decoding="async" />
              </motion.figure>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-priv-section gh-priv-section--approach"
          labelledBy="gh-priv-approach"
          backdrop={
            <div className="gh-priv-approach-bg" aria-hidden>
              <img
                src={approachBackdrop}
                alt=""
                width={1920}
                height={1080}
                loading="lazy"
                decoding="async"
              />
              <span className="gh-priv-approach-bg__veil" />
            </div>
          }
        >
          {(isInView, sectionReduce) => (
            <div className="gh-priv-approach">
              <motion.p
                className="gh-priv-eyebrow"
                {...reveal(isInView, sectionReduce, 0, 8)}
              >
                <BrandCurveMark className="gh-priv-mark" isInView={isInView} />
                <span>{t('private.page.approach.eyebrow')}</span>
              </motion.p>
              <motion.h2
                id="gh-priv-approach"
                className="gh-priv-title gh-priv-title--light"
                {...titleReveal(isInView, sectionReduce, 0.08)}
              >
                {t('private.page.approach.title')}
              </motion.h2>
              <ol className="gh-priv-steps">
                {APPROACH_KEYS.map((key, index) => {
                  const Icon = APPROACH_ICONS[key];
                  return (
                    <motion.li
                      key={key}
                      {...reveal(isInView, sectionReduce, 0.18 + index * 0.08, 12)}
                    >
                      <span className="gh-priv-steps__icon gh-priv-icon-3d gh-priv-icon-3d--light" aria-hidden>
                        <Icon size={22} />
                      </span>
                      <div className="gh-priv-steps__copy">
                        <h3>{t(`private.page.approach.steps.${key}.title`)}</h3>
                        <p>{t(`private.page.approach.steps.${key}.body`)}</p>
                      </div>
                      <GhIconArrow className="gh-priv-row-arrow" size={17} aria-hidden />
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          )}
        </SectionReveal>

        <SectionReveal className="gh-priv-section gh-priv-section--reece" labelledBy="gh-priv-reece">
          {(isInView, sectionReduce) => (
            <>
              <motion.figure
                className="gh-priv-reece__media"
                initial={
                  sectionReduce
                    ? { opacity: 1, scale: 1, clipPath: 'inset(0 0 0 0)' }
                    : { opacity: 0, scale: 1.03, clipPath: 'inset(0 0 10% 0)' }
                }
                animate={
                  isInView
                    ? { opacity: 1, scale: 1, clipPath: 'inset(0 0 0% 0)' }
                    : undefined
                }
                transition={{ duration: sectionReduce ? 0 : 0.95, ease: EASE }}
              >
                <img
                  src={portrait.src}
                  alt={t('private.page.reece.photoAlt')}
                  width={1087}
                  height={1447}
                  loading="lazy"
                  decoding="async"
                />
              </motion.figure>
              <div className="gh-priv-reece__copy">
                <motion.p
                  className="gh-priv-eyebrow gh-priv-eyebrow--dark"
                  {...reveal(isInView, sectionReduce, 0.12, 8)}
                >
                  <span>{t('private.page.reece.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-priv-reece"
                  className="gh-priv-title"
                  {...titleReveal(isInView, sectionReduce, 0.18)}
                >
                  {t('private.page.reece.title')}
                </motion.h2>
                <motion.p
                  className="gh-priv-body"
                  {...reveal(isInView, sectionReduce, 0.28, 10)}
                >
                  {t('private.page.reece.lead')}
                </motion.p>
                <ul className="gh-priv-prompts">
                  {PROMPT_KEYS.map((key, index) => (
                    <motion.li
                      key={key}
                      {...reveal(isInView, sectionReduce, 0.36 + index * 0.07, 10)}
                    >
                      <button
                        type="button"
                        onClick={() => continueToEnquiry(promptIntent[key])}
                      >
                        <span>{t(`private.page.reece.prompts.${key}`)}</span>
                        <GhIconArrow size={17} aria-hidden />
                      </button>
                    </motion.li>
                  ))}
                </ul>
                <motion.p
                  className="gh-priv-reece__close"
                  {...reveal(isInView, sectionReduce, 0.68, 8)}
                >
                  {t('private.page.reece.close')}
                </motion.p>
                <motion.div
                  className="gh-priv-actions"
                  {...reveal(isInView, sectionReduce, 0.74, 8)}
                >
                  <button
                    type="button"
                    className="gh-final__cta gh-final__cta--primary gh-priv-cta--ink"
                    onClick={openTalk}
                  >
                    <span className="gh-final__cta-label">{t('private.page.talk')}</span>
                    <GhIconArrow size={15} aria-hidden />
                  </button>
                </motion.div>
              </div>
            </>
          )}
        </SectionReveal>

        {teasers.length > 0 ? (
          <section className="gh-priv-section gh-priv-section--ivory gh-priv-teasers" aria-labelledby="gh-priv-teasers">
            <h2 id="gh-priv-teasers" className="gh-priv-title gh-priv-teasers__title">
              {t('private.page.opps.teasersTitle')}
            </h2>
            <div className="gh-arch-grid">
              {teasers.map((row, index) => {
                const key = String(row.listing_code || row.slug || row.id);
                return (
                  <OpportunityCard
                    key={String(row.id)}
                    index={index}
                    teaserHref={`/${language}/private/${encodeURIComponent(key)}`}
                    property={{
                      ...(row as unknown as Property),
                      id: String(row.id),
                      title: String(row.title ?? ''),
                      address: String(row.address ?? ''),
                      image: String(row.image_url ?? ''),
                      images: Array.isArray(row.images) ? (row.images as string[]) : [],
                      features: (row.features as Record<string, string>) ?? {},
                      surfaceArea: row.surface_area ? String(row.surface_area) : undefined,
                      price: Number(row.price) || 0,
                      priceType: 'sale',
                      bedrooms: 0,
                      bathrooms: 0,
                      sqft: Number(row.m2) || 0,
                      status: 'sale',
                      featured: false,
                      type: String(row.type ?? ''),
                    }}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        <SectionReveal
          className="gh-priv-section gh-priv-section--ivory gh-priv-section--enquiry"
          labelledBy="gh-priv-form"
        >
          {(isInView, sectionReduce) => (
            <div className="gh-priv-enquiry">
              <div className="gh-priv-enquiry__intro">
                <motion.p
                  className="gh-priv-eyebrow gh-priv-eyebrow--dark"
                  {...reveal(isInView, sectionReduce, 0, 8)}
                >
                  <BrandCurveMark className="gh-priv-mark" isInView={isInView} />
                  <span>{t('private.page.form.eyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-priv-form"
                  className="gh-priv-title"
                  {...titleReveal(isInView, sectionReduce, 0.08)}
                >
                  {t('private.page.form.title')}
                </motion.h2>
                <motion.p
                  className="gh-priv-body gh-priv-body--narrow"
                  {...reveal(isInView, sectionReduce, 0.2, 10)}
                >
                  {t('private.page.form.lead')}
                </motion.p>
              </div>

              <motion.div ref={formRef} {...reveal(isInView, sectionReduce, 0.24, 14)}>
                <InvestorProfileForm variant="private" preset={preset} />
              </motion.div>
            </div>
          )}
        </SectionReveal>

        <section className="gh-priv-final" aria-labelledby="gh-priv-final">
          <div className="gh-priv-final__backdrop" aria-hidden>
            <img src={talkBackdrop} alt="" width={1920} height={1080} loading="lazy" decoding="async" />
          </div>
          <div className="gh-priv-final__inner" ref={final.ref}>
            <motion.p
              className="gh-priv-eyebrow"
              {...reveal(final.isInView, reduce, 0, 8)}
            >
              <BrandCurveMark className="gh-priv-mark" isInView={final.isInView} />
              <span>{t('private.page.final.eyebrow')}</span>
            </motion.p>
            <motion.h2
              id="gh-priv-final"
              className="gh-priv-title gh-priv-title--light"
              {...titleReveal(final.isInView, reduce, 0.1)}
            >
              {t('private.page.final.title')}
            </motion.h2>
            <motion.p
              className="gh-priv-body gh-priv-body--light"
              {...reveal(final.isInView, reduce, 0.24, 10)}
            >
              {t('private.page.final.lead')}
            </motion.p>
            <motion.div
              className="gh-priv-actions"
              {...reveal(final.isInView, reduce, 0.36, 8)}
            >
              <button type="button" className="gh-final__cta gh-final__cta--primary" onClick={openTalk}>
                <span className="gh-final__cta-label">{t('private.page.talk')}</span>
                <GhIconArrow size={15} aria-hidden />
              </button>
              <Link className="gh-final__cta gh-final__cta--secondary" to={archiveHref}>
                <span className="gh-final__cta-label">{t('private.page.final.explore')}</span>
                <GhIconArrow size={14} aria-hidden />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Private;
