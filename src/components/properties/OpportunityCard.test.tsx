import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import type { Property } from '@/data/mockData';
import { OpportunityCard } from './OpportunityCard';

beforeAll(() => {
  // jsdom has no IntersectionObserver; the card's reveal uses it.
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', NoopObserver);
});

const base = {
  id: 'a',
  title: 'Coastal land',
  address: 'Are Guling, South Lombok',
  price: 0,
  priceType: 'sale',
  sqft: 9200,
  status: 'sale',
  featured: true,
  type: 'land',
  images: [],
} as unknown as Property;

function renderCard(props: Partial<Parameters<typeof OpportunityCard>[0]> & { property: Property }) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <CurrencyProvider>
          <OpportunityCard index={0} {...props} />
        </CurrencyProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('OpportunityCard', () => {
  it('gives the featured opportunity editorial room: wider card and its summary', () => {
    const property = { ...base, summary: 'A quiet coastal plot we walked in person.' } as Property;
    const { container } = renderCard({ property, feature: true });
    expect(container.querySelector('article')).toHaveClass('is-featured');
    expect(screen.getByText('A quiet coastal plot we walked in person.')).toBeInTheDocument();
  });

  it('shows the summary, a share control, and no favourite control', () => {
    const property = { ...base, summary: 'A quiet coastal plot we walked in person.' } as Property;
    const { container } = renderCard({ property });
    expect(container.querySelector('article')).not.toHaveClass('is-featured');
    expect(screen.getByText('A quiet coastal plot we walked in person.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /love|favourite|favorite|save/i })).toBeNull();
    expect(screen.getByRole('link', { name: /request briefing/i })).toBeInTheDocument();
  });

  it('shows Price on request rather than 0 when no price is set', () => {
    renderCard({ property: base });
    expect(screen.getByText(/price on request/i)).toBeInTheDocument();
    expect(screen.queryByText(/\b0\b/)).toBeNull();
  });
});
