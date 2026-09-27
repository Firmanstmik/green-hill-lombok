import { type ReactNode, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { GhIconArrow } from '@/components/brand/GhIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInView } from '@/hooks/useInView';
import { generalWhatsAppLink, getPublicWhatsAppUrl } from '@/lib/contact';
import { applyPageSeo } from '@/lib/seo';
import { useNotesArticles } from '@/content/hooks';
import {
  getNoteBySlug,
  getNoteContent,
  getRelatedNotes,
} from '@/data/notesData';

const EASE = [0.22, 1, 0.36, 1] as const;

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

function SectionReveal({
  children,
  className,
  labelledBy,
}: {
  children: (isInView: boolean, reduce: boolean) => ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const { ref, isInView } = useInView({ threshold: 0.14 });
  const reduce = Boolean(useReducedMotion());
  return (
    <section className={className} aria-labelledby={labelledBy}>
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

const NotesArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const reduce = Boolean(useReducedMotion());
  const hero = useInView({ threshold: 0.15 });
  const whatsappUrl = getPublicWhatsAppUrl();
  const talkHref = `/${language}/#contact`;
  const archiveHref = `/${language}/properties`;
  const notesHref = `/${language}/intelligence`;

  const articles = useNotesArticles();
  const article = slug ? getNoteBySlug(slug, articles) : null;
  const content = article ? getNoteContent(article, language) : null;
  const related = article ? getRelatedNotes(article, 3, articles) : [];

  const openTalk = () => {
    if (whatsappUrl) {
      window.open(generalWhatsAppLink(language), '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = talkHref;
  };

  useEffect(() => {
    if (!article || !content) {
      return applyPageSeo({
        title: `${t('notes.page.notFoundTitle')} | Green Hill Lombok`,
        description: t('notes.page.notFoundLead'),
        canonicalPath: `/${language}/intelligence/${slug ?? ''}`,
        lang: language,
        ogType: 'website',
      });
    }

    const image = new URL(article.ogImage || article.heroImage, window.location.origin).href;
    return applyPageSeo({
      title: content.seoTitle,
      description: content.seoDescription,
      canonicalPath: `/${language}/intelligence/${article.slug}`,
      lang: language,
      image,
      ogType: 'article',
      robots: article.slug.startsWith('demo-') ? 'noindex, nofollow' : undefined,
    });
  }, [article, content, language, slug, t]);

  if (!article || !content) {
    return (
      <div className="gh-notes min-h-screen">
        <Navbar />
        <main className="gh-notes-missing">
          <div className="gh-notes-missing__inner">
            <p className="gh-notes-eyebrow">
              <BrandCurveMark className="gh-notes-mark" isInView />
              <span>{t('notes.page.eyebrow')}</span>
            </p>
            <h1 className="gh-notes-title">{t('notes.page.notFoundTitle')}</h1>
            <p className="gh-notes-lead">{t('notes.page.notFoundLead')}</p>
            <div className="gh-notes-actions">
              <Link to={notesHref} className="gh-final__cta gh-final__cta--primary">
                <span className="gh-final__cta-label">{t('notes.page.backToNotes')}</span>
                <GhIconArrow />
              </Link>
              <Link to={archiveHref} className="gh-final__cta gh-final__cta--secondary">
                <span className="gh-final__cta-label">{t('notes.page.exploreCta')}</span>
                <GhIconArrow />
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const dateLabel = formatNoteDate(article.date, language);

  return (
    <div className="gh-notes min-h-screen">
      <Navbar />

      <main>
        <article>
          <header className="gh-notes-article-hero" ref={hero.ref}>
            <div className="gh-notes-article-hero__head">
              <div className="gh-notes-article-hero__copy">
                <p className="gh-notes-eyebrow">
                  <BrandCurveMark className="gh-notes-mark" isInView={hero.isInView} />
                  <span>{t('notes.page.eyebrow')}</span>
                </p>
                <p className="gh-notes-article-hero__topic">{article.topic}</p>
                {article.slug.startsWith('demo-') ? (
                  <p className="gh-notes-article-hero__sample">{t('notes.page.sampleNote')}</p>
                ) : null}
                <motion.h1
                  className="gh-notes-article-hero__title"
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
                  animate={hero.isInView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: reduce ? 0 : 0.85, ease: EASE }}
                >
                  {content.title}
                </motion.h1>
                {(content.dek || content.excerpt) && (
                  <motion.p
                    className="gh-notes-article-hero__dek"
                    initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
                    animate={hero.isInView ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.12, ease: EASE }}
                  >
                    {content.dek || content.excerpt}
                  </motion.p>
                )}
                <ul className="gh-notes-article-hero__facts">
                  <li>{article.author || t('notes.page.authorLabel')}</li>
                  {dateLabel ? <li><time dateTime={article.date ?? undefined}>{dateLabel}</time></li> : null}
                  <li>{article.topic}</li>
                </ul>
              </div>
              <Link className="gh-notes-article-hero__back" to={notesHref}>
                {t('notes.page.backToNotes')}
                <GhIconArrow size={14} />
              </Link>
            </div>

            <div className="gh-notes-article-hero__media">
              <motion.img
                src={article.heroImage}
                alt={article.heroAlt}
                width={1600}
                height={900}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.03 }}
                animate={hero.isInView ? { opacity: 1, scale: 1 } : undefined}
                transition={{ duration: reduce ? 0.35 : 1.1, ease: EASE }}
              />
            </div>
          </header>

          <div className="gh-notes-article-body">
            <div className="gh-notes-article-body__rail" aria-hidden>
              <span className="gh-notes-article-body__rail-label">{t('notes.page.eyebrow')}</span>
              <span className="gh-notes-article-body__rail-topic">{article.topic}</span>
            </div>
            <div className="gh-notes-article-body__column">
              {content.sections.map((section, index) => (
                <section key={`${article.id}-section-${index}`} className="gh-notes-article-section">
                  {section.heading ? (
                    <h2 className="gh-notes-article-section__heading">{section.heading}</h2>
                  ) : null}
                  {section.pullQuote ? (
                    <blockquote className="gh-notes-article-quote">{section.pullQuote}</blockquote>
                  ) : null}
                  {section.content.split(/\n\n+/).map((paragraph, pIndex) => (
                    <p key={`${index}-${pIndex}`}>{paragraph}</p>
                  ))}
                  {section.image ? (
                    <figure className="gh-notes-article-figure">
                      <img
                        src={section.image}
                        alt={section.imageAlt || ''}
                        loading="lazy"
                        decoding="async"
                      />
                      {section.caption ? <figcaption>{section.caption}</figcaption> : null}
                    </figure>
                  ) : null}
                </section>
              ))}

              <p className="gh-notes-article-back">
                <Link to={notesHref}>{t('notes.page.backToNotes')}</Link>
              </p>
            </div>
          </div>
        </article>

        {related.length > 0 ? (
          <SectionReveal className="gh-notes-related" labelledBy="gh-notes-related-heading">
            {(inView) => (
              <div className="gh-notes-related__inner">
                <motion.p className="gh-notes-eyebrow" {...reveal(inView, reduce, 0.05, 8)}>
                  <BrandCurveMark className="gh-notes-mark" isInView={inView} />
                  <span>{t('notes.page.relatedEyebrow')}</span>
                </motion.p>
                <motion.h2
                  id="gh-notes-related-heading"
                  className="gh-notes-title"
                  {...reveal(inView, reduce, 0.1, 12)}
                >
                  {t('notes.page.relatedTitle')}
                </motion.h2>
                <ol className="gh-notes-list">
                  {related.map((item, index) => {
                    const relatedContent = getNoteContent(item, language);
                    return (
                      <li key={item.id} className="gh-notes-list__item">
                        <Link
                          to={`/${language}/intelligence/${item.slug}`}
                          className="gh-notes-list__row"
                        >
                          <span className="gh-notes-list__num" aria-hidden>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="gh-notes-list__body">
                            <span className="gh-notes-list__meta">
                              <span className="gh-notes-list__topic">{item.topic}</span>
                            </span>
                            <span className="gh-notes-list__title">{relatedContent.title}</span>
                            <span className="gh-notes-list__excerpt">{relatedContent.excerpt}</span>
                            <span className="gh-notes-list__cta">
                              <span>{t('notes.page.readNote')}</span>
                              <GhIconArrow />
                            </span>
                          </span>
                          {item.heroImage ? (
                            <span className="gh-notes-list__preview" aria-hidden>
                              <img
                                src={item.heroImage}
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
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </SectionReveal>
        ) : null}

        <SectionReveal className="gh-notes-final gh-notes-final--article" labelledBy="gh-notes-article-end">
          {(inView) => (
            <div className="gh-notes-final__inner">
              <motion.p className="gh-notes-eyebrow" {...reveal(inView, reduce, 0.05, 8)}>
                <BrandCurveMark className="gh-notes-mark" isInView={inView} />
                <span>{t('notes.page.articleEndEyebrow')}</span>
              </motion.p>
              <motion.h2
                id="gh-notes-article-end"
                className="gh-notes-title"
                {...reveal(inView, reduce, 0.1, 12)}
              >
                {t('notes.page.articleEndTitle')}
              </motion.h2>
              <motion.div className="gh-notes-actions gh-notes-actions--center" {...reveal(inView, reduce, 0.2, 8)}>
                <button type="button" className="gh-final__cta gh-final__cta--primary gh-notes-cta--forest" onClick={openTalk}>
                  <span className="gh-final__cta-label">{t('notes.page.talkCta')}</span>
                  <GhIconArrow />
                </button>
                <Link to={archiveHref} className="gh-final__cta gh-notes-cta--outline">
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

export default NotesArticle;
