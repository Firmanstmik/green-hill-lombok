import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import {
  GhIconArrow,
  GhIconHills,
  GhIconPlace,
  GhIconSeal,
  GhIconViewfinder,
} from '@/components/brand/GhIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInView } from '@/hooks/useInView';
import { generalWhatsAppLink, getPublicWhatsAppUrl } from '@/lib/contact';
import { applyPageSeo } from '@/lib/seo';
import { useContentImage, useNotesArticles } from '@/content/hooks';
import {
  NOTES_PERSPECTIVES,
  getFeaturedNote,
  getNoteContent,
  getPublishedNotes,
  type NotesArticle,
} from '@/data/notesData';
import heroAtmosphere from '@/assets/greenhill/hero-masters/green-hill-hero-section-1.webp';
import heroPortrait from '@/assets/greenhill/source/reece-elevated-valley-original.jpg';
import journalPhoto from '@/assets/greenhill/sec-talk-to-reece3.webp';
import journalInset from '@/assets/greenhill/land-coastal.jpg';
import quotePhoto from '@/assets/greenhill/hero-coastal-land.jpg';
import finalBackdrop from '@/assets/greenhill/bg-sec-talk-to-reece.webp';
import prepPhotoA from '@/assets/greenhill/land-holding.jpg';
import prepPhotoB from '@/assets/greenhill/land-coastal.jpg';
import prepPhotoC from '@/assets/greenhill/hero-hills.webp';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Themes the journal is being built around. These are the editorial buckets of
 * the Notes data model (NotesTopic), not article titles — they stand in for the
 * index while no note is published, so the page reads as curated rather than
 * unfinished. Copy lives in notes.page.themes.*.
 */
const THEME_KEYS = ['land', 'lombok', 'buying', 'perspective'] as const;

const THEME_ICONS = {
  land: GhIconHills,
  lombok: GhIconPlace,
  buying: GhIconViewfinder,
  perspective: GhIconSeal,
} as const;

const speakLines = (value: string) => value.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();

const indexLabel = (n: number) => String(n).padStart(2, '0');

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

/** Headline reveal — the type is unveiled upward from its own baseline. */
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

