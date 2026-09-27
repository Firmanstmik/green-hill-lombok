import { Link } from 'react-router-dom';
import {
  GhIconArrow,
  GhIconCaretRight,
  GhIconConverse,
  GhIconHills,
  GhIconInstagram,
  GhIconLetter,
  GhIconPlace,
  GhIconRose,
  GhIconSeal,
  GhIconWhatsApp,
} from '@/components/brand/GhIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { ContactDock } from '@/components/layout/ContactDock';
import { useInView } from '@/hooks/useInView';
import { buildWhatsAppUrl } from '@/lib/contact';
import { useContactSettings, useContentImage } from '@/content/hooks';
import ghLogoSolidHd from '@/assets/greenhill/hero/green-hill-logo-solid-hd.webp';
import ghLogoSolidStackedHd from '@/assets/greenhill/hero/green-hill-logo-solid-stacked-hd.webp';
import footerCardPhoto from '@/assets/greenhill/land-coastal.jpg';

/**
 * Green Hill footer — VON-style editorial structure on white,
 * adapted to Green Hill brand (forest, gold). Container width matches navbar gutters.
 */

const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3941.950132389106!2d116.26548387501708!3d-8.884228691171446!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zOMKwNTMnMDMuMiJTIDExNsKwMTYnMDUuMCJF!5e0!3m2!1sid!2sid!4v1790052608810!5m2!1sid!2sid';

interface FooterLink {
  labelKey: string;
  path: string;
}

const exploreLinks: FooterLink[] = [
  { labelKey: 'navigation.opportunities', path: '/properties' },
  { labelKey: 'navigation.whyLombok', path: '/why-lombok' },
  { labelKey: 'navigation.about', path: '/about' },
  { labelKey: 'navigation.speakWithUs', path: '/enquire' },
];

const approachLinks: FooterLink[] = [
  { labelKey: 'footer.landOpportunities', path: '/properties' },
  { labelKey: 'footer.villaOpportunities', path: '/properties' },
  { labelKey: 'footer.developmentPlots', path: '/properties' },
  { labelKey: 'footer.buyingInLombok', path: '/buying-in-lombok' },
];

const guideLinks: FooterLink[] = [
  { labelKey: 'footer.buyingInLombok', path: '/buying-in-lombok' },
  { labelKey: 'navigation.notes', path: '/intelligence' },
  { labelKey: 'navigation.speakWithUs', path: '/enquire' },
];

const trustItems = [
  { icon: GhIconHills, titleKey: 'footer.trustOnGroundTitle', bodyKey: 'footer.trustOnGroundBody' },
  { icon: GhIconSeal, titleKey: 'footer.trustCuratedTitle', bodyKey: 'footer.trustCuratedBody' },
  { icon: GhIconConverse, titleKey: 'footer.trustTalkTitle', bodyKey: 'footer.trustTalkBody' },
] as const;

function GreenHillMapPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M32 2C18.2 2 7 13.2 7 27c0 18.4 20.2 42.6 23.4 46.2a2 2 0 0 0 3.2 0C36.8 69.6 57 45.4 57 27 57 13.2 45.8 2 32 2Z"
        fill="#17382E"
      />
      <circle cx="32" cy="27" r="14" fill="#F1EDE5" />
      <path
        d="M22 30.2c1.2.4 3.2 1.2 4.6 1.6 1.4.4 3 .6 4.4.4 1.4-.2 3.2-.8 4.8-1.6 1.6-.8 4.2-2.6 5.6-3.4"
        stroke="#C79D5A"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M21 33.6c1.4.5 3.6 1.4 5.2 1.8 1.6.4 3.2.5 4.8.2 1.6-.3 3.6-1 5.4-1.9 1.8-.9 4.6-2.8 6-3.6"
        stroke="#17382E"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function Footer() {
  const { language, t } = useLanguage();
  const contact = useContactSettings();
  const whatsappHref = buildWhatsAppUrl(t('hero.whatsappMessage'));
  const footerPhoto = useContentImage('site.footer.photo', footerCardPhoto);
  const { ref, isInView } = useInView({ threshold: 0.08 });

  const withLang = (path: string) => {
    const [pathname, query] = path.split('?');
    return `/${language}${pathname}${query ? `?${query}` : ''}`;
  };

  const renderNavLink = (link: FooterLink) => (
    <Link to={withLang(link.path)} className="gh-footer__link">
      <span className="gh-footer__chev" aria-hidden>
        <GhIconCaretRight size={12} />
      </span>
      <span>{t(link.labelKey)}</span>
    </Link>
  );

  return (
    <footer
      className={`gh-footer scroll-mt-24${isInView ? ' is-inview' : ''}`}
      ref={ref}
    >
      <div className="gh-footer__inner">
        <div className="gh-footer__grid">
          {/* Brand */}
          <div className="gh-footer__brand">
            <Link to={withLang('/')} className="gh-footer__logo" aria-label="Green Hill Lombok">
              <picture>
                <source media="(min-width: 768px)" srcSet={ghLogoSolidHd} type="image/webp" />
                <img
                  src={ghLogoSolidStackedHd}
                  alt="Green Hill Lombok"
                  width={851}
                  height={640}
                  className="gh-footer__logo-img"
                  decoding="async"
                  loading="lazy"
                />
              </picture>
            </Link>

            <p className="gh-footer__eyebrow">{t('footer.brandLine')}</p>
            <p className="gh-footer__intro">{t('footer.tagline')}</p>

            <div className="gh-footer__chip-row">
              <Link to={withLang('/')} className="gh-footer__chip">
                <span className="gh-footer__chip-mark" aria-hidden>
                  <BrandCurveMark className="gh-footer__chip-mark-svg" isInView={isInView} />
                </span>
                <span className="gh-footer__chip-copy">
                  <span className="gh-footer__chip-title">{t('footer.badge')}</span>
                  <span className="gh-footer__chip-sub">{t('footer.locationShort')}</span>
                </span>
              </Link>

              <a
                href={contact.instagramUrl}
                className="gh-footer__ig"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Green Hill Lombok on Instagram"
              >
                <GhIconInstagram size={18} />
              </a>
            </div>
          </div>

          {/* Explore */}
          <nav className="gh-footer__col" aria-label={t('footer.explore')}>
            <h4 className="gh-footer__col-title">{t('footer.explore')}</h4>
            <ul className="gh-footer__list">
              {exploreLinks.map((link) => (
                <li key={`explore-${link.labelKey}`}>{renderNavLink(link)}</li>
              ))}
            </ul>
          </nav>

          {/* Approach */}
          <nav className="gh-footer__col" aria-label={t('footer.approach')}>
            <h4 className="gh-footer__col-title">{t('footer.approach')}</h4>
            <ul className="gh-footer__list">
              {approachLinks.map((link) => (
                <li key={`approach-${link.labelKey}`}>{renderNavLink(link)}</li>
              ))}
            </ul>
          </nav>

          {/* Guide */}
          <nav className="gh-footer__col" aria-label={t('footer.guide')}>
            <h4 className="gh-footer__col-title">{t('footer.guide')}</h4>
            <ul className="gh-footer__list">
              {guideLinks.map((link) => (
                <li key={`guide-${link.labelKey}`}>{renderNavLink(link)}</li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div className="gh-footer__col gh-footer__contact-col">
            <h4 className="gh-footer__col-title">{t('footer.contactHeading')}</h4>

            <ul className="gh-footer__contact-list">
              <li className="gh-footer__contact-item">
                <GhIconPlace className="gh-footer__contact-icon" size={16} />
                <span className="gh-footer__contact-text">{t('footer.location')}</span>
              </li>
              <li className="gh-footer__contact-item">
                <GhIconLetter className="gh-footer__contact-icon" size={16} />
                <a href={`mailto:${contact.email}`} className="gh-footer__contact-link">
                  {contact.email}
                </a>
              </li>
              <li className="gh-footer__contact-item">
                <GhIconWhatsApp className="gh-footer__contact-icon" size={16} />
                <a
                  href={whatsappHref}
                  className="gh-footer__contact-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {contact.whatsappDisplay}
                </a>
              </li>
              <li className="gh-footer__contact-item">
                <GhIconConverse className="gh-footer__contact-icon" size={16} />
                <Link to={withLang('/enquire')} className="gh-footer__contact-link">
                  {t('navigation.speakWithUs')}
                </Link>
              </li>
              <li className="gh-footer__contact-item">
                <GhIconRose className="gh-footer__contact-icon" size={16} />
                <Link to={withLang('/properties')} className="gh-footer__contact-link">
                  {t('footer.exploreOpportunities')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* On the ground card + interactive map */}
        <div className="gh-footer__place">
          <div className="gh-footer__card">
            <div className="gh-footer__card-media">
              <img
                src={footerPhoto.src}
                alt=""
                width={640}
                height={420}
                className="gh-footer__card-img"
                loading="lazy"
                decoding="async"
              />
              <div className="gh-footer__card-scrim" aria-hidden />
              <span className="gh-footer__card-badge">{t('footer.cardChip')}</span>
              <div className="gh-footer__card-caption">
                <span className="gh-footer__card-name">Green Hill</span>
                <span className="gh-footer__card-place">{t('footer.location')}</span>
              </div>
            </div>
              <div className="gh-footer__card-actions">
                <Link to={withLang('/enquire')} className="gh-footer__card-btn">
                  <GhIconPlace className="gh-footer__card-btn-icon" size={14} />
                  {t('footer.cardTalk')}
                </Link>
                <Link to={withLang('/properties')} className="gh-footer__card-btn">
                  {t('footer.cardExplore')}
                  <GhIconArrow className="gh-footer__card-btn-icon" size={14} />
                </Link>
              </div>
          </div>

          <div className="gh-footer__map" data-inview={isInView ? 'true' : 'false'}>
            <div className="gh-footer__map-chrome" aria-hidden />
            <iframe
              className="gh-footer__map-frame"
              src={MAP_EMBED_SRC}
              title={t('footer.mapTitle')}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
            <div className="gh-footer__map-pin-wrap" aria-hidden>
              <span className="gh-footer__map-pulse gh-footer__map-pulse--a" />
              <span className="gh-footer__map-pulse gh-footer__map-pulse--b" />
              <GreenHillMapPin className="gh-footer__map-pin" />
            </div>
            <div className="gh-footer__map-meta">
              <span className="gh-footer__map-meta-dot" aria-hidden />
              <span className="gh-footer__map-meta-text">{t('footer.mapLabel')}</span>
            </div>
            <a
              className="gh-footer__map-open"
              href="https://maps.google.com/?q=-8.884228691171446,116.26548387501708"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('footer.mapOpen')}
              <GhIconArrow size={13} />
            </a>
          </div>
        </div>

        {/* Trust bar */}
        <div className="gh-footer__trust">
          {trustItems.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="gh-footer__trust-item">
              <span className="gh-footer__trust-icon" aria-hidden>
                <Icon size={18} />
              </span>
              <div className="gh-footer__trust-copy">
                <p className="gh-footer__trust-title">{t(titleKey)}</p>
                <p className="gh-footer__trust-text">{t(bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Baseline */}
        <div className="gh-footer__baseline">
          <p className="gh-footer__copy">
            © {new Date().getFullYear()}, Green Hill · {t('footer.rights')}
          </p>
          <p className="gh-footer__baseline-mark">{t('footer.slogan')}</p>
          <p className="gh-footer__credit">{t('footer.locationShort')}</p>
        </div>
      </div>

      <ContactDock />
    </footer>
  );
}
