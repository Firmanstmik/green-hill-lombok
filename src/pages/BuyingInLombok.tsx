import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { BUYING_KEYS } from '@/components/home/trustEducationKeys';
import { useCmsPageSeo } from '@/content/hooks';
import { contentValue, useContentState } from '@/content/ContentContext';
import { BUYING_EXTRA_TOPICS } from '@/content/schema';

/**
 * Educational gateway — structure first.
 * Questions to consider, not legal advice. Deeper Notes content can replace this later.
 */
export default function BuyingInLombok() {
  const { language, t } = useLanguage();
  const location = useLocation();
  const content = useContentState();
  useCmsPageSeo({ titleKey: 'cms.buying.seo.title', descriptionKey: 'cms.buying.seo.description', imageSlot: 'buying.seo.image', path: '/buying-in-lombok' });
  // Further topics Reece has written (brief §7); each appears once it has a title.
  const extraTopics = BUYING_EXTRA_TOPICS.map((id) => ({
    id,
    title: contentValue(content, `cms.buying.topic.${id}.title`, language),
    detail: contentValue(content, `cms.buying.topic.${id}.detail`, language),
  })).filter((topic) => topic.title);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 104;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [location.hash]);

  const scrollToContact = () => {
    window.location.href = `/${language}/#contact`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="gh-buy">
        <div className="gh-buy__inner">
          <p className="gh-buy__eyebrow">
            <span className="gh-buy__eyebrow-rule" aria-hidden />
            <span>{t('trust.buyingLabel')}</span>
          </p>

          <h1 className="gh-buy__headline">{t('trust.pageHeadline')}</h1>
          <p className="gh-buy__lead">{t('trust.pageLead')}</p>
          <p className="gh-buy__disclaimer">{t('trust.disclaimer')}</p>

          <ol className="gh-buy__list">
            {BUYING_KEYS.map((key, i) => (
              <li key={key} id={key} className="gh-buy__item">
                <span className="gh-buy__num">{String(i + 1).padStart(2, '0')}</span>
                <div className="gh-buy__item-copy">
                  <h2 className="gh-buy__item-title">{t(`trust.buying.${key}.title`)}</h2>
                  <p className="gh-buy__item-body">{t(`trust.buying.${key}.detail`)}</p>
                </div>
              </li>
            ))}
            {extraTopics.map((topic, i) => (
              <li key={topic.id} id={topic.id} className="gh-buy__item">
                <span className="gh-buy__num">{String(BUYING_KEYS.length + i + 1).padStart(2, '0')}</span>
                <div className="gh-buy__item-copy">
                  <h2 className="gh-buy__item-title">{topic.title}</h2>
                  {topic.detail ? <p className="gh-buy__item-body">{topic.detail}</p> : null}
                </div>
              </li>
            ))}
          </ol>

          <div className="gh-buy__actions">
            <button type="button" className="gh-buy__cta" onClick={scrollToContact}>
              <span>{t('trust.talkCta')}</span>
              <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
            </button>
            <Link to={`/${language}/why-lombok`} className="gh-buy__back">
              {t('trust.backToWhy')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
