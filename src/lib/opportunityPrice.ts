import { useCurrency, type ExchangeRates, type SupportedCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Source price model.
 * The admin stores the price exactly as entered (`price_amount` + `price_currency`).
 * Nothing ever writes a converted value back over it. Conversions are display-only.
 */
export type PriceCurrency = SupportedCurrency;

export type SourcePrice = { amount: number; currency: PriceCurrency };

const CURRENCIES: PriceCurrency[] = ['IDR', 'USD', 'GBP', 'EUR'];

const LOCALES: Record<string, string> = {
  en: 'en-US',
  id: 'id-ID',
  nl: 'nl-NL',
  es: 'es-ES',
};

function asCurrency(value: unknown): PriceCurrency | null {
  return typeof value === 'string' && CURRENCIES.includes(value as PriceCurrency)
    ? (value as PriceCurrency)
    : null;
}

/** Reads the stable source price from a public record or a raw row. Null means "price on request". */
export function sourcePriceOf(record: object): SourcePrice | null {
  const r = record as Record<string, unknown>;
  if (r.priceOnRequest === true || r.price_on_request === true) return null;
  const amount = Number(r.priceAmount ?? r.price_amount);
  const currency = asCurrency(r.priceCurrency ?? r.price_currency);
  if (Number.isFinite(amount) && amount > 0) return { amount, currency: currency ?? 'IDR' };
  // Legacy rows: `price` was stored in EUR.
  const legacy = Number(r.price);
  if (Number.isFinite(legacy) && legacy > 0) return { amount: legacy, currency: 'EUR' };
  return null;
}

/** The public fallback rates are 1:1 until a live rate arrives. Never convert with those. */
export function ratesAreUsable(rates: ExchangeRates): boolean {
  return rates.IDR > 1000 && rates.USD > 0.3 && rates.GBP > 0.3;
}

export function formatMoney(
  amount: number,
  currency: PriceCurrency,
  language = 'en',
  compact = false,
): string {
  try {
    return new Intl.NumberFormat(LOCALES[language] || 'en-US', {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: compact ? 1 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString('en-US')}`;
  }
}

/** Converts between any two supported currencies through the EUR-based rate table. */
export function convertAmount(
  amount: number,
  from: PriceCurrency,
  to: PriceCurrency,
  rates: ExchangeRates,
): number {
  if (from === to) return amount;
  const inEUR = from === 'EUR' ? amount : amount / rates[from];
  return to === 'EUR' ? inEUR : inEUR * rates[to];
}

/**
 * Public price in the visitor's chosen currency.
 * Falls back to the source currency when no trustworthy rate is loaded.
 */
export type PriceDetail = {
  /** What to show: the source price, or "≈ converted" in the visitor's currency. */
  display: string;
  /** The price exactly as Green Hill set it. */
  source: string;
  /** True when `display` is a conversion (brief §11: label it approximate). */
  approximate: boolean;
};

export function useOpportunityPriceDetail(record: object): PriceDetail | null {
  const { currency, exchangeRates } = useCurrency();
  const { language } = useLanguage();
  const source = sourcePriceOf(record);
  if (!source) return null;
  const exact = formatMoney(source.amount, source.currency, language);
  if (source.currency === currency || !ratesAreUsable(exchangeRates)) {
    return { display: exact, source: exact, approximate: false };
  }
  const converted = formatMoney(convertAmount(source.amount, source.currency, currency, exchangeRates), currency, language);
  return { display: `≈ ${converted}`, source: exact, approximate: true };
}

/**
 * Returns null for "price on request". Conversions are marked "≈".
 */
export function useOpportunityPrice(record: object): string | null {
  return useOpportunityPriceDetail(record)?.display ?? null;
}
