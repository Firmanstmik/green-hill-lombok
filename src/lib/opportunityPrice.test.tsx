import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Real-looking rates (per 1 EUR); the test only needs them to be usable.
const rates = { EUR: 1, USD: 1.08, GBP: 0.85, IDR: 17500 };
let currency = 'IDR';
vi.mock('@/contexts/CurrencyContext', () => ({ useCurrency: () => ({ currency, exchangeRates: rates }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));

const { useOpportunityPriceDetail } = await import('./opportunityPrice');
const record = { price_amount: 1000000000, price_currency: 'IDR', price_on_request: false };

describe('public prices (brief §11)', () => {
  it('shows the source price exactly when the visitor uses the source currency', () => {
    currency = 'IDR';
    const { result } = renderHook(() => useOpportunityPriceDetail(record));
    expect(result.current?.approximate).toBe(false);
    expect(result.current?.display).toMatch(/1,000,000,000/);
  });

  it('marks a converted price as approximate and keeps the source price', () => {
    currency = 'USD';
    const { result } = renderHook(() => useOpportunityPriceDetail(record));
    expect(result.current?.approximate).toBe(true);
    expect(result.current?.display.startsWith('≈ ')).toBe(true);
    expect(result.current?.source).toMatch(/1,000,000,000/);
  });

  it('treats price on request as no price', () => {
    const { result } = renderHook(() => useOpportunityPriceDetail({ price_on_request: true }));
    expect(result.current).toBeNull();
  });
});
