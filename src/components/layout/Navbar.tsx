import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight } from '@/icons/iconsax';
import { useLanguage } from '@/contexts/LanguageContext';
import { LocaleDropdown } from '@/components/layout/LocaleDropdown';
import { useFocusTrap } from '@/components/layout/useFocusTrap';
/*
 * Trimmed, full-colour lockups built by `npm run build:hero`. The bar used to
 * import the raw 4224x2816 exports, in which the mark fills 30.8% of the
 * height, and the CSS corrected for that padding with a hand-tuned ratio.
 * These are trimmed, so the mark fills the box and the bar can request the
 * same height as the hero lockup and get the same mark.
 */
import ghLogoSolid from '@/assets/greenhill/hero/green-hill-logo-solid-112.webp';
import ghLogoSolid2x from '@/assets/greenhill/hero/green-hill-logo-solid-168.webp';
import ghLogoSolidStacked from '@/assets/greenhill/hero/green-hill-logo-solid-stacked-88.webp';
import ghLogoSolidStacked2x from '@/assets/greenhill/hero/green-hill-logo-solid-stacked-132.webp';
import ghLogoHero from '@/assets/greenhill/hero/green-hill-logo-hero-112.webp';
import ghLogoHero2x from '@/assets/greenhill/hero/green-hill-logo-hero-168.webp';
import ghLogoHeroStacked from '@/assets/greenhill/hero/green-hill-logo-hero-stacked-88.webp';
import ghLogoHeroStacked2x from '@/assets/greenhill/hero/green-hill-logo-hero-stacked-132.webp';
import ghLogoHeroStackedHd from '@/assets/greenhill/hero/green-hill-logo-hero-stacked-hd-512.webp';
import founderAvatar from '@/assets/greenhill/founder/green-hill-reece-green-520.webp';

/** Solid bar height at lg — anchored scrolls clear it by exactly this much. */
const NAV_OFFSET = 104;

/** Shared with the hero — one easing curve across the whole chrome. */
const GH_EASE = [0.22, 1, 0.36, 1] as const;

/** The sheet opens from the menu button, like a page being turned back. */
const MENU_CLOSED = 'circle(0px at calc(100% - 2.6rem) 2.5rem)';
const MENU_OPEN = 'circle(150vmax at calc(100% - 2.6rem) 2.5rem)';

