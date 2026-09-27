import { describe, expect, it } from 'vitest';
import en from '@/lib/i18n/translations/en.json';
import id from '@/lib/i18n/translations/id.json';
import nl from '@/lib/i18n/translations/nl.json';
import es from '@/lib/i18n/translations/es.json';

const heroMessages = {
  en: "Hi Reece, I'd like to learn more about Green Hill and the property opportunities in South Lombok.",
  id: 'Halo Reece, saya ingin mengetahui lebih lanjut tentang Green Hill dan peluang properti di South Lombok.',
  nl: 'Hi Reece, ik wil graag meer weten over Green Hill en de vastgoedmogelijkheden in South Lombok.',
  es: 'Hola Reece, me gustaría saber más sobre Green Hill y las oportunidades inmobiliarias en South Lombok.',
};

describe('conversion copy', () => {
  it('gives the homepage hero its own WhatsApp note in each language', () => {
    expect(en.hero.whatsappMessage).toBe(heroMessages.en);
    expect(id.hero.whatsappMessage).toBe(heroMessages.id);
    expect(nl.hero.whatsappMessage).toBe(heroMessages.nl);
    expect(es.hero.whatsappMessage).toBe(heroMessages.es);
  });

  it('keeps the opportunity WhatsApp note tied to that property', () => {
    expect(en.properties.memo.whatsappMessage).toContain("I'd like to learn more about the opportunity and discuss the next steps.");
    expect(id.properties.memo.whatsappMessage).toContain('membahas langkah selanjutnya');
    expect(nl.properties.memo.whatsappMessage).toContain('vervolgstappen');
    expect(es.properties.memo.whatsappMessage).toContain('siguientes pasos');
    for (const bundle of [en, id, nl, es]) {
      expect(bundle.properties.memo.whatsappMessage).toContain('{title}');
      expect(bundle.properties.memo.whatsappMessage).toContain('{reference}');
      expect(bundle.properties.memo.whatsappMessage).not.toBe(bundle.hero.whatsappMessage);
    }
  });

  it('gives Green Hill Private its own WhatsApp note', () => {
    expect(en.private.page.whatsappMessage).toContain('Green Hill Private');
    expect(id.private.page.whatsappMessage).toContain('Green Hill Private');
    expect(nl.private.page.whatsappMessage).toContain('Green Hill Private');
    expect(es.private.page.whatsappMessage).toContain('Green Hill Private');
  });
});
