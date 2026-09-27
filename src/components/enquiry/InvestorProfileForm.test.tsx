import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';

const recordEnquiry = vi.fn(async () => true);
vi.mock('@/lib/enquiries', () => ({ recordEnquiry: (...args: unknown[]) => recordEnquiry(...(args as [])) }));

const { InvestorProfileForm } = await import('./InvestorProfileForm');

function renderForm(props: Parameters<typeof InvestorProfileForm>[0]) {
  return render(
    <MemoryRouter initialEntries={['/en/enquire']}>
      <LanguageProvider>
        <InvestorProfileForm {...props} />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('investor enquiry (brief §9)', () => {
  beforeEach(() => {
    recordEnquiry.mockClear();
    window.open = vi.fn() as unknown as typeof window.open;
  });

  it('asks for a name and a way to reply before sending', () => {
    renderForm({ variant: 'standard' });
    fireEvent.click(screen.getByRole('button', { name: /send to reece/i }));
    expect(screen.getByText('Please tell us your name.')).toBeTruthy();
    expect(screen.getByText('Add an email address or WhatsApp number.')).toBeTruthy();
    expect(recordEnquiry).not.toHaveBeenCalled();
  });

  it('records budget, interests, objective and timeframe, then opens WhatsApp about the opportunity', () => {
    renderForm({ variant: 'standard', opportunity: { id: 'o1', title: 'Ridge plot', reference: 'GH-LOM-004' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'Netherlands' } });
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '£100–250k' } });
    fireEvent.change(screen.getByLabelText('Main objective'), { target: { value: 'Capital growth' } });
    fireEvent.change(screen.getByLabelText('Timeframe'), { target: { value: '6–12 months' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Land' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Land banking' }));
    fireEvent.click(screen.getByRole('button', { name: /send to reece/i }));

    expect(recordEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ana',
        email: 'ana@example.com',
        country: 'Netherlands',
        source: 'opportunity',
        opportunityId: 'o1',
        budget: '£100–250k',
        objective: 'Capital growth',
        timeframe: '6–12 months',
        interests: ['Land', 'Land banking'],
      }),
    );
    const url = decodeURIComponent((window.open as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(url).toMatch(/^https:\/\/wa\.me\/447810062383\?text=/);
    expect(url).toContain('Opportunity: Ridge plot (GH-LOM-004)');
    expect(url).toContain('Budget: £100–250k');
  });

  it('writes a briefing from the chosen opportunity and keeps later edits', () => {
    renderForm({
      variant: 'standard',
      opportunity: { id: 'o1', title: 'Ridge plot', reference: 'GH-LOM-004' },
      messageDraft: 'I would like a briefing on Ridge plot (South Lombok · Land).',
    });
    const message = screen.getByLabelText('Message') as HTMLTextAreaElement;
    expect(message.value).toMatch(/Ridge plot/);
    fireEvent.change(message, { target: { value: 'Please call me tomorrow.' } });
    expect(message.value).toBe('Please call me tomorrow.');
  });

  it('asks the Green Hill Private qualification questions (brief §21)', () => {
    renderForm({ variant: 'private', opportunity: { id: 'p1', title: 'Beachfront site', reference: 'GH-LOM-009' } });
    expect(screen.getByLabelText('Company')).toBeTruthy();
    expect(screen.getByLabelText('Capital available')).toBeTruthy();
    expect(screen.getByLabelText('Investor type')).toBeTruthy();
    expect(screen.queryByLabelText('Main objective')).toBeNull();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Dana' } });
    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '+971 50 000 0000' } });
    fireEvent.change(screen.getByLabelText('Capital available'), { target: { value: 'USD 1m–5m' } });
    fireEvent.change(screen.getByLabelText('Investor type'), { target: { value: 'Family office' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hospitality' }));
    fireEvent.click(screen.getByRole('button', { name: /request investment memorandum/i }));
    expect(recordEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'private',
        opportunityId: 'p1',
        budget: 'USD 1m–5m',
        investorType: 'Family office',
        interests: ['Hospitality'],
      }),
    );
  });
});