/** Three unequal strokes. The short gold line is the Green Hill mark, not a stock hamburger. */
function MenuMark({ open }: { open: boolean }) {
  return (
    <span className={`gh-menu-mark${open ? ' is-open' : ''}`} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

/** A nav entry is either a page link or an in-page section (hash) link. */
type NavLinkConfig = { key: string; labelKey: string } & (
  | { path: string; hash?: undefined }
  | { hash: string; path?: undefined }
);

const navLinksConfig: readonly NavLinkConfig[] = [
  { key: 'opportunities', path: '/properties', labelKey: 'navigation.opportunities' },
  { key: 'why-lombok', path: '/why-lombok', labelKey: 'navigation.whyLombok' },
  { key: 'private', path: '/private', labelKey: 'navigation.private' },
  { key: 'about', path: '/about', labelKey: 'navigation.about' },
  { key: 'notes', path: '/intelligence', labelKey: 'navigation.notes' },
];

const HASH_TO_DOM: Record<string, string> = {
  opportunities: 'opportunities',
  'why-lombok': 'why-lombok',
  private: 'private',
  about: 'about',
  contact: 'contact',
};

function navLinkActive(
  link: (typeof navLinksConfig)[number],
  pathname: string,
  activeHash: string,
) {
  if ('path' in link && link.path) {
    if (link.path === '/properties') return /\/(properties|property)(\/|$)/.test(pathname);
    return pathname.includes(link.path);
  }
  return activeHash === ('hash' in link ? link.hash : '');
}

function resolveSectionElement(hash: string): HTMLElement | null {
  const domId = HASH_TO_DOM[hash] || hash;
  const byId = document.getElementById(domId);
  if (byId) return byId;
  if (hash === 'opportunities') {
    const sections = document.querySelectorAll('main > section');
    if (sections.length >= 2) return sections[1] as HTMLElement;
  }
  return null;
}

/**
 * Navbar — curved floating shell on hero; solid bar elsewhere.
 */
export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  /** Hidden while the visitor scrolls down; revealed again on scroll-up. */
  const [concealed, setConcealed] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const location = useLocation();
  const { language, t } = useLanguage();
  const reduceMotion = useReducedMotion();
  /** Menu contents rise into place one after another once the sheet has opened. */
  const menuRise = (delay: number, y: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.25 } }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: GH_EASE },
        };
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  /** Hero chrome entrance plays once per page load — not again on scroll-back. */
  const heroEntrancePlayed = useRef(false);
  /** Skip hash re-scroll when only the language prefix changed. */
  const prevPathForHashRef = useRef(location.pathname);

  useFocusTrap(menuRef, isMobileMenuOpen);

  const withLang = (path: string) => `/${language}${path}`;
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const basePath = pathSegments.slice(1).length > 0 ? `/${pathSegments.slice(1).join('/')}` : '/';
  const isHome = basePath === '/';
  const onHero = isHome && !scrolled;

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveHash('');
    if (isHome) window.history.replaceState(null, '', withLang('/'));
  }, [isHome, language]);

  const scrollToSection = useCallback(
    (hash: string) => {
      const element = resolveSectionElement(hash);
      if (!element) return;
      const top = element.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveHash(hash);
      window.history.replaceState(null, '', `${withLang('/')}#${hash}`);
    },
    [language]
  );

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    setTimeout(() => closeButtonRef.current?.focus(), 80);
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setIsMobileMenuOpen(false);
    document.addEventListener('keydown', onEsc);
    // Captured now: by cleanup time the ref may already point somewhere else.
    const trigger = menuButtonRef.current;
    return () => {
      document.removeEventListener('keydown', onEsc);
      // Send focus back where it came from; closing used to drop it on <body>.
      trigger?.focus();
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      /*
       * Hysteresis: leave the hero chrome only after a clear leave, return to
       * it only near the top — stops the logo swap flickering mid-scroll.
       */
      setScrolled((was) => {
        if (was) return y > 12;
        return y > 56;
      });

      if (y < 24) {
        setConcealed(false);
        lastScrollY.current = y;
        return;
      }

      const delta = y - lastScrollY.current;
      if (Math.abs(delta) < 6) return;

      if (delta > 0) {
        setConcealed(true);
      } else {
        setConcealed(false);
      }
      lastScrollY.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Menu open must never leave the visitor without chrome.
  useEffect(() => {
    if (isMobileMenuOpen) setConcealed(false);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!onHero || heroEntrancePlayed.current) return;
    const t = window.setTimeout(() => {
      heroEntrancePlayed.current = true;
    }, 1600);
    return () => window.clearTimeout(t);
  }, [onHero]);

  /** Quiet editorial settle — logo, then links, then CTA. */
  const heroChrome = (delay: number, y = -6) => {
    if (heroEntrancePlayed.current) {
      return { initial: false as const };
    }
    if (reduceMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.35, delay: Math.min(delay, 0.12), ease: GH_EASE },
      };
    }
    return {
      initial: { opacity: 0, y },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.82, delay, ease: GH_EASE },
    };
  };

  useEffect(() => setIsMobileMenuOpen(false), [location]);

  useEffect(() => {
    if (!isHome) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;

    // Language-only URL swap keeps the same hash — don't yank scroll back to the section.
    const stripLang = (path: string) => {
      const parts = path.split('/').filter(Boolean);
      if (parts[0] === 'en' || parts[0] === 'id' || parts[0] === 'nl' || parts[0] === 'es') {
        return `/${parts.slice(1).join('/')}`;
      }
      return path;
    };
    const prev = prevPathForHashRef.current;
    prevPathForHashRef.current = location.pathname;
    if (prev && stripLang(prev) === stripLang(location.pathname)) return;

    const timer = window.setTimeout(() => scrollToSection(hash), 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome, location.pathname]);

  useEffect(() => {
    if (!isHome) {
      setActiveHash('');
      return;
    }
    const hashes = navLinksConfig.flatMap((l) => ('hash' in l && l.hash ? [l.hash] : []));
    const update = () => {
      const probe = window.scrollY + NAV_OFFSET + 24;
      let current = '';
      for (const hash of hashes) {
        const el = resolveSectionElement(hash);
        if (!el) continue;
        if (el.getBoundingClientRect().top + window.pageYOffset <= probe) current = hash;
      }
      if (window.scrollY < 80) current = '';
      setActiveHash((p) => (p === current ? p : current));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [isHome]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    if (!isHome) {
      window.location.href = `${withLang('/')}#${hash}`;
      return;
    }
    scrollToSection(hash);
  };

  const handleSpeakWithUs = () => {
    setIsMobileMenuOpen(false);
    if (!isHome) {
      window.location.href = `${withLang('/')}#contact`;
      return;
    }
    scrollToSection('contact');
  };

  const renderNavLinks = (className: string) =>
    navLinksConfig.map((link) => {
      if ('path' in link && link.path) {
        const active = navLinkActive(link, location.pathname, activeHash);
        return (
          <Link
            key={link.key}
            to={withLang(link.path)}
            className={`${className}${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span>{t(link.labelKey)}</span>
          </Link>
        );
      }
      const hash = 'hash' in link ? link.hash : '';
      const active = navLinkActive(link, location.pathname, activeHash);
      return (
        <Link
          key={link.key}
          to={`${withLang('/')}#${hash}`}
          onClick={(e) => handleNavClick(e, hash)}
          className={`${className}${active ? ' is-active' : ''}`}
          aria-current={active ? 'true' : undefined}
        >
          <span>{t(link.labelKey)}</span>
        </Link>
      );
    });

  const logo = (
    <Link
      to={withLang('/')}
      onClick={(e) => {
        if (isHome) {
          e.preventDefault();
          scrollToTop();
        }
      }}
      className="gh-nav-logo"
    >
      <picture>
        <source
          media="(min-width: 1024px)"
          srcSet={`${ghLogoSolid} 1x, ${ghLogoSolid2x} 2x`}
          type="image/webp"
        />
        <img
          src={ghLogoSolidStacked}
          srcSet={`${ghLogoSolidStacked} 1x, ${ghLogoSolidStacked2x} 2x`}
          alt="Green Hill Lombok — Curated Property & Land Opportunities"
          width={117}
          height={88}
          className="gh-nav-logo__img"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </Link>
  );

  /**
   * Ivory lockup for the hero. The house mark is forest green and gold, which
   * is why the old hero needed a white card behind it; this recoloured lockup
   * sits straight on the photograph instead.
   */
  const heroLogo = (
    <Link
      to={withLang('/')}
      onClick={(e) => {
        if (isHome) {
          e.preventDefault();
          scrollToTop();
        }
      }}
      className="gh-nav-logo"
    >
      <picture>
        <source
          media="(min-width: 1024px)"
          srcSet={`${ghLogoHero} 1x, ${ghLogoHero2x} 2x`}
          type="image/webp"
        />
        <img
          src={ghLogoHeroStacked}
          srcSet={`${ghLogoHeroStacked} 1x, ${ghLogoHeroStacked2x} 2x`}
          alt="Green Hill Lombok — Curated Property & Land Opportunities"
          width={117}
          height={88}
          className="gh-nav-logo__img"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </Link>
  );

  return (
    <>
      <header
        className={`gh-nav ${onHero ? 'gh-nav--hero' : 'gh-nav--solid'}${
          scrolled && !onHero ? ' is-scrolled' : ''
        }${concealed && !isMobileMenuOpen ? ' is-concealed' : ''}`}
      >
        {onHero ? (
          <div className="gh-nav-hero">
            <motion.div className="gh-nav-hero__logo" {...heroChrome(0.28, -6)}>
              {heroLogo}
            </motion.div>

            <motion.nav className="gh-nav-hero__links" aria-label="Primary" {...heroChrome(0.42, -4)}>
              {renderNavLinks('gh-nav-hero__link')}
            </motion.nav>

            <motion.div className="gh-nav-hero__end" {...heroChrome(0.56, -4)}>
              <LocaleDropdown tone="dark" />
              <button
                type="button"
                onClick={handleSpeakWithUs}
                className="gh-nav-cta gh-nav-cta--dark"
              >
                <span>{t('navigation.speakWithUs')}</span>
                <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </motion.div>

            <motion.div className="gh-nav-hero__mobile" {...heroChrome(0.28, -6)}>
              {heroLogo}
              <div className="gh-nav-hero__mobile-actions">
                <LocaleDropdown tone="dark" />
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setIsMobileMenuOpen((v) => !v)}
                  className="gh-nav-menu-btn"
                  aria-expanded={isMobileMenuOpen}
                  aria-label="Toggle menu"
                >
                  <MenuMark open={isMobileMenuOpen} />
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="gh-nav-bar">
            {logo}

            <nav className="gh-nav-bar__links" aria-label="Primary">
              {renderNavLinks('gh-nav-bar__link')}
            </nav>

            <div className="gh-nav-bar__end">
              <LocaleDropdown />
              <button
                type="button"
                onClick={handleSpeakWithUs}
                className="gh-nav-cta gh-nav-cta--light"
              >
                <span>{t('navigation.speakWithUs')}</span>
                <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <div className="gh-nav-bar__mobile">
              <LocaleDropdown />
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="gh-nav-menu-btn gh-nav-menu-btn--solid"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
              >
                <MenuMark open={isMobileMenuOpen} />
              </button>
            </div>
          </div>
        )}
      </header>

      {!isHome && (
        <>
          <div className="hidden lg:block h-[104px]" />
          <div className="lg:hidden h-[80px]" />
        </>
      )}

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: GH_EASE }}
              className="fixed inset-0 z-[70] lg:hidden"
              style={{ backgroundColor: 'rgba(12, 26, 21, 0.4)' }}
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden
            />
            {/*
              z-[80], above the tab bar's z-60. The menu used to sit at z-50,
              which put its primary CTA underneath the bar and out of reach.
            */}
            <motion.div
              ref={menuRef}
              initial={reduceMotion ? { opacity: 0 } : { clipPath: MENU_CLOSED }}
              animate={reduceMotion ? { opacity: 1 } : { clipPath: MENU_OPEN }}
              exit={reduceMotion ? { opacity: 0 } : { clipPath: MENU_CLOSED }}
              transition={{ duration: reduceMotion ? 0.25 : 0.62, ease: GH_EASE }}
              className="gh-menu fixed inset-0 z-[80] lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={t('navigation.menu')}
            >
              {/* The official monogram, very faint, so the sheet is unmistakably Green Hill. */}
              <span className="gh-menu__watermark-frame" aria-hidden>
                <img src={ghLogoHeroStackedHd} alt="" className="gh-menu__watermark" decoding="async" />
              </span>

              <div className="gh-menu__bar">
                <img
                  src={ghLogoHeroStacked}
                  srcSet={`${ghLogoHeroStacked} 1x, ${ghLogoHeroStacked2x} 2x`}
                  alt="Green Hill Lombok"
                  width={117}
                  height={88}
                  className="gh-menu__logo"
                  decoding="async"
                />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="gh-menu__close"
                  aria-label={t('navigation.close')}
                >
                  <MenuMark open />
                </button>
              </div>

              <div className="gh-menu__scroll">
                <motion.p className="gh-menu__eyebrow" {...menuRise(0.18, 8)}>
                  {t('hero.locationLabel')}
                </motion.p>

                <nav className="gh-menu__nav" aria-label="Primary">
                  {/* Numbered like the hero chapters: the same editorial contents, one idea. */}
                  <ul className="gh-menu__list">
                    {navLinksConfig.map((link, i) => {
                      const hash = 'hash' in link ? link.hash : '';
                      const isPath = 'path' in link && link.path;
                      const active = navLinkActive(link, location.pathname, activeHash);
                      const descKey = `navigation.descriptions.${link.labelKey.split('.')[1]}`;
                      const inner = (
                        <>
                          <span className="gh-menu__text">
                            <span className="gh-menu__label">{t(link.labelKey)}</span>
                            <span className="gh-menu__desc">{t(descKey)}</span>
                          </span>
                          <ArrowRight className="gh-menu__arrow" size={16} strokeWidth={1.5} aria-hidden />
                        </>
                      );
                      return (
                        <motion.li key={link.key} {...menuRise(0.26 + i * 0.06, 14)}>
                          {isPath ? (
                            <Link
                              to={withLang(link.path as string)}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`gh-menu__link${active ? ' is-active' : ''}`}
                              aria-current={active ? 'page' : undefined}
                            >
                              {inner}
                            </Link>
                          ) : (
                            <Link
                              to={`${withLang('/')}#${hash}`}
                              onClick={(e) => handleNavClick(e, hash)}
                              className={`gh-menu__link${active ? ' is-active' : ''}`}
                              aria-current={active ? 'true' : undefined}
                            >
                              {inner}
                            </Link>
                          )}
                        </motion.li>
                      );
                    })}
                  </ul>
                </nav>

                {/* Reece is never hidden (brief section 3): the person behind the contents. */}
                <motion.figure className="gh-menu__founder" {...menuRise(0.26 + navLinksConfig.length * 0.06, 10)}>
                  <img
                    src={founderAvatar}
                    alt=""
                    width={520}
                    height={692}
                    className="gh-menu__founder-img"
                    decoding="async"
                  />
                  <figcaption>
                    <blockquote className="gh-menu__quote">{t('hero.founderNote')}</blockquote>
                    <p className="gh-menu__who">
                      {t('hero.founderName')}
                      <span className="gh-menu__role">{t('footer.dockBrandNote')}</span>
                    </p>
                  </figcaption>
                </motion.figure>
              </div>

              <motion.div className="gh-menu__foot" {...menuRise(0.34 + navLinksConfig.length * 0.06, 10)}>
                <button type="button" onClick={handleSpeakWithUs} className="gh-menu__cta">
                  <span>{t('navigation.speakWithUs')}</span>
                  <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
                </button>
                {/* The globe lives in the top bar, which this panel covers. */}
                <div className="gh-menu__locale">
                  <LocaleDropdown tone="dark" align="start" />
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
