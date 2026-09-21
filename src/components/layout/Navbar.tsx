import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LocaleDropdown } from '@/components/layout/LocaleDropdown';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
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

/** Solid bar height at lg — anchored scrolls clear it by exactly this much. */
const NAV_OFFSET = 104;

/** Shared with the hero — one easing curve across the whole chrome. */
const GH_EASE = [0.22, 1, 0.36, 1] as const;

const navLinksConfig = [
  { key: 'opportunities', hash: 'opportunities', labelKey: 'navigation.opportunities' },
  { key: 'why-lombok', hash: 'why-lombok', labelKey: 'navigation.whyLombok' },
  { key: 'about', hash: 'about', labelKey: 'navigation.about' },
  { key: 'notes', path: '/intelligence', labelKey: 'navigation.notes' },
  { key: 'contact', hash: 'contact', labelKey: 'navigation.contact' },
] as const;

const HASH_TO_DOM: Record<string, string> = {
  opportunities: 'opportunities',
  'why-lombok': 'why-lombok',
  about: 'about',
  contact: 'contact',
};

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  /** Hero chrome entrance plays once per page load — not again on scroll-back. */
  const heroEntrancePlayed = useRef(false);

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
        const active = location.pathname.includes(link.path);
        return (
          <Link
            key={link.key}
            to={withLang(link.path)}
            className={`${className}${active ? ' is-active' : ''}`}
          >
            <span>{t(link.labelKey)}</span>
          </Link>
        );
      }
      const hash = 'hash' in link ? link.hash : '';
      const active = activeHash === hash;
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
                <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
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
                  {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
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
                <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <div className="gh-nav-bar__mobile">
              <LocaleDropdown />
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-[#1A2116]"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
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

      <MobileBottomNav
        hidden={isMobileMenuOpen}
        activeHash={activeHash}
        onHome={scrollToTop}
        onNavigate={(hash) => {
          if (!isHome) {
            window.location.href = `${withLang('/')}#${hash}`;
            return;
          }
          scrollToSection(hash);
        }}
      />

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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.34, ease: GH_EASE }}
              className="gh-menu fixed inset-0 z-[80] lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={t('navigation.menu')}
            >
              <div className="gh-menu__bar">
                {/* The ivory hero lockup would vanish on this ivory sheet. */}
                <img
                  src={ghLogoSolidStacked}
                  srcSet={`${ghLogoSolidStacked} 1x, ${ghLogoSolidStacked2x} 2x`}
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
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <nav className="gh-menu__nav" aria-label="Primary">
                <ol className="gh-menu__list">
                  {navLinksConfig.map((link, i) => {
                    const hash = 'hash' in link ? link.hash : '';
                    const isPath = 'path' in link && link.path;
                    const active = isPath
                      ? location.pathname.includes(link.path as string)
                      : activeHash === hash;
                    const inner = (
                      <>
                        <span className="gh-menu__num" aria-hidden>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="gh-menu__label">{t(link.labelKey)}</span>
                      </>
                    );
                    return (
                      <motion.li
                        key={link.key}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: reduceMotion ? 0.25 : 0.62,
                          delay: reduceMotion ? 0 : 0.06 + i * 0.055,
                          ease: GH_EASE,
                        }}
                      >
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
                </ol>
              </nav>

              <motion.div
                className="gh-menu__foot"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0.25 : 0.62,
                  delay: reduceMotion ? 0 : 0.06 + navLinksConfig.length * 0.055,
                  ease: GH_EASE,
                }}
              >
                <button type="button" onClick={handleSpeakWithUs} className="gh-menu__cta">
                  <span>{t('navigation.speakWithUs')}</span>
                  <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
                </button>
                {/* The globe lives in the top bar, which this panel covers. */}
                <div className="gh-menu__locale">
                  <LocaleDropdown tone="light" align="start" />
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
