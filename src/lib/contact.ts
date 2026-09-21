/**
 * Shared contact channels.
 *
 * AUDIT STATUS (homepage Section 06):
 * - WhatsApp (+44 7810 062383): present in code, unused in UI; conflicts with
 *   invoice (+62…) and Footer "Phone TBD" → UNVERIFIED for public CTAs.
 * - Email: only placeholders (hello@greenhill.example / hello@example.com) → UNVERIFIED.
 * - Phone: "Phone TBD" → MISSING.
 *
 * Set whatsapp.public = true only after Reece confirms the public channel.
 */
export const WHATSAPP_NUMBER_DISPLAY = '+44 7810 062383';
export const WHATSAPP_NUMBER_E164 = '447810062383';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER_E164}`;

export const contactChannels = {
  whatsapp: {
    display: WHATSAPP_NUMBER_DISPLAY,
    e164: WHATSAPP_NUMBER_E164,
    url: WHATSAPP_URL,
    /** Flip when Reece confirms this number for public site CTAs. */
    public: false,
    status: 'unverified' as const,
  },
  email: {
    value: null as string | null,
    status: 'missing' as const,
  },
  phone: {
    value: null as string | null,
    status: 'missing' as const,
  },
} as const;

export function getPublicWhatsAppUrl(): string | null {
  return contactChannels.whatsapp.public ? contactChannels.whatsapp.url : null;
}
