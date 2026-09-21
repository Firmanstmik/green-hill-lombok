import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Green Hill footer — supporting infrastructure after Final CTA.
 * No placeholder email/phone presented as real contact details.
 */

interface FooterLink {
  label: string;
  path: string;
  hash?: boolean;
}

const exploreLinks: FooterLink[] = [
  { label: 'Opportunities', path: '/properties' },
  { label: 'Why Lombok', path: '/#why-lombok', hash: true },
  { label: 'About', path: '/#about', hash: true },
  { label: 'Talk to Reece', path: '/#contact', hash: true },
];

const approachLinks: FooterLink[] = [
  { label: 'Land Opportunities', path: '/properties' },
  { label: 'Villa Opportunities', path: '/properties' },
  { label: 'Development Plots', path: '/properties' },
  { label: 'Buying in Lombok', path: '/buying-in-lombok' },
];

export function Footer() {
  const { language, t } = useLanguage();

  const getLocalizedPath = (path: string) => {
    if (path === '#') return path;
    const [pathname, query] = path.split('?');
    return `/${language}${pathname}${query ? `?${query}` : ''}`;
  };

  const renderLink = (link: FooterLink) => {
    const className = 'text-sm text-white/55 hover:text-white/90 transition-colors duration-150';

    if (link.hash) {
      const [pathPart, hashPart] = link.path.split('#');
      const localizedPath = pathPart === '/' ? `/${language}` : `/${language}${pathPart}`;
      return (
        <Link to={`${localizedPath}#${hashPart}`} className={className}>
          {link.label}
        </Link>
      );
    }

    return (
      <Link to={getLocalizedPath(link.path)} className={className}>
        {link.label}
      </Link>
    );
  };

  return (
    <footer className="gh-footer scroll-mt-24">
      <div className="gh-footer__inner py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-10">
            <div>
              <Link to={getLocalizedPath('/')} className="inline-block mb-6">
                <span className="font-display font-medium text-2xl tracking-[0.08em] uppercase text-white">
                  Green Hill
                </span>
              </Link>
              <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-xs">
                {t('footer.tagline')}
              </p>
              <p className="text-sm text-white/40">{t('footer.location')}</p>
            </div>

            <div>
              <h4 className="text-xs font-medium tracking-[0.2em] uppercase text-white/30 mb-6">
                {t('footer.explore')}
              </h4>
              <ul className="space-y-3">
                {exploreLinks.map((link) => (
                  <li key={link.label}>{renderLink(link)}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-medium tracking-[0.2em] uppercase text-white/30 mb-6">
                {t('footer.approach')}
              </h4>
              <ul className="space-y-3">
                {approachLinks.map((link) => (
                  <li key={link.label}>{renderLink(link)}</li>
                ))}
              </ul>
            </div>
          </div>
      </div>

      <div className="gh-footer__inner">
        <div className="h-px bg-white/8" />
      </div>

      <div className="gh-footer__inner py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Green Hill. {t('footer.rights')}
          </p>
          <p className="text-xs text-white/25 tracking-[0.12em] uppercase">
            {t('footer.locationShort')}
          </p>
        </div>
      </div>
    </footer>
  );
}