/** Photography settles: the frame opens from the bottom while the image relaxes. */
function mediaReveal(inView: boolean, reduce: boolean, delay = 0) {
  if (reduce) {
    return {
      initial: { opacity: 1, scale: 1, clipPath: 'inset(0 round 1.35rem)' },
      animate: { opacity: 1, scale: 1, clipPath: 'inset(0 round 1.35rem)' },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, scale: 1.04, clipPath: 'inset(0 0 100% 0 round 1.35rem)' },
    animate: inView
      ? { opacity: 1, scale: 1, clipPath: 'inset(0 round 1.35rem)' }
      : { opacity: 0, scale: 1.04, clipPath: 'inset(0 0 100% 0 round 1.35rem)' },
    transition: { duration: 1.15, delay, ease: EASE },
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

function formatNoteDate(date: string | null, language: string) {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString(
      language === 'id' ? 'id-ID' : language === 'nl' ? 'nl-NL' : language === 'es' ? 'es-ES' : 'en-GB',
      { year: 'numeric', month: 'long', day: 'numeric' },
    );
  } catch {
    return date;
  }
}

const Notes = () => {
  const { t, language } = useLanguage();
  const reduce = Boolean(useReducedMotion());
  const hero = useInView({ threshold: 0.2 });
  const whatsappUrl = getPublicWhatsAppUrl();
  const talkHref = `/${language}/#contact`;
  const archiveHref = `/${language}/properties`;
  const articles = useNotesArticles();
  const notes = getPublishedNotes(articles);
  const featured = getFeaturedNote(articles);
  const latest = featured ? notes.filter((n) => n.id !== featured.id) : notes;
  const heroBackground = useContentImage('notes.hero.background', heroAtmosphere);
  const heroImage = useContentImage('notes.hero.portrait', heroPortrait);
  const journalImage = useContentImage('notes.journal.photo', journalPhoto);
  const seoImage = useContentImage('notes.seo.image', heroBackground.src);

  const openTalk = () => {
    if (whatsappUrl) {
      window.open(generalWhatsAppLink(language), '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = talkHref;
  };

  useEffect(() => {
    const image = new URL(seoImage.src, window.location.origin).href;
    return applyPageSeo({
      title: t('notes.page.seoTitle'),
      description: t('notes.page.seoDescription'),
      canonicalPath: `/${language}/intelligence`,
      lang: language,
      image,
      ogType: 'website',
    });
  }, [language, t, seoImage.src]);

  const heroReveal = (delay: number, y = 12) =>
    reduce
      ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y },
          animate: hero.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y },
          transition: { duration: 0.75, delay, ease: EASE },
        };

  const hasIndex = latest.length > 0;

  return (
    <div className="gh-notes min-h-screen">
      <Navbar />

      <main>
        {/* Hero — editorial opening: copy left, oversized photograph right, the
            frame breaking the section edge into the journal below. */}
        <header className="gh-notes-hero" ref={hero.ref} aria-labelledby="gh-notes-hero-heading">
          <div className="gh-notes-hero__bg" aria-hidden>
            <img
              className="gh-notes-hero__bg-img"
              src={heroBackground.src}
              alt=""
              width={1672}
              height={940}
              loading="eager"
              decoding="async"
            />
            <div className="gh-notes-hero__veil" />
            <div className="gh-notes-hero__grain" />
            <BrandCurveMark className="gh-notes-hero__watermark" isInView={hero.isInView} />
          </div>

          <div className="gh-notes-hero__stage">
            <div className="gh-notes-hero__copy">
              <p className="gh-notes-hero__eyebrow">
                <BrandCurveMark className="gh-notes-hero__mark" isInView={hero.isInView} />
                <motion.span {...heroReveal(0.18, 8)}>{t('notes.page.eyebrow')}</motion.span>
              </p>

              <motion.h1
                id="gh-notes-hero-heading"
                className="gh-notes-hero__title"
                aria-label={speakLines(t('notes.page.headline'))}
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
                animate={hero.isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: reduce ? 0 : 0.95, delay: reduce ? 0 : 0.28, ease: EASE }}
              >
                {t('notes.page.headline')
                  .split('|')
                  .map((line, index) => (
                    <span key={`${line}-${index}`} className="gh-notes-hero__title-line">
                      {line.trim()}
                    </span>
                  ))}
              </motion.h1>

              <motion.p className="gh-notes-hero__lead" {...heroReveal(0.48, 10)}>
                {t('notes.page.lead')}
              </motion.p>

              <motion.p className="gh-notes-hero__sign" {...heroReveal(0.66, 6)}>
                <span className="gh-notes-hero__sign-place">{t('notes.page.locality')}</span>
                <span className="gh-notes-hero__sign-dot" aria-hidden />
                <span className="gh-notes-hero__sign-place">{t('notes.page.country')}</span>
              </motion.p>
            </div>

            <div className="gh-notes-hero__visual">
              <p className="gh-notes-hero__rail" aria-hidden>
                <span className="gh-notes-hero__rail-num">01</span>
                <span className="gh-notes-hero__rail-line" />
                <span className="gh-notes-hero__rail-word">{t('notes.page.fieldNotes')}</span>
              </p>

              <motion.figure
                className="gh-notes-hero__figure"
                initial={
                  reduce
                    ? { opacity: 1, clipPath: 'inset(0 round 1.35rem)' }
                    : { opacity: 0, clipPath: 'inset(0 0 100% 0 round 1.35rem)' }
                }
                animate={
                  hero.isInView ? { opacity: 1, clipPath: 'inset(0 round 1.35rem)' } : undefined
                }
                transition={{ duration: reduce ? 0.35 : 1.25, delay: reduce ? 0 : 0.1, ease: EASE }}
              >
                <img
                  src={heroImage.src}
                  alt={t('notes.page.heroAlt')}
                  width={768}
                  height={1024}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                />
                <figcaption>{t('notes.page.heroCaption')}</figcaption>
              </motion.figure>
            </div>
          </div>
        </header>

        {/* The journal. With no published note this is the deliberate opening of
            the journal, not an empty state. */}
        <SectionReveal className="gh-notes-journal" labelledBy="gh-notes-journal-heading">
          {(inView) =>
            featured ? (
              <div className="gh-notes-journal__inner">
                <FeaturedNote
                  article={featured}
                  language={language}
                  inView={inView}
                  reduce={reduce}
                  eyebrow={t('notes.page.featuredEyebrow')}
                  readLabel={t('notes.page.readNote')}
                />
              </div>
            ) : (
              <div className="gh-notes-journal__inner gh-notes-journal__inner--open">
                <div className="gh-notes-journal__copy">
                  <span className="gh-notes-journal__ghost" aria-hidden>
                    01
                  </span>
                  <motion.p className="gh-notes-eyebrow" {...reveal(inView, reduce, 0.05, 8)}>
                    <BrandCurveMark className="gh-notes-mark" isInView={inView} />
                    <span>{t('notes.page.journalLabel')}</span>
                  </motion.p>
                  <motion.h2
                    id="gh-notes-journal-heading"
                    className="gh-notes-journal__title"
                    {...titleReveal(inView, reduce, 0.14)}
                  >
                    {t('notes.page.featuredEmptyTitle')}
                  </motion.h2>
                  <motion.span
                    className="gh-notes-rule"
                    aria-hidden
                    {...reveal(inView, reduce, 0.24, 0)}
                  />
                  <motion.p className="gh-notes-body" {...reveal(inView, reduce, 0.28, 10)}>
                    {t('notes.page.featuredEmptyBody')}
                  </motion.p>
                  <motion.div className="gh-notes-actions" {...reveal(inView, reduce, 0.36, 8)}>
                    <Link
                      to={archiveHref}
                      className="gh-final__cta gh-final__cta--primary gh-notes-cta--forest"
                    >
                      <span className="gh-final__cta-label">{t('notes.page.exploreCta')}</span>
                      <GhIconArrow />
                    </Link>
                    <button
                      type="button"
                      className="gh-final__cta gh-final__cta--secondary gh-notes-cta--dark"
                      onClick={openTalk}
                    >
                      <span className="gh-final__cta-label">{t('notes.page.talkCta')}</span>
                      <GhIconArrow />
                    </button>
                  </motion.div>
                  <motion.p className="gh-notes-journal__meta" {...reveal(inView, reduce, 0.44, 8)}>
                    <span className="gh-notes-journal__meta-rule" aria-hidden />
                    <span>{t('notes.page.journalMeta')}</span>
                  </motion.p>
                </div>

                <div className="gh-notes-journal__visual">
                  <motion.figure
                    className="gh-notes-journal__media gh-notes-journal__media--main"
                    {...mediaReveal(inView, reduce, 0.1)}
                  >
                    <img
                      src={journalImage.src}
                      alt={t('notes.page.journalImageAlt')}
                      width={1093}
                      height={1438}
                      loading="lazy"
                      decoding="async"
                    />
                  </motion.figure>
                  <motion.figure
                    className="gh-notes-journal__media gh-notes-journal__media--inset"
                    {...reveal(inView, reduce, 0.42, 16)}
                  >
                    <img
                      src={journalInset}
                      alt=""
                      width={1536}
                      height={1024}
                      loading="lazy"
                      decoding="async"
                    />
                  </motion.figure>
                </div>
              </div>
            )
          }
        </SectionReveal>

        {/* The index when notes exist; an editorial preparation collage when they do not. */}
        {hasIndex ? (
          <SectionReveal className="gh-notes-reading" labelledBy="gh-notes-reading-heading">
            {(inView) => (
              <div className="gh-notes-reading__inner">
                <div className="gh-notes-reading__head">
                  <motion.p className="gh-notes-eyebrow" {...reveal(inView, reduce, 0.05, 8)}>
                    <BrandCurveMark className="gh-notes-mark" isInView={inView} />
                    <span>{t('notes.page.latestEyebrow')}</span>
                  </motion.p>
                  <motion.h2
                    id="gh-notes-reading-heading"
                    className="gh-notes-title"
                    {...titleReveal(inView, reduce, 0.12)}
                  >
                    {t('notes.page.latestTitle')}
                  </motion.h2>
                  <motion.p className="gh-notes-lead" {...reveal(inView, reduce, 0.2, 10)}>
                    {t('notes.page.latestLead')}
                  </motion.p>
                </div>

                <ol className="gh-notes-list">
                  {latest.map((article, index) => {
                    const content = getNoteContent(article, language);
                    const dateLabel = formatNoteDate(article.date, language);
                    return (
                      <motion.li
                        key={article.id}
                        className="gh-notes-list__item"
                        {...reveal(inView, reduce, 0.26 + index * 0.05, 12)}
                      >
                        <Link
                          to={`/${language}/intelligence/${article.slug}`}
                          className="gh-notes-list__row"
                        >
                          <span className="gh-notes-list__num" aria-hidden>
                            {indexLabel(index + 1)}
                          </span>
                          <span className="gh-notes-list__body">
                            <span className="gh-notes-list__meta">
                              <span className="gh-notes-list__topic">{article.topic}</span>
                              {dateLabel ? (
                                <span className="gh-notes-list__date">{dateLabel}</span>
                              ) : null}
                            </span>
                            <span className="gh-notes-list__title">{content.title}</span>
                            <span className="gh-notes-list__excerpt">{content.excerpt}</span>
                            <span className="gh-notes-list__cta">
                              <span>{t('notes.page.readNote')}</span>
                              <GhIconArrow />
                            </span>
                          </span>
                          {article.heroImage ? (
                            <span className="gh-notes-list__preview" aria-hidden>
                              <img
                                src={article.heroImage}
                                alt=""
                                width={640}
                                height={420}
                                loading="lazy"
                                decoding="async"
                              />
                            </span>
                          ) : null}
                          <span className="gh-notes-list__sweep" aria-hidden />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ol>
              </div>
            )}
          </SectionReveal>
        ) : (
          <SectionReveal className="gh-notes-prep" labelledBy="gh-notes-prep-heading">
            {(inView) => (
              <div className="gh-notes-prep__inner">
                <div className="gh-notes-prep__copy">
                  <motion.p className="gh-notes-eyebrow" {...reveal(inView, reduce, 0.05, 8)}>
                    <BrandCurveMark className="gh-notes-mark" isInView={inView} />
                    <span>{t('notes.page.themesEyebrow')}</span>
                  </motion.p>

                  <motion.h2
                    id="gh-notes-prep-heading"
                    className="gh-notes-prep__title"
                    aria-label={speakLines(t('notes.page.themesTitle'))}
                    {...titleReveal(inView, reduce, 0.1)}
                  >
                    <span>{t('notes.page.themesTitleBefore')}</span>
                    <em>{t('notes.page.themesTitleAccent')}</em>
                    <span>{t('notes.page.themesTitleAfter')}</span>
                  </motion.h2>

                  <motion.p className="gh-notes-prep__lead" {...reveal(inView, reduce, 0.18, 10)}>
                    {t('notes.page.emptyBody')}
                  </motion.p>

                  <ul className="gh-notes-prep__features">
                    {THEME_KEYS.map((key, index) => {
                      const Icon = THEME_ICONS[key];
                      return (
                        <motion.li
                          key={key}
                          className="gh-notes-prep__feature"
                          {...reveal(inView, reduce, 0.24 + index * 0.05, 10)}
                        >
                          <span className="gh-notes-prep__icon" aria-hidden>
                            <Icon size={18} />
                          </span>
                          <span className="gh-notes-prep__feature-copy">
                            <span className="gh-notes-prep__feature-label">
                              {t(`notes.page.themes.${key}.label`)}
                            </span>
                            <span className="gh-notes-prep__feature-body">
                              {t(`notes.page.themes.${key}.body`)}
                            </span>
                          </span>
                        </motion.li>
                      );
                    })}
                  </ul>

                  <motion.div {...reveal(inView, reduce, 0.48, 8)}>
                    <Link
                      to={`/${language}/why-lombok`}
                      className="gh-notes-prep__cta"
                    >
                      <span>{t('notes.page.themesCta')}</span>
                      <GhIconArrow />
                    </Link>
                  </motion.div>
                </div>

                <motion.div
                  className="gh-notes-prep__collage"
                  aria-hidden
                  {...reveal(inView, reduce, 0.16, 16)}
                >
                  <figure className="gh-notes-prep__card gh-notes-prep__card--a">
                    <img
                      src={prepPhotoA}
                      alt=""
                      width={900}
                      height={1200}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                  <figure className="gh-notes-prep__card gh-notes-prep__card--b">
                    <img
                      src={prepPhotoB}
                      alt=""
                      width={900}
                      height={700}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                  <figure className="gh-notes-prep__card gh-notes-prep__card--c">
                    <img
                      src={prepPhotoC}
                      alt=""
                      width={900}
                      height={700}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                  <div className="gh-notes-prep__badge">
                    <BrandCurveMark className="gh-notes-prep__badge-mark" isInView={inView} />
                    <span className="gh-notes-prep__badge-label">
                      {t('notes.page.themesBadge')}
                    </span>
                  </div>
                </motion.div>
              </div>
            )}
          </SectionReveal>
        )}

        {/* Image-led chapter break: the Green Hill point of view. */}
        <SectionReveal
          className="gh-notes-quote"
          labelledBy="gh-notes-quote-heading"
          threshold={0.2}
          backdrop={
            <div className="gh-notes-quote__media" aria-hidden>
              <img
                src={quotePhoto}
                alt=""
                className="gh-notes-quote__img"
                width={1536}
                height={1024}
                loading="lazy"
                decoding="async"
              />
              <div className="gh-notes-quote__veil" />
            </div>
          }
        >
          {(inView) => (
            <div className="gh-notes-quote__inner">
              <motion.p
                className="gh-notes-eyebrow gh-notes-eyebrow--light"
                {...reveal(inView, reduce, 0.05, 8)}
              >
                <BrandCurveMark className="gh-notes-mark" isInView={inView} />
                <span>{t('notes.page.perspectiveEyebrow')}</span>
              </motion.p>
              <motion.h2
                id="gh-notes-quote-heading"
                className="gh-notes-quote__title"
                {...titleReveal(inView, reduce, 0.14)}
              >
                {t('notes.page.perspectiveTitle')}
              </motion.h2>
              <motion.p
                className="gh-notes-body gh-notes-body--light"
                {...reveal(inView, reduce, 0.24, 10)}
              >
                {t('notes.page.perspectiveBody')}
              </motion.p>
              <motion.p className="gh-notes-quote__attr" {...reveal(inView, reduce, 0.32, 8)}>
                <span className="gh-notes-quote__attr-rule" aria-hidden />
                <span>{t('notes.page.perspectiveAttribution')}</span>
              </motion.p>
            </div>
          )}
        </SectionReveal>

        {/* Perspectives — the wider Green Hill chapters, as an editorial index. */}
        <SectionReveal className="gh-notes-topics" labelledBy="gh-notes-topics-heading">
          {(inView) => (
            <div className="gh-notes-topics__inner">
              <div className="gh-notes-topics__head">
                <motion.p
                  className="gh-notes-eyebrow gh-notes-eyebrow--light"
                  {...reveal(inView, reduce, 0.05, 8)}
                >
                  <BrandCurveMark className="gh-notes-mark" isInView={inView} />
                  <span>{t('notes.page.topicsEyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-notes-topics-heading"
                  className="gh-notes-title gh-notes-title--light"
                  {...titleReveal(inView, reduce, 0.12)}
                >
                  {t('notes.page.topicsTitle')}
                </motion.h2>
                <motion.p
                  className="gh-notes-lead gh-notes-lead--light"
                  {...reveal(inView, reduce, 0.2, 10)}
                >
                  {t('notes.page.topicsLead')}
                </motion.p>
              </div>

              <ol className="gh-notes-chapters">
                {NOTES_PERSPECTIVES.map((item, index) => (
                  <motion.li
                    key={item.key}
                    className="gh-notes-chapters__item"
                    {...reveal(inView, reduce, 0.26 + index * 0.05, 12)}
                  >
                    <Link to={`/${language}${item.path}`} className="gh-notes-chapters__link">
                      <span className="gh-notes-chapters__num" aria-hidden>
                        {indexLabel(index + 1)}
                      </span>
                      <span className="gh-notes-chapters__copy">
                        <span className="gh-notes-chapters__label">
                          {t(`notes.page.topics.${item.key}.label`)}
                        </span>
                        <span className="gh-notes-chapters__body">
                          {t(`notes.page.topics.${item.key}.body`)}
                        </span>
                      </span>
                      <span className="gh-notes-chapters__arrow" aria-hidden>
                        <GhIconArrow />
                      </span>
                      <span className="gh-notes-chapters__sweep" aria-hidden />
                    </Link>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
        </SectionReveal>

        <SectionReveal
          className="gh-notes-final"
          labelledBy="gh-notes-final-heading"
          backdrop={
            <div className="gh-notes-final__backdrop" aria-hidden>
              <img src={finalBackdrop} alt="" width={1672} height={941} loading="lazy" decoding="async" />
            </div>
          }
        >
          {(inView) => (
            <div className="gh-notes-final__inner">
              <motion.p className="gh-notes-eyebrow" {...reveal(inView, reduce, 0.05, 8)}>
                <BrandCurveMark className="gh-notes-mark" isInView={inView} />
                <span>{t('notes.page.finalEyebrow')}</span>
              </motion.p>
              <motion.h2
                id="gh-notes-final-heading"
                className="gh-notes-title"
                {...titleReveal(inView, reduce, 0.12)}
              >
                {t('notes.page.finalTitle')}
              </motion.h2>
              <motion.p className="gh-notes-lead" {...reveal(inView, reduce, 0.2, 10)}>
                {t('notes.page.finalLead')}
              </motion.p>
              <motion.div
                className="gh-notes-actions gh-notes-actions--center"
                {...reveal(inView, reduce, 0.28, 8)}
              >
                <button
                  type="button"
                  className="gh-final__cta gh-final__cta--primary gh-notes-cta--forest"
                  onClick={openTalk}
                >
                  <span className="gh-final__cta-label">{t('notes.page.talkCta')}</span>
                  <GhIconArrow />
                </button>
                <Link
                  to={archiveHref}
                  className="gh-final__cta gh-final__cta--secondary gh-notes-cta--dark"
                >
                  <span className="gh-final__cta-label">{t('notes.page.exploreCta')}</span>
                  <GhIconArrow />
                </Link>
              </motion.div>
            </div>
          )}
        </SectionReveal>
      </main>

      <Footer />
    </div>
  );
};

/**
 * Featured note — the same asymmetric composition as the journal opening, with
 * the published note's own photograph in the oversized frame.
 */
function FeaturedNote({
  article,
  language,
  inView,
  reduce,
  eyebrow,
  readLabel,
}: {
  article: NotesArticle;
  language: string;
  inView: boolean;
  reduce: boolean;
  eyebrow: string;
  readLabel: string;
}) {
  const content = getNoteContent(article, language);
  const href = `/${language}/intelligence/${article.slug}`;

  return (
    <article className="gh-notes-journal__stage">
      <div className="gh-notes-journal__copy">
        <span className="gh-notes-journal__ghost" aria-hidden>
          01
        </span>
        <motion.p className="gh-notes-eyebrow" {...reveal(inView, reduce, 0.05, 8)}>
          <BrandCurveMark className="gh-notes-mark" isInView={inView} />
          <span>{eyebrow}</span>
        </motion.p>
        <motion.p className="gh-notes-journal__topic" {...reveal(inView, reduce, 0.12, 8)}>
          {article.topic}
        </motion.p>
        <motion.h2
          id="gh-notes-journal-heading"
          className="gh-notes-journal__title"
          {...titleReveal(inView, reduce, 0.18)}
        >
          <Link to={href}>{content.title}</Link>
        </motion.h2>
        <motion.span className="gh-notes-rule" aria-hidden {...reveal(inView, reduce, 0.26, 0)} />
        <motion.p className="gh-notes-body" {...reveal(inView, reduce, 0.3, 10)}>
          {content.excerpt}
        </motion.p>
        <motion.div {...reveal(inView, reduce, 0.38, 8)}>
          <Link to={href} className="gh-notes-journal__cta">
            <span>{readLabel}</span>
            <GhIconArrow />
          </Link>
        </motion.div>
      </div>

      <div className="gh-notes-journal__visual">
        <figure className="gh-notes-journal__media gh-notes-journal__media--main">
          <motion.img
            src={article.heroImage}
            alt={article.heroAlt}
            width={1094}
            height={1438}
            loading="eager"
            decoding="async"
            {...mediaReveal(inView, reduce, 0.1)}
          />
        </figure>
      </div>
    </article>
  );
}

export default Notes;
