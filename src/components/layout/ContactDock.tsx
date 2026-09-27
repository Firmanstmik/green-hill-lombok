import { useCallback, useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GhIconCaretDown,
  GhIconCaretUp,
  GhIconConverse,
  GhIconLetter,
  GhIconWhatsApp,
} from '@/components/brand/GhIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { generalWhatsAppLink } from '@/lib/contact';
import { useContactSettings } from '@/content/hooks';
import ghLogoSolid from '@/assets/greenhill/hero/green-hill-logo-solid-112.webp';
import ghLogoSolid2x from '@/assets/greenhill/hero/green-hill-logo-solid-168.webp';

/**
 * Fixed contact dock — VON-style slide-up rail adapted to Green Hill.
 * The same open/close tab is used on desktop and on the phone.
 * On the homepage it stays hidden through the hero, then slides up once
 * the visitor reaches the sections below.
 */
export function ContactDock() {
  const { language, t } = useLanguage();
  const contact = useContactSettings();
  const whatsappHref = generalWhatsAppLink(language);
  const location = useLocation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const basePath = pathSegments.slice(1).length > 0 ? `/${pathSegments.slice(1).join('/')}` : '/';
  const isHome = basePath === '/';
  const isArchive = basePath === '/properties' || basePath.startsWith('/property/');

  const withLang = (path: string) => `/${language}${path === '/' ? '' : path}`;

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!isHome) {
      setRevealed(true);
      return;
    }

    const update = () => {
      const hero = document.querySelector('.gh-hero') as HTMLElement | null;
      if (!hero) {
        setRevealed(true);
        return;
      }
      // Reveal once the hero has largely left the viewport.
      const bottom = hero.getBoundingClientRect().bottom;
      setRevealed((was) => {
        if (was) return bottom < window.innerHeight * 0.55;
        return bottom < window.innerHeight * 0.42;
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isHome, location.pathname]);

  useEffect(() => {
    if (!revealed) setOpen(false);
  }, [revealed]);

  return (
    <div
      className={`gh-contact-dock${open ? ' is-open' : ' is-closed'}${revealed ? ' is-revealed' : ''}`}
      role="complementary"
      aria-label={t('footer.dockAria')}
      aria-hidden={!revealed}
    >
      <div className="gh-contact-dock__rail">
        <button
          type="button"
          className="gh-contact-dock__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          tabIndex={revealed ? 0 : -1}
          onClick={toggle}
        >
          {open ? (
            <GhIconCaretDown className="gh-contact-dock__toggle-icon" size={13} />
          ) : (
            <GhIconCaretUp className="gh-contact-dock__toggle-icon" size={13} />
          )}
          {open
            ? t('footer.dockClose')
            : isArchive
              ? t('navigation.speakWithUs')
              : t('footer.floatContact')}
        </button>

        <div id={panelId} className="gh-contact-dock__panel">
          <div className="gh-contact-dock__inner">
            <div className="gh-contact-dock__brand">
              <Link to={withLang('/')} className="gh-contact-dock__logo" aria-label="Green Hill Lombok" onClick={close}>
                <img
                  src={ghLogoSolid}
                  srcSet={`${ghLogoSolid} 1x, ${ghLogoSolid2x} 2x`}
                  alt=""
                  width={112}
                  height={40}
                  className="gh-contact-dock__logo-img"
                  decoding="async"
                />
              </Link>
              <div className="gh-contact-dock__brand-copy">
                <p className="gh-contact-dock__brand-name">Green Hill</p>
                <p className="gh-contact-dock__brand-note">{t('footer.dockBrandNote')}</p>
              </div>
            </div>

            <div className="gh-contact-dock__divider" aria-hidden />

            <div className="gh-contact-dock__actions">
              <a href={`mailto:${contact.email}`} className="gh-contact-dock__action">
                <span className="gh-contact-dock__action-icon" aria-hidden>
                  <GhIconLetter size={17} />
                </span>
                <span className="gh-contact-dock__action-copy">
                  <span className="gh-contact-dock__action-label">{t('footer.dockEmailLabel')}</span>
                  <span className="gh-contact-dock__action-meta">{contact.email}</span>
                </span>
              </a>

              <a
                href={whatsappHref}
                className="gh-contact-dock__action gh-contact-dock__action--accent"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
              >
                <span className="gh-contact-dock__action-icon" aria-hidden>
                  <GhIconConverse size={17} />
                </span>
                <span className="gh-contact-dock__action-copy">
                  <span className="gh-contact-dock__action-label">{t('footer.dockTalkLabel')}</span>
                  <span className="gh-contact-dock__action-meta">{t('footer.dockTalkMeta')}</span>
                </span>
              </a>

              <a
                href={whatsappHref}
                className="gh-contact-dock__action gh-contact-dock__action--social"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="gh-contact-dock__action-icon gh-contact-dock__action-icon--wa" aria-hidden>
                  <GhIconWhatsApp size={17} />
                </span>
                <span className="gh-contact-dock__action-copy">
                  <span className="gh-contact-dock__action-label">{t('footer.whatsapp')}</span>
                  <span className="gh-contact-dock__action-meta">{contact.whatsappDisplay}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
