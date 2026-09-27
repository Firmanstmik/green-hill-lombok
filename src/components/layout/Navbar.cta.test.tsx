import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Navbar } from './Navbar';

function renderNav(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <CurrencyProvider>
          <Navbar />
        </CurrencyProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('navbar — Talk to Reece', () => {
  it.each([
    ['/en', 'Talk to Reece', '/en/enquire'],
    ['/id/about', 'Bicara dengan Reece', '/id/enquire'],
    ['/nl/properties', 'Praat met Reece', '/nl/enquire'],
    ['/es/why-lombok', 'Habla con Reece', '/es/enquire'],
  ])('on %s sends %s to the enquiry page', async (path, label, href) => {
    renderNav(path);
    const links = await screen.findAllByRole('link', { name: label });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', href);
      expect(link.getAttribute('href')).not.toContain('wa.me');
    }
  });

  it('keeps the same enquiry destination inside the mobile menu', async () => {
    renderNav('/id');
    fireEvent.click(await screen.findByRole('button', { name: 'Toggle menu' }));
    const menu = await screen.findByRole('dialog');
    const cta = menu.querySelector('.gh-menu__cta');
    expect(cta).toHaveAttribute('href', '/id/enquire');
  });
});
