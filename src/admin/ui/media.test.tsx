import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const resolveMedia = vi.fn(async (refs: string[]) =>
  Object.fromEntries(refs.map((ref) => [ref, `https://signed.example/${ref.replace('private-media:', '')}?token=t`])),
);

vi.mock('../AdminSession', () => ({
  useRepository: () => ({ mode: 'supabase', resolveMedia }),
}));

const { Thumb } = await import('./primitives');

function renderWith(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

describe('admin media display', () => {
  it('shows a private photograph through a signed link, never the raw reference', async () => {
    renderWith(<Thumb src="private-media:images/a.webp" alt="Ridge" />);
    const img = await screen.findByAltText('Ridge');
    expect(img.getAttribute('src')).toBe('https://signed.example/images/a.webp?token=t');
    expect(resolveMedia).toHaveBeenCalledWith(['private-media:images/a.webp']);
  });

  it('shows public and local images as they are, without signing', async () => {
    resolveMedia.mockClear();
    renderWith(<Thumb src="https://example.supabase.co/storage/v1/object/public/property-images/b.webp" alt="Bay" />);
    await waitFor(() => expect(screen.getByAltText('Bay').getAttribute('src')).toContain('/object/public/property-images/b.webp'));
    expect(resolveMedia).not.toHaveBeenCalled();
  });
});
