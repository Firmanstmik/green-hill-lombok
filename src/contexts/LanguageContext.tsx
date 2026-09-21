import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition, ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
const LEGACY_STORAGE_KEY = 'ukon_language_preference';

async function loadTranslations(lang: SupportedLanguage): Promise<Record<string, any>> {
  try {
    const module = await import(`@/lib/i18n/translations/${lang}.json`);
    return module.default;
  } catch (error) {
    console.warn(`Failed to load translations for ${lang}, falling back to English`, error);
    if (lang !== 'en') {
      return loadTranslations('en');
    }
    return {};
  }
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
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
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
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const enFallbackRef = useRef<Record<string, any>>({});

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);

      if (Object.keys(enFallbackRef.current).length === 0) {
        enFallbackRef.current = await loadTranslations('en');
      }

      const trans =
        language === 'en' ? enFallbackRef.current : await loadTranslations(language);

      if (isMounted) {
        setTranslations(trans);
        setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
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
      localStorage.setItem(LEGACY_STORAGE_KEY, newLang);

      startTransition(() => {
        setLanguageState(newLang);

        const pathSegments = location.pathname.split('/').filter(Boolean);
        if (SUPPORTED_LANGUAGES.includes(pathSegments[0] as SupportedLanguage)) {
          pathSegments[0] = newLang;
        } else {
          pathSegments.unshift(newLang);
        }

        const nextPath = `/${pathSegments.join('/')}${location.search}${location.hash}`;
        navigate(nextPath);
      });
    },
    [language, location.pathname, location.search, location.hash, navigate]
  );

  const t = useCallback(
    (key?: string): string => {
      if (typeof key !== 'string') return '';

      const value = resolveKey(key, translations);
      if (value !== undefined) return value;

      const fallback = resolveKey(key, enFallbackRef.current);
      if (fallback !== undefined) return fallback;

      return key;
    },
    [translations, language]
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
    return <div className="min-h-screen bg-background" />;
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
