/**
 * Responsive ladder from green-hill-reece-green.webp.
 * Resize only — no crop, no grade. High encode quality.
 * The 1087 webp tier is a copy of the untouched master.
 * Run: node scripts/build-founder-portrait.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const founderDir = path.join(__dirname, '..', 'src/assets/greenhill/founder');
const SRC = path.join(founderDir, 'green-hill-reece-green.webp');
const BASE = 'green-hill-reece-green';
const WIDTHS = [520, 760, 1040, 1087];

if (!fs.existsSync(SRC)) throw new Error(`Missing ${SRC}`);

const meta = await sharp(SRC).metadata();
const aspect = meta.width / meta.height;
console.log(`Founder ← ${path.basename(SRC)} (${meta.width}×${meta.height}) — high-quality resize only`);

for (const w of WIDTHS) {
  const h = Math.round(w / aspect);
  const buf = await sharp(SRC)
    .resize(w, h, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp(buf).avif({ quality: 78, effort: 6 }).toFile(path.join(founderDir, `${BASE}-${w}.avif`));
  if (w === meta.width) {
    // Exact master — do not re-encode webp.
    fs.copyFileSync(SRC, path.join(founderDir, `${BASE}-${w}.webp`));
  } else {
    await sharp(buf).webp({ quality: 92, effort: 6 }).toFile(path.join(founderDir, `${BASE}-${w}.webp`));
  }
  await sharp(buf).jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(path.join(founderDir, `${BASE}-${w}.jpg`));
  console.log(`  ${w}×${h}`);
}
