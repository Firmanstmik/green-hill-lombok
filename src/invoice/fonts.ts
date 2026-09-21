import { Font } from '@react-pdf/renderer';

import cormorantRegular from './fonts/CormorantGaramond-Regular.ttf?url';
import cormorantMedium from './fonts/CormorantGaramond-Medium.ttf?url';
import cormorantSemiBold from './fonts/CormorantGaramond-SemiBold.ttf?url';
import manropeRegular from './fonts/Manrope-Regular.ttf?url';
import manropeMedium from './fonts/Manrope-Medium.ttf?url';
import manropeSemiBold from './fonts/Manrope-SemiBold.ttf?url';
import manropeBold from './fonts/Manrope-Bold.ttf?url';

let registered = false;

/** Used by Node PDF generation after registering fonts via data URIs. */
export function markInvoiceFontsRegistered() {
  registered = true;
}

export function registerInvoiceFonts() {
  if (registered) return;

  Font.register({
    family: 'Cormorant Garamond',
    fonts: [
      { src: cormorantRegular, fontWeight: 400 },
      { src: cormorantMedium, fontWeight: 500 },
      { src: cormorantSemiBold, fontWeight: 600 },
    ],
  });

  Font.register({
    family: 'Manrope',
    fonts: [
      { src: manropeRegular, fontWeight: 400 },
      { src: manropeMedium, fontWeight: 500 },
      { src: manropeSemiBold, fontWeight: 600 },
      { src: manropeBold, fontWeight: 700 },
    ],
  });

  registered = true;
}

export const colors = {
  forest: '#17382E',
  gold: '#C79D5A',
  ivory: '#F1EDE5',
  white: '#FFFFFF',
  muted: '#5C6B63',
  rule: '#D9D2C5',
  softIvory: '#F7F4EE',
} as const;
