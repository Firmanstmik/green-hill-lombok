/**
 * Site-wide social image: the Green Hill mark centred on white, 1200 × 630.
 * Usage: node scripts/build-og-image.mjs
 * Output: public/og-green-hill.jpg (served at /og-green-hill.jpg).
 * public/og-image.jpg is the same picture, so older links stay consistent.
 */
import sharp from 'sharp';

const source = 'src/assets/greenhill/logo-green-hill/logo-green-hill-mobile.webp';
const outputs = ['public/og-green-hill.jpg', 'public/og-image.jpg'];

const logo = await sharp(source)
  .trim()
  .resize({ height: 430, fit: 'inside' })
  .png()
  .toBuffer();

const plate = sharp({
  create: { width: 1200, height: 630, channels: 3, background: '#ffffff' },
}).composite([{ input: logo, gravity: 'centre' }]);

for (const output of outputs) {
  await plate.clone().jpeg({ quality: 90, mozjpeg: true }).toFile(output);
  console.log(`Wrote ${output}`);
}
