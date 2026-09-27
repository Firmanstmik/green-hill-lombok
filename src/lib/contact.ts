/**
 * Shared contact channels.
 *
 * Defaults are the confirmed Green Hill channels. Reece can change them in the
 * admin (Settings → Footer & contact); published values replace the defaults
 * at runtime. Invalid values are ignored, so a typo can never break a link.
 */
export const WHATSAPP_NUMBER_DISPLAY = '+44 7810 062383';
export const WHATSAPP_NUMBER_E164 = '447810062383';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER_E164}`;
export const PUBLIC_EMAIL = 'reeceygreen88@gmail.com';
export const INSTAGRAM_URL = 'https://www.instagram.com/greenhilllombok/';
export const CONTACT_NAME = 'Reece Green';

export const contactChannels = {
  whatsapp: {
    display: WHATSAPP_NUMBER_DISPLAY,
    e164: WHATSAPP_NUMBER_E164,
    url: WHATSAPP_URL,
    public: true,
    status: 'verified' as const,
  },
  email: {
    value: PUBLIC_EMAIL,
    status: 'verified' as const,
  },
  phone: {
    value: null as string | null,
    status: 'missing' as const,
  },
} as const;

export type ContactSettings = {
  name: string;
  email: string;
  whatsappDisplay: string;
  whatsappE164: string;
  whatsappUrl: string;
  instagramUrl: string;
  /** Pre-filled message for general "Talk to Reece" buttons, per language. */
  message: Record<string, string>;
};

const DEFAULTS: ContactSettings = {
  name: CONTACT_NAME,
  email: PUBLIC_EMAIL,
  whatsappDisplay: WHATSAPP_NUMBER_DISPLAY,
  whatsappE164: WHATSAPP_NUMBER_E164,
  whatsappUrl: WHATSAPP_URL,
  instagramUrl: INSTAGRAM_URL,
  message: {},
};

let current: ContactSettings = DEFAULTS;

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const whatsappDigits = (value: string) => value.replace(/[^\d]/g, '');
export const isValidWhatsApp = (value: string) => /^\+?[\d\s().-]+$/.test(value.trim()) && whatsappDigits(value).length >= 8 && whatsappDigits(value).length <= 15;
export const isValidHttpsUrl = (value: string) => /^https:\/\/[^\s/]+\.[^\s]+$/.test(value.trim());

/** Called by the content loader with the published values. */
export function setContactOverrides(shared: Record<string, string>, byLocale: Record<string, Record<string, string>> = {}) {
  const email = shared['cms.site.contact.email'] ?? '';
  const whatsapp = shared['cms.site.contact.whatsapp'] ?? '';
  const instagram = shared['cms.site.contact.instagram'] ?? '';
  const name = (shared['cms.site.contact.name'] ?? '').trim();
  const digits = whatsappDigits(whatsapp);
  const message: Record<string, string> = {};
  for (const [locale, fields] of Object.entries(byLocale)) {
    const value = fields['cms.site.whatsapp.message']?.trim();
    if (locale !== '*' && value) message[locale] = value.slice(0, 300);
  }
  current = {
    name: name || DEFAULTS.name,
    email: isValidEmail(email) ? email.trim() : DEFAULTS.email,
    whatsappDisplay: isValidWhatsApp(whatsapp) ? whatsapp.trim() : DEFAULTS.whatsappDisplay,
    whatsappE164: isValidWhatsApp(whatsapp) ? digits : DEFAULTS.whatsappE164,
    whatsappUrl: isValidWhatsApp(whatsapp) ? `https://wa.me/${digits}` : DEFAULTS.whatsappUrl,
    instagramUrl: isValidHttpsUrl(instagram) ? instagram.trim() : DEFAULTS.instagramUrl,
    message,
  };
}

export function getContact(): ContactSettings {
  return current;
}

export function getPublicWhatsAppUrl(): string | null {
  return contactChannels.whatsapp.public ? current.whatsappUrl : null;
}

/** A general "Talk to Reece" link, with Reece's opening message if one is set. */
export function generalWhatsAppLink(locale: string): string {
  const message = current.message[locale] ?? current.message.en ?? '';
  return buildWhatsAppUrl(message);
}

/**
 * Direct WhatsApp chat on the configured Green Hill number.
 * The message is encoded once. Pass the localized sentence, not a pre-encoded string.
 */
export function buildWhatsAppUrl(message?: string): string {
  const text = message?.trim() ?? '';
  return text ? `${current.whatsappUrl}?text=${encodeURIComponent(text)}` : current.whatsappUrl;
}

/** @see buildWhatsAppUrl */
export const whatsAppConversation = buildWhatsAppUrl;
