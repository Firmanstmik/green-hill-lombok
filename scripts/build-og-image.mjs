/**
 * Site-wide social-sharing image (1200 × 630) from the approved homepage hero.
 * Usage: node scripts/build-og-image.mjs
 * Output: public/og-image.jpg (served at /og-image.jpg).
 */
import sharp from 'sharp';

const source = 'src/assets/greenhill/hero-masters/green-hill-hero-section-1.webp';
const output = 'public/og-image.jpg';

await sharp(source)
  .resize(1200, 630, { fit: 'cover', position: 'attention' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(output);

console.log(`Wrote ${output}`);
