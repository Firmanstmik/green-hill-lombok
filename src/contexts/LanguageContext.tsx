import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition, ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import enTranslations from '@/lib/i18n/translations/en.json';
import idTranslations from '@/lib/i18n/translations/id.json';
import nlTranslations from '@/lib/i18n/translations/nl.json';
import esTranslations from '@/lib/i18n/translations/es.json';
import { useContentState } from '@/content/ContentContext';

export type SupportedLanguage = 'en' | 'id' | 'nl' | 'es';

export interface LanguageContextType {
  language: SupportedLanguage;
  translations: Record<string, any>;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key?: string) => string;
  isLoading: boolean;
  isPending: boolean;
  availableLanguages: SupportedLanguage[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'id', 'nl', 'es'];
const STORAGE_KEY = 'greenhill_language_preference';

/** Static map — avoids Vite dynamic JSON import() failures (raw application/json). */
const TRANSLATIONS: Record<SupportedLanguage, Record<string, any>> = {
  en: enTranslations,
  id: idTranslations,
  nl: nlTranslations,
  es: esTranslations,
};

function loadTranslations(lang: SupportedLanguage): Record<string, any> {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}

function resolveKey(key: string, obj: Record<string, any>): string | undefined {
  const value = key.split('.').reduce<any>((acc, part) => acc?.[part], obj);
  return typeof value === 'string' ? value : undefined;
}

function detectLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)) {
    return browserLang as SupportedLanguage;
  }
  return 'en';
}

/** Read lang from pathname — LanguageProvider sits outside Route /:lang so useParams is empty */
export function getLangFromPath(pathname: string): SupportedLanguage | undefined {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg && SUPPORTED_LANGUAGES.includes(seg as SupportedLanguage)) {
    return seg as SupportedLanguage;
  }
  return undefined;
}

function readStoredLanguage(): SupportedLanguage | undefined {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
    return stored as SupportedLanguage;
  }
  return undefined;
}

function resolveLanguage(urlLang: string | undefined): SupportedLanguage {
  if (urlLang && SUPPORTED_LANGUAGES.includes(urlLang as SupportedLanguage)) {
    return urlLang as SupportedLanguage;
  }
  return readStoredLanguage() ?? detectLanguage();
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const urlLang = getLangFromPath(location.pathname);

  const [language, setLanguageState] = useState<SupportedLanguage>(() =>
    resolveLanguage(urlLang)
  );
  const [translations, setTranslations] = useState<Record<string, any>>(() =>
    loadTranslations(resolveLanguage(urlLang))
  );
  const [isLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const enFallbackRef = useRef<Record<string, any>>(TRANSLATIONS.en);

  useEffect(() => {
    setTranslations(loadTranslations(language));
    enFallbackRef.current = TRANSLATIONS.en;
  }, [language]);

  // URL is authoritative when it contains a supported lang prefix
  useEffect(() => {
    if (!urlLang) return;
    if (urlLang === language) return;
    startTransition(() => {
      setLanguageState(urlLang);
      localStorage.setItem(STORAGE_KEY, urlLang);
    });
  }, [urlLang, language]);

  const handleSetLanguage = useCallback(
    (newLang: SupportedLanguage) => {
      if (newLang === language) return;

      localStorage.setItem(STORAGE_KEY, newLang);

      // Pin scroll through the URL swap so a deep-page language change stays put.
      const scrollY = window.scrollY;
      const restoreScroll = () => {
        if (Math.abs(window.scrollY - scrollY) > 1) {
          window.scrollTo({ top: scrollY, left: 0 });
        }
      };

      startTransition(() => {
        setLanguageState(newLang);

        const pathSegments = location.pathname.split('/').filter(Boolean);
        if (SUPPORTED_LANGUAGES.includes(pathSegments[0] as SupportedLanguage)) {
          pathSegments[0] = newLang;
        } else {
          pathSegments.unshift(newLang);
        }

        const nextPath = `/${pathSegments.join('/')}${location.search}${location.hash}`;
        navigate(nextPath, { preventScrollReset: true });
      });

      restoreScroll();
      requestAnimationFrame(() => {
        restoreScroll();
        requestAnimationFrame(restoreScroll);
      });
      window.setTimeout(restoreScroll, 0);
      window.setTimeout(restoreScroll, 80);
    },
    [language, location.pathname, location.search, location.hash, navigate]
  );

  // Copy Reece edited in the admin (published, or drafts in his preview).
  const content = useContentState();

  const t = useCallback(
    (key?: string): string => {
      if (typeof key !== 'string') return '';

      const custom = content.fields[language]?.[key];
      if (typeof custom === 'string' && custom.trim() !== '') return custom;

      const value = resolveKey(key, translations);
      if (value !== undefined) return value;

      const fallback = resolveKey(key, enFallbackRef.current);
      if (fallback !== undefined) return fallback;

      return key;
    },
    [translations, language, content]
  );

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      translations,
      setLanguage: handleSetLanguage,
      t,
      isLoading,
      isPending,
      availableLanguages: SUPPORTED_LANGUAGES,
    }),
    [language, translations, handleSetLanguage, t, isLoading, isPending]
  );

  if (isLoading) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
