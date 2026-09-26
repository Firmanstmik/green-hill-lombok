import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import { BrandCurveMark } from '@/components/brand/BrandCurveMark';
import { useLanguage, SupportedLanguage } from '@/contexts/LanguageContext';
import { useCurrency, SupportedCurrency } from '@/contexts/CurrencyContext';

const GH_EASE = [0.22, 1, 0.36, 1] as const;

const languageLabels: Record<SupportedLanguage, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
  nl: 'Nederlands',
  es: 'Español',
};

const currencyLabels: Record<SupportedCurrency, string> = {
  USD: 'USD',
  EUR: 'EUR',
  IDR: 'IDR',
  GBP: 'GBP',
};

type Props = {
  /**
   * Which surface the trigger sits on. `dark` is the hero photograph (ivory
   * ink), `light` is the scrolled bar and the mobile menu (forest ink).
   */
  tone?: 'dark' | 'light';
  align?: 'start' | 'end';
};

/** Interactive globe — meridians drift on hover/open; gold accent ring. */
function LocaleGlobe({ active }: { active: boolean }) {
  const reduce = useReducedMotion();

  return (
    <span className="gh-locale-globe" data-active={active ? 'true' : 'false'} aria-hidden>
      <motion.svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        className="gh-locale-globe__svg"
        animate={
          reduce
            ? undefined
            : active
              ? { rotate: [0, 8, -4, 0] }
              : { rotate: 0 }
        }
        transition={
          active
            ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.35, ease: GH_EASE }
        }
      >
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.35" />
        <ellipse
          cx="12"
          cy="12"
          rx="3.4"
          ry="8.25"
          stroke="currentColor"
          strokeWidth="1.15"
          opacity="0.85"
        />
        <path
          d="M4.2 9.2h15.6M4.2 14.8h15.6"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity="0.7"
        />
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          className="gh-locale-globe__ring"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          initial={false}
          animate={
            reduce
              ? { opacity: active ? 0.35 : 0, scale: 1 }
              : active
                ? { opacity: [0.15, 0.45, 0.15], scale: [0.92, 1.05, 0.92] }
                : { opacity: 0, scale: 0.9 }
          }
          transition={
            active
              ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
        />
      </motion.svg>
    </span>
  );
}

/**
 * Language + currency.
 *
 * Editorial panel: BrandCurveMark wave marks the current language (same
 * signature as section eyebrows). Globe trigger animates while open.
 * Language swaps keep scroll position (ScrollToTop + preventScrollReset).
 */
export function LocaleDropdown({ tone = 'light', align = 'end' }: Props) {
  const { language, setLanguage, availableLanguages, t, isPending } = useLanguage();
  const { currency, setCurrency, availableCurrencies } = useCurrency();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`gh-locale-trigger gh-locale-trigger--${tone}${isPending ? ' is-busy' : ''}${open ? ' is-open' : ''}`}
          aria-label="Language & Currency"
        >
          <LocaleGlobe active={open} />
          <span className="gh-locale-trigger__code" aria-hidden>
            {language.toUpperCase()}
          </span>
          <span className="sr-only">{languageLabels[language]}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align={align}
          sideOffset={14}
          collisionPadding={16}
          className="gh-locale-panel"
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.32, ease: GH_EASE }}
          >
            <p className="gh-locale-head">{t('common.language')}</p>
            <ul className="gh-locale-list">
              {availableLanguages.map((lang) => {
                const current = language === lang;
                return (
                  <li key={lang}>
                    <button
                      type="button"
                      onClick={() => {
                        if (lang !== language) setLanguage(lang);
                        setOpen(false);
                      }}
                      className={`gh-locale-item${current ? ' is-current' : ''}`}
                      aria-current={current ? 'true' : undefined}
                    >
                      <span className="gh-locale-item__mark" aria-hidden>
                        {current ? (
                          <BrandCurveMark className="gh-locale-item__wave" isInView />
                        ) : (
                          <span className="gh-locale-item__spacer" />
                        )}
                      </span>
                      <span>{languageLabels[lang]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="gh-locale-head gh-locale-head--spaced">{t('common.currency')}</p>
            <ul className="gh-locale-units">
              {availableCurrencies.map((curr) => (
                <li key={curr}>
                  <button
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`gh-locale-unit${currency === curr ? ' is-current' : ''}`}
                    aria-current={currency === curr ? 'true' : undefined}
                  >
                    {currencyLabels[curr]}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
