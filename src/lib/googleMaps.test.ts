import { describe, expect, it } from 'vitest';
import { googleMapsView } from './googleMaps';

describe('googleMapsView', () => {
  it('centres the embed on stored coordinates instead of a raw maps URL', () => {
    const view = googleMapsView({
      url: 'https://maps.app.goo.gl/example',
      latitude: -8.89,
      longitude: 116.28,
      place: 'South Lombok — sample location',
    });
    expect(view?.centered).toBe(true);
    expect(view?.embed).toContain('q=-8.89%2C116.28');
    expect(view?.embed).not.toContain('t=h');
    expect(view?.embed).not.toContain('goo.gl');
    expect(view?.href).toBe('https://maps.app.goo.gl/example');
  });

  it('reads a pin from a standard maps link', () => {
    const view = googleMapsView({
      url: 'https://www.google.com/maps/@-8.906,116.287,15z',
    });
    expect(view?.centered).toBe(true);
    expect(view?.embed).toContain('q=-8.906%2C116.287');
    expect(view?.embed).not.toContain('t=h');
  });

  it('uses the place name when a link has no coordinates', () => {
    const view = googleMapsView({
      url: 'https://maps.app.goo.gl/example',
      place: 'Are Guling',
    });
    expect(view?.centered).toBe(false);
    expect(view?.embed).toContain('q=Are%20Guling%2C%20Indonesia');
    expect(view?.embed).not.toContain('goo.gl');
  });
});
