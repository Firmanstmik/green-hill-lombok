import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl, setContactOverrides } from '@/lib/contact';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx') ? [path] : [];
  });
}

const publicSource = [...sourceFiles('src/pages'), ...sourceFiles('src/components')];

describe('public CTA audit', () => {
  it('does not send a public CTA to the old homepage contact anchor', () => {
    const stale = publicSource.filter((file) =>
      /#contact|homeHash\(\s*['"]contact['"]\s*\)/.test(readFileSync(file, 'utf8')),
    );
    expect(stale).toEqual([]);
  });

  it('does not hardcode the Vercel domain into a public page or component', () => {
    const hardcoded = publicSource.filter((file) => readFileSync(file, 'utf8').includes('green-hill-lombok.vercel.app'));
    expect(hardcoded).toEqual([]);
  });

  it('encodes a WhatsApp message once', () => {
    setContactOverrides({ 'cms.site.contact.whatsapp': '+44 7810 062383' }, {});
    const url = buildWhatsAppUrl("Hi Reece, I'd like to learn more.");
    expect(url).toBe("https://wa.me/447810062383?text=Hi%20Reece%2C%20I'd%20like%20to%20learn%20more.");
    expect(url).not.toContain('%2520');
    expect(decodeURIComponent(url.split('?text=')[1])).toBe("Hi Reece, I'd like to learn more.");
    setContactOverrides({}, {});
  });
});
