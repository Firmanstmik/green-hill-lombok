import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';

export type SupportedCurrency = 'USD' | 'EUR' | 'IDR' | 'GBP';

export interface ExchangeRates {
  [key: string]: number;
}

export interface CurrencyContextType {
  currency: SupportedCurrency;
  setCurrency: (curr: SupportedCurrency) => void;
  exchangeRates: ExchangeRates;
  convert: (amountInEUR: number, targetCurrency: SupportedCurrency) => number;
  fromEUR: (amountInEUR: number, targetCurrency: SupportedCurrency) => number;
  convertToEUR: (amountInAny: number, fromCurrency: SupportedCurrency) => number;
  formatPrice: (amountInEUR: number, targetCurrency: SupportedCurrency, language: string) => string;
  isDetecting: boolean;
  isLoading: boolean;
  availableCurrencies: SupportedCurrency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'IDR', 'GBP'];
const STORAGE_KEY = 'greenhill_currency_preference';
const EXCHANGE_RATES_KEY = 'greenhill_exchange_rates';
const EXCHANGE_RATES_TIMESTAMP_KEY = 'greenhill_exchange_rates_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Map country code to default currency
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  US: 'USD',
  GB: 'GBP',
  ID: 'IDR',
  NL: 'EUR',
  ES: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  GR: 'EUR',
  // Default to EUR for Europe
};

// Fetch exchange rates from exchangerate.host (EUR base)
async function fetchExchangeRates(): Promise<ExchangeRates> {
  const apis = [
    'https://api.exchangerate.host/latest?base=EUR&symbols=USD,EUR,IDR,GBP',
    'https://api.exchangerate-api.com/v4/latest/EUR',
    'https://open.er-api.com/v6/latest/EUR',
  ];

  for (const url of apis) {
    try {
      console.log(`🌐 Fetching from: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 Raw API response from ${url}:`, data);

      let rates: ExchangeRates;

      // Handle different API response formats
      if (data.rates) {
        rates = {
          EUR: 1,
          USD: data.rates.USD || 1,
          IDR: data.rates.IDR || 1,
          GBP: data.rates.GBP || 1,
        };
      } else {
        throw new Error('Invalid response format');
      }

      console.log('✅ Exchange rates fetched successfully:', rates);
      return rates;
    } catch (error) {
      console.error(`❌ Failed to fetch from ${url}:`, error instanceof Error ? error.message : error);
      // Continue to next API
    }
  }

  // All APIs failed — return safe 1:1 fallback so the app keeps working
  console.error('❌ All exchange rate APIs failed');
  return { EUR: 1, USD: 1, IDR: 1, GBP: 1 };
}

// Get cached exchange rates or fetch new ones
async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  const cachedTimestamp = localStorage.getItem(EXCHANGE_RATES_TIMESTAMP_KEY);
  const cachedRates = localStorage.getItem(EXCHANGE_RATES_KEY);

  // Check if cache is still valid (< 24 hours)
  if (cachedTimestamp && cachedRates) {
    const cacheAge = now - parseInt(cachedTimestamp, 10);
    if (cacheAge < CACHE_DURATION_MS) {
      console.log('💾 Using cached exchange rates:', JSON.parse(cachedRates));
      return JSON.parse(cachedRates);
    }
  }

  // Fetch new rates
  const newRates = await fetchExchangeRates();

  if (newRates) {
    // Cache with timestamp
    localStorage.setItem(EXCHANGE_RATES_KEY, JSON.stringify(newRates));
    localStorage.setItem(EXCHANGE_RATES_TIMESTAMP_KEY, now.toString());
    console.log('💾 Cached new exchange rates');
    return newRates;
  }

  // Fallback to cached rates if fetch fails
  if (cachedRates) {
    console.warn('⚠️ Using cached exchange rates (API failed):', JSON.parse(cachedRates));
    return JSON.parse(cachedRates);
  }

  // Fallback to 1:1 if no cache available
  console.error('❌ Exchange rates unavailable, using 1:1 fallback');
  return { USD: 1, EUR: 1, IDR: 1, GBP: 1 };
}

