import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import Notes from '@/pages/Blog';

const LANGS = ['en', 'id', 'nl', 'es'] as const;

// jsdom has no IntersectionObserver; report everything as visible so the
// reveal-gated content is present in the tree.
beforeAll(() => {
  class VisibleObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.cb(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: VisibleObserver,
  });
  globalThis.IntersectionObserver = VisibleObserver as unknown as typeof IntersectionObserver;
});

function renderNotes(lang: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/${lang}/intelligence`]}>
        <LanguageProvider>
          <CurrencyProvider>
            <Notes />
          </CurrencyProvider>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Notes art-direction upgrade', () => {
  for (const lang of LANGS) {
    it(`renders a single h1 and resolves every aria-labelledby for ${lang}`, () => {
      const { container, unmount } = renderNotes(lang);

      expect(container.querySelectorAll('h1')).toHaveLength(1);

      const sections = Array.from(container.querySelectorAll('[aria-labelledby]'));
      expect(sections.length).toBeGreaterThan(3);
      for (const section of sections) {
        const id = section.getAttribute('aria-labelledby')!;
        expect(container.querySelector(`#${id}`), `missing #${id}`).not.toBeNull();
      }

      // No unresolved i18n keys leaked into the DOM.
      expect(container.textContent).not.toMatch(/notes\.page\./);

      unmount();
    });
  }

  it('shows the editorial preparation section instead of an empty-state message', () => {
    const { container } = renderNotes('en');
    expect(screen.getByText('In preparation')).toBeTruthy();
    expect(container.textContent).not.toMatch(/no articles|no posts|coming soon/i);
    // With no published note, the four editorial themes stand in for the index…
    expect(container.querySelector('.gh-notes-list')).toBeNull();
    const themes = container.querySelectorAll('.gh-notes-prep__features .gh-notes-prep__feature');
    expect(themes).toHaveLength(4);
    for (const theme of Array.from(themes)) {
      expect(theme.querySelector('.gh-notes-prep__feature-label')?.textContent?.trim()).toBeTruthy();
      expect(theme.querySelector('.gh-notes-prep__feature-body')?.textContent?.trim()).toBeTruthy();
    }
    expect(container.querySelectorAll('.gh-notes-prep__collage img')).toHaveLength(3);
    // …and the chapters link into existing Green Hill pages.
    const chapters = Array.from(container.querySelectorAll<HTMLAnchorElement>('.gh-notes-chapters__item a'));
    expect(chapters.map((link) => link.getAttribute('href'))).toEqual([
      '/en/why-lombok',
      '/en/buying-in-lombok',
      '/en/private',
      '/en/properties',
      '/en/about',
    ]);
  });

  it('breaks the hero headline into two editorial lines without leaking the pipe', () => {
    const { container } = renderNotes('en');
    const h1 = container.querySelector('h1')!;
    expect(h1.querySelectorAll('.gh-notes-hero__title-line')).toHaveLength(2);
    expect(h1.textContent).not.toContain('|');
    expect(h1.getAttribute('aria-label')).toBe('Perspectives from the ground.');
  });
});
