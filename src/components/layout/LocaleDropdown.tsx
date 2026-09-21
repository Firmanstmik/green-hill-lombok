import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Globe } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
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

/**
 * Language + currency.
 *
 * The panel is set as an editorial index rather than a settings menu: a hairline
 * ivory card with a 2px cut corner, Cormorant section heads, the options in
 * Manrope small-caps, and a gold rule marking the current choice instead of a
 * filled row with a tick. Currency reads as a row of set units, because four
 * three-letter codes stacked vertically wasted half the panel's height.
 */
/*
 * Focus is deliberately left to Radix. Suppressing its open/close autofocus
 * kept a ring off the panel on mouse click, but it also meant Tab walked past
 * the panel into the page behind: the options were openable and unreachable.
 * Radix only paints a focus ring for keyboard users, so there was nothing to
 * suppress in the first place.
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
          className={`gh-locale-trigger gh-locale-trigger--${tone}${isPending ? ' is-busy' : ''}`}
          aria-label="Language & Currency"
        >
          {/*
            Fixed 18px. This was `lg:w-[1.2vw]`, so the glyph resized with the
            window — 12px at 1024, 23px at 1920 — and never matched the 14px
            arrow sitting beside it in the CTA.
          */}
          <Globe size={18} strokeWidth={1.5} aria-hidden />
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
              {availableLanguages.map((lang) => (
                <li key={lang}>
                  <button
                    type="button"
                    onClick={() => {
                      if (lang !== language) setLanguage(lang);
                      setOpen(false);
                    }}
                    className={`gh-locale-item${language === lang ? ' is-current' : ''}`}
                    aria-current={language === lang ? 'true' : undefined}
                  >
                    <span className="gh-locale-item__rule" aria-hidden />
                    <span>{languageLabels[lang]}</span>
                  </button>
                </li>
              ))}
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
