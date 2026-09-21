import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { HeroSection } from '../HeroSection';
import { HERO_SLIDES } from './heroData';

beforeAll(() => {
  // jsdom ships neither of these; the hero pauses autoplay through both.
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

function renderHero() {
  return render(
    <MemoryRouter initialEntries={['/en']}>
      <LanguageProvider>
        <CurrencyProvider>
          <HeroSection />
        </CurrencyProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('hero — structure', () => {
  it('exposes exactly one h1', async () => {
    renderHero();
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('gives the photograph descriptive alt text, not a filename', async () => {
    renderHero();
    const img = await screen.findByRole('img', { name: /south lombok/i });
    expect(img.getAttribute('alt')!.length).toBeGreaterThan(30);
  });
});

describe('hero — chapter navigation', () => {
  it('marks the active chapter with aria-current rather than the tab pattern', async () => {
    renderHero();
    const nav = await screen.findByRole('navigation', { name: /hero chapters/i });
    const buttons = within(nav).getAllByRole('button');

    expect(buttons).toHaveLength(HERO_SLIDES.length);
    expect(buttons.filter((b) => b.getAttribute('aria-current') === 'true')).toHaveLength(1);
    // A tablist pointing at a non-tabpanel was the previous, invalid shape.
    expect(within(nav).queryAllByRole('tab')).toHaveLength(0);
  });

  it('labels each chapter for screen readers even though the title is decorative', async () => {
    renderHero();
    const nav = await screen.findByRole('navigation', { name: /hero chapters/i });
    for (const slide of HERO_SLIDES) {
      expect(
        within(nav).getByRole('button', { name: `Chapter ${slide.number}, ${slide.title}` })
      ).toBeInTheDocument();
    }
  });
});

describe('hero — image delivery', () => {
  it('serves each chapter as a single untouched master WebP', async () => {
    const { container } = renderHero();
    await screen.findByRole('heading', { level: 1 });

    // No responsive ladder / picture art-direction — masters only.
    expect(container.querySelectorAll('picture source')).toHaveLength(0);

    const img = container.querySelector('img.gh-hero-img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(HERO_SLIDES[0].src);
    expect(img.getAttribute('srcset')).toBeNull();
  });

  it('prioritises the LCP frame and reserves its box', async () => {
    const { container } = renderHero();
    await screen.findByRole('heading', { level: 1 });

    const img = container.querySelector('img.gh-hero-img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    // Intrinsic size present => no layout shift while it decodes.
    expect(img.getAttribute('width')).toBeTruthy();
    expect(img.getAttribute('height')).toBeTruthy();
  });

  it('declares a per-breakpoint focal point instead of relying on center-crop', async () => {
    const { container } = renderHero();
    await screen.findByRole('heading', { level: 1 });

    const img = container.querySelector('img.gh-hero-img') as HTMLImageElement;
    expect(img.style.getPropertyValue('--gh-focus-desktop')).toBe(HERO_SLIDES[0].focus.desktop);
    expect(img.style.getPropertyValue('--gh-focus-mobile')).toBe(HERO_SLIDES[0].focus.mobile);
  });
});

describe('hero — chapter sequence', () => {
  it('leads with land & ocean, then light, then on-the-ground', () => {
    expect(HERO_SLIDES.map((s) => s.title)).toEqual([
      'Land & Ocean',
      'Land & Light',
      'On the Ground',
    ]);
    expect(HERO_SLIDES.map((s) => s.src)).toEqual([
      HERO_SLIDES[0].src,
      HERO_SLIDES[1].src,
      HERO_SLIDES[2].src,
    ]);
    // Three distinct masters.
    expect(new Set(HERO_SLIDES.map((s) => s.src)).size).toBe(3);
  });
});

describe('hero — slide prefetch', () => {
  it('warms the next chapter master without duplicating formats', async () => {
    renderHero();
    await screen.findByRole('heading', { level: 1 });

    const links = Array.from(
      document.head.querySelectorAll('link[rel="preload"][as="image"][fetchpriority="low"]')
    );
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('type')).toBe('image/webp');
    expect(links[0].getAttribute('href')).toBe(HERO_SLIDES[1].src);
    // It must warm the *next* frame, not re-request the one already on screen.
    expect(links[0].getAttribute('href')).not.toBe(HERO_SLIDES[0].src);
  });
});

describe('hero — founder presence', () => {
  it('renders Reece as an editorial annotation with a quiet link', async () => {
    renderHero();
    const aside = await screen.findByRole('complementary');
    expect(within(aside).getByRole('button')).toHaveClass('gh-hero-founder__link');
    expect(within(aside).getByText(/personally visit/i)).toBeInTheDocument();
  });
});

describe('hero — assets', () => {
  it('points every slide at a resolved master URL', () => {
    for (const slide of HERO_SLIDES) {
      expect(slide.src).toBeTruthy();
      expect(slide.src).not.toContain('undefined');
      expect(slide.width).toBeGreaterThan(1000);
      expect(slide.height).toBeGreaterThan(500);
    }
  });
});
