import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GreenHillLoader } from './GreenHillLoader';

describe('GreenHillLoader', () => {
  it('shows the official Green Hill logo and announces what is loading', () => {
    const { container } = render(<GreenHillLoader label="Opening Green Hill Admin" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Opening Green Hill Admin…');
    const logo = container.querySelector('img')!;
    expect(logo.getAttribute('src')).toMatch(/green-hill-logo-solid-112/);
    expect(logo.getAttribute('srcset')).toMatch(/green-hill-logo-solid-168/);
    expect(logo).toHaveAttribute('alt', '');
    expect(container.querySelector('.ghl__line')).toHaveAttribute('aria-hidden');
  });
});
