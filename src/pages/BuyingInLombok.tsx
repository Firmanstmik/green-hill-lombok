import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { GhIconArrow } from '@/components/brand/GhIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { BUYING_KEYS } from '@/components/home/trustEducationKeys';
import { useCmsPageSeo, useContentImage } from '@/content/hooks';
import { contentValue, useContentState } from '@/content/ContentContext';
import { BUYING_EXTRA_TOPICS } from '@/content/schema';
import { generalWhatsAppLink, getPublicWhatsAppUrl } from '@/lib/contact';
import heroPhoto from '@/assets/greenhill/hero-hills.webp';

/**
 * Educational gateway — questions to consider, not legal advice.
 * A reading guide: quieter than Why Lombok, which is a place essay.
 */
export default function BuyingInLombok() {
  const { language, t } = useLanguage();
  const location = useLocation();
  const content = useContentState();
  const hero = useContentImage('buying.hero', heroPhoto);
  const whatsappUrl = getPublicWhatsAppUrl();
  useCmsPageSeo({ titleKey: 'cms.buying.seo.title', descriptionKey: 'cms.buying.seo.description', imageSlot: 'buying.seo.image', path: '/buying-in-lombok' });

  const chapters = [
    ...BUYING_KEYS.map((key) => ({
      id: key,
      title: t(`trust.buying.${key}.title`),
      detail: t(`trust.buying.${key}.detail`),
    })),
    ...BUYING_EXTRA_TOPICS.map((id) => ({
      id,
      title: contentValue(content, `cms.buying.topic.${id}.title`, language),
      detail: contentValue(content, `cms.buying.topic.${id}.detail`, language),
    })).filter((topic) => topic.title),
  ];

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 104;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [location.hash]);

  const openTalk = () => {
    if (whatsappUrl) {
      window.open(generalWhatsAppLink(language), '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = `/${language}/#contact`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="gh-buy">
        <header className="gh-buy-hero">
          <div className="gh-buy-hero__bg" aria-hidden>
            <img src={hero.src} alt="" width={1920} height={1080} />
            <div className="gh-buy-hero__veil" />
          </div>
          <div className="gh-buy-hero__stage">
            <p className="gh-buy__eyebrow">
              <BrandCurveMark className="gh-buy__mark" />
              <span>{t('trust.buyingLabel')}</span>
            </p>
            <h1 className="gh-buy__headline">{t('trust.pageHeadline')}</h1>
            <p className="gh-buy__lead">{t('trust.pageLead')}</p>
            <p className="gh-buy__disclaimer">{t('trust.disclaimer')}</p>

            <nav className="gh-buy-index" aria-label={t('trust.buyingLabel')}>
              <ol>
                {chapters.map((chapter, index) => (
                  <li key={chapter.id}>
                    <a href={`#${chapter.id}`}>
                      <span className="gh-buy-index__num">{String(index + 1).padStart(2, '0')}</span>
                      <span className="gh-buy-index__label">{chapter.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </header>

        <section className="gh-buy-chapters" aria-label={t('trust.buyingLabel')}>
          <div className="gh-buy-chapters__inner">
            <ol className="gh-buy__list">
              {chapters.map((chapter, index) => (
                <li key={chapter.id} id={chapter.id} className="gh-buy__item">
                  <span className="gh-buy__num">{String(index + 1).padStart(2, '0')}</span>
                  <div className="gh-buy__item-copy">
                    <h3 className="gh-buy__item-title">{chapter.title}</h3>
                    {chapter.detail ? <p className="gh-buy__item-body">{chapter.detail}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="gh-buy-close" aria-labelledby="gh-buy-close-heading">
          <div className="gh-buy-close__inner">
            <div className="gh-buy-close__copy">
              <p className="gh-buy__eyebrow gh-buy__eyebrow--light">
                <BrandCurveMark className="gh-buy__mark" />
                <span>{t('trust.buyingLabel')}</span>
              </p>
              <h2 id="gh-buy-close-heading" className="gh-buy-close__title">
                {t('trust.buyingLead')}
              </h2>
            </div>
            <div className="gh-buy__actions">
              <button type="button" className="gh-final__cta gh-final__cta--primary gh-buy__cta" onClick={openTalk}>
                <span className="gh-final__cta-label">{t('trust.talkCta')}</span>
                <GhIconArrow size={15} aria-hidden />
              </button>
              <Link to={`/${language}/why-lombok`} className="gh-final__cta gh-final__cta--secondary gh-buy__back">
                <span className="gh-final__cta-label">{t('trust.backToWhy')}</span>
                <GhIconArrow size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
