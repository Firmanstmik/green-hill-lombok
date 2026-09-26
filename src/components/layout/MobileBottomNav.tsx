import { Home, Map, Leaf, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

type TabKey = 'home' | 'opportunities' | 'why-lombok' | 'contact';

interface MobileBottomNavProps {
  activeHash: string;
  onHome: () => void;
  onNavigate: (hash: string) => void;
  /**
   * Set while the full-screen menu is open. The tab bar sits at z-60 and the
   * menu at z-50, so it used to float over the open menu and cover its primary
   * CTA outright — elementFromPoint on "Talk to Reece" returned a tab-bar
   * button. Retiring the bar for the duration is the honest fix: two competing
   * navigations should never be on screen at once.
   */
  hidden?: boolean;
  /** Only mark Home active on the homepage, not on Private/Archive/etc. */
  isHome?: boolean;
}

const tabs: {
  key: TabKey;
  label: string;
  hash?: string;
  path?: string;
  icon: typeof Home;
}[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'opportunities', label: 'Explore', hash: 'opportunities', icon: Map },
  { key: 'why-lombok', label: 'Lombok', path: '/why-lombok', icon: Leaf },
  { key: 'contact', label: 'Reece', hash: 'contact', icon: MessageCircle },
];

/**
 * Premium mobile app tab bar — Android-style bottom navigation.
 * Desktop: hidden (lg+).
 */
export function MobileBottomNav({
  activeHash,
  onHome,
  onNavigate,
  hidden = false,
  isHome = true,
}: MobileBottomNavProps) {
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (tab: (typeof tabs)[number]) => {
    if (tab.key === 'home') return isHome && !activeHash;
    if (tab.path) return location.pathname.includes(tab.path);
    return isHome && activeHash === tab.hash;
  };

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-[60] lg:hidden transition-opacity duration-300 motion-reduce:transition-none ${
        hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="App navigation"
      aria-hidden={hidden || undefined}
      {...(hidden ? { inert: '' } : {})}
    >
      <div
        className="mx-3 mb-3 rounded-[22px] border border-[#28352A]/08 shadow-[0_12px_40px_rgba(29,33,28,0.18)] overflow-hidden"
        style={{
          background: 'rgba(245, 241, 232, 0.92)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        }}
      >
        <div className="grid grid-cols-4 h-[64px]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab);
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (tab.key === 'home') {
                    onHome();
                    return;
                  }
                  if (tab.path) {
                    navigate(`/${language}${tab.path}`);
                    return;
                  }
                  if (tab.hash) onNavigate(tab.hash);
                }}
                className="relative flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 active:scale-[0.96]"
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span
                    className="absolute top-1.5 w-8 h-1 rounded-full"
                    style={{ backgroundColor: '#C7B38A' }}
                  />
                )}
                <Icon
                  size={22}
                  strokeWidth={active ? 2.25 : 1.75}
                  style={{ color: active ? '#28352A' : 'rgba(40,53,42,0.45)' }}
                />
                <span
                  className="text-[10px] font-medium tracking-[0.04em]"
                  style={{ color: active ? '#28352A' : 'rgba(40,53,42,0.45)' }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <span className="sr-only">{language}</span>
    </nav>
  );
}
