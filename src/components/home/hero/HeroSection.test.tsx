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

  it('describes the photograph once: in the visible caption, not again as alt text', async () => {
    const { container } = renderHero();
    await screen.findByRole('heading', { level: 1 });
    const img = container.querySelector('img.gh-hero-img') as HTMLImageElement;
    // Decorative next to its caption, so screen readers skip it…
    expect(img.getAttribute('alt')).toBe('');
    expect(screen.queryByRole('img', { name: /lombok/i })).toBeNull();
    // …and read the caption, which is real text with a real description.
    const caption = container.querySelector('.gh-hero-caption__text[data-state="active"]')!;
    expect(caption.textContent!.length).toBeGreaterThan(30);
    expect(caption.textContent).not.toMatch(/\.(webp|jpe?g|png)/i);
    expect(caption).not.toHaveAttribute('aria-hidden');
    expect(screen.getByText(caption.textContent!)).toBe(caption);
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

describe('hero — Speak with Reece', () => {
  it('opens WhatsApp with the English note and leaves the enquiry page to the navbar', async () => {
    renderHero();
    const link = await screen.findByRole('link', { name: 'Speak with Reece' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith('https://wa.me/')).toBe(true);
    expect(decodeURIComponent(href)).toContain(
      "Hi Reece, I'd like to learn more about Green Hill and the property opportunities in South Lombok.",
    );
    expect(href).not.toContain('/enquire');
  });

  it('uses the Indonesian note on the Indonesian homepage', async () => {
    render(
      <MemoryRouter initialEntries={['/id']}>
        <LanguageProvider>
          <CurrencyProvider>
            <HeroSection />
          </CurrencyProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', { name: 'Berbicara dengan Reece' });
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain(
      'Halo Reece, saya ingin mengetahui lebih lanjut tentang Green Hill dan peluang properti di South Lombok.',
    );
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

describe('hero — caption follows the photograph', () => {
  it('shows the current photograph’s own description under the headline', async () => {
    const { container } = renderHero();
    await screen.findByRole('heading', { level: 1 });
    const captions = [...container.querySelectorAll('.gh-hero-caption__text')];
    expect(captions).toHaveLength(HERO_SLIDES.length);
    const active = captions.filter((c) => c.getAttribute('data-state') === 'active');
    expect(active).toHaveLength(1);
    // The editor's description of the photograph on screen (CMS, first chapter), not a hard-coded line.
    expect(active[0]).toBe(captions[0]);
    expect(active[0].textContent!.length).toBeGreaterThan(30);
    // Only the current caption is read out; the others only reserve space.
    expect(captions.filter((c) => c.getAttribute('aria-hidden') === 'true')).toHaveLength(HERO_SLIDES.length - 1);
    // Caption sits between the headline and the supporting line.
    const h1 = screen.getByRole('heading', { level: 1 });
    const caption = container.querySelector('.gh-hero-caption')!;
    const body = container.querySelector('.gh-hero-body')!;
    expect(h1.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(caption.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('moves image, chapter and caption together when a chapter is chosen', async () => {
    const { container } = renderHero();
    const nav = await screen.findByRole('navigation', { name: /hero chapters/i });
    // jsdom never loads images; the switch still happens (bounded wait).
    within(nav).getAllByRole('button')[2].click();
    await vi.waitFor(
      () => {
        const active = container.querySelector('.gh-hero-caption__text[data-state="active"]');
        expect(active?.textContent).toBe(container.querySelectorAll('.gh-hero-caption__text')[2].textContent);
      },
      { timeout: 2500 },
    );
    expect(within(nav).getAllByRole('button')[2]).toHaveAttribute('aria-current', 'true');
    expect(container.querySelector('.gh-hero-caption__text[data-state="leaving"]')).not.toBeNull();
  });
});