// Detect user's default currency via IP geolocation
async function detectCurrency(): Promise<SupportedCurrency> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800); // Very short 800ms timeout

    // ipapi.co is generally more reliable for CORS-enabled free IP detection
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const countryCode = data.country?.toUpperCase(); // ipapi uses 'country'

    if (countryCode && COUNTRY_TO_CURRENCY[countryCode]) {
      return COUNTRY_TO_CURRENCY[countryCode];
    }

    return 'EUR'; // Default to EUR
  } catch (error) {
    // Fail silently and quickly to avoid delaying the UI
    return 'EUR';
  }
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>('EUR');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 1,
    EUR: 1,
    IDR: 1,
    GBP: 1,
  });
  const [isDetecting, setIsDetecting] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize: load stored preference or detect currency
  useEffect(() => {
    const init = async () => {
      try {
        // Load exchange rates (this is blocking for initialization)
        const rates = await getExchangeRates();
        console.log('🔄 CurrencyContext: Exchange rates loaded:', rates);
        setExchangeRates(rates);

        // Check for stored currency preference
        const storedCurrency = localStorage.getItem(STORAGE_KEY);
        if (storedCurrency && SUPPORTED_CURRENCIES.includes(storedCurrency as SupportedCurrency)) {
          console.log('💾 CurrencyContext: Using stored currency:', storedCurrency);
          setCurrencyState(storedCurrency as SupportedCurrency);
          setIsDetecting(false);
        } else {
          // Auto-detect currency (non-blocking)
          const detected = await detectCurrency();
          console.log('🌍 CurrencyContext: Detected currency:', detected);
          setCurrencyState(detected);
          setIsDetecting(false);
        }
      } catch (error) {
        console.error('Failed to initialize currency:', error);
        setIsDetecting(false);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Handle currency change
  const handleSetCurrency = useCallback((newCurrency: SupportedCurrency) => {
    if (newCurrency === currency) return;

    setCurrencyState(newCurrency);
    localStorage.setItem(STORAGE_KEY, newCurrency);
  }, [currency]);

  // Convert amount from EUR to target currency
  const convert = useCallback((amountInEUR: number, targetCurrency: SupportedCurrency): number => {
    if (targetCurrency === 'EUR') {
      return amountInEUR;
    }

    const rate = exchangeRates[targetCurrency];
    if (!rate) {
      console.warn(`No exchange rate found for ${targetCurrency}, returning original amount`);
      return amountInEUR;
    }

    const converted = amountInEUR * rate;
    console.log(`💱 Converting: ${amountInEUR} EUR × ${rate} (${targetCurrency}) = ${converted}`);
    // Always convert from EUR base to avoid cumulative rounding errors
    return converted;
  }, [exchangeRates]);
  
  // Convert amount from ANY currency back to EUR
  const convertToEUR = useCallback((amountInAny: number, fromCurrency: SupportedCurrency): number => {
    if (fromCurrency === 'EUR') {
      return amountInAny;
    }

    const rate = exchangeRates[fromCurrency];
    if (!rate || rate === 0) {
      console.warn(`No exchange rate found for ${fromCurrency}, returning original amount`);
      return amountInAny;
    }

    const converted = amountInAny / rate;
    console.log(`💱 Converting back: ${amountInAny} ${fromCurrency} ÷ ${rate} = ${converted} EUR`);
    return converted;
  }, [exchangeRates]);

  // Format price with currency and locale-specific formatting
  const formatPrice = useCallback(
    (amountInEUR: number, targetCurrency: SupportedCurrency, language: string): string => {
      const convertedAmount = convert(amountInEUR, targetCurrency);
      console.log(`📍 formatPrice called: ${amountInEUR} EUR → ${convertedAmount} ${targetCurrency}`);

      // Map language code to locale for Intl.NumberFormat
      const localeMap: Record<string, string> = {
        en: 'en-US',
        id: 'id-ID',
        nl: 'nl-NL',
        es: 'es-ES',
      };

      const locale = localeMap[language] || 'en-US';

      try {
        const formatted = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: targetCurrency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(convertedAmount);
        console.log(`✅ Formatted: ${formatted}`);
        return formatted;
      } catch (error) {
        console.warn(`Failed to format price for ${targetCurrency}:`, error);
        return `${targetCurrency} ${convertedAmount.toLocaleString()}`;
      }
    },
    [convert]
  );

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<CurrencyContextType>(
    () => ({
      currency,
      setCurrency: handleSetCurrency,
      exchangeRates,
      convert,
      fromEUR: convert,
      convertToEUR,
      formatPrice,
      isDetecting,
      isLoading,
      availableCurrencies: SUPPORTED_CURRENCIES,
    }),
    [currency, exchangeRates, convert, formatPrice, isDetecting, isLoading, handleSetCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }

  return context;
}
