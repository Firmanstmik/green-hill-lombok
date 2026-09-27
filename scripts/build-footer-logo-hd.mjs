/**
 * High-resolution footer lockups and favicons from the 4224px masters.
 * Footer CSS shows the stacked mark at 7.75rem on phones, so the old 132px
 * export looked soft on retina. Favicons are the monogram only.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const heroDir = path.join(root, 'src/assets/greenhill/hero');
const publicDir = path.join(root, 'public');
const desktopSrc = path.join(root, 'src/assets/greenhill/logo-green-hill-desktop.png');
const stackedSrc = path.join(root, 'src/assets/greenhill/logo-green-hill-mobile.png');

const IVORY = { r: 246, g: 243, b: 236, alpha: 1 };

async function cropBox(file, box) {
  const [left, top, right, bottom] = box;
  return sharp(file)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function writeWebp(buffer, height, dest) {
  const info = await sharp(buffer)
    .resize({ height, kernel: sharp.kernel.lanczos3, withoutEnlargement: true })
    .webp({ quality: 95, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(dest);
  console.log(path.basename(dest), `${info.width}x${info.height}`, `${Math.round(fs.statSync(dest).size / 1024)}KB`);
  return info;
}

const desktop = await cropBox(desktopSrc, [478, 987, 3654, 1841]);
const stacked = await cropBox(stackedSrc, [856, 464, 3376, 2360]);
await writeWebp(desktop, 420, path.join(heroDir, 'green-hill-logo-solid-hd.webp'));
await writeWebp(stacked, 640, path.join(heroDir, 'green-hill-logo-solid-stacked-hd.webp'));

// Monogram sits above the quiet gap before the wordmark (scanned from the master).
const monogram = await sharp(await cropBox(stackedSrc, [856, 464, 3376, 1720]))
  .trim({ threshold: 12 })
  .png()
  .toBuffer();
const monoMeta = await sharp(monogram).metadata();
console.log('monogram', `${monoMeta.width}x${monoMeta.height}`);

async function plate(size, padRatio, radiusRatio) {
  const pad = Math.round(size * padRatio);
  const inner = Math.max(1, size - pad * 2);
  const mark = await sharp(monogram)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const radius = Math.max(2, Math.round(size * radiusRatio));
  const svg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="rgb(${IVORY.r},${IVORY.g},${IVORY.b})"/></svg>`,
  );
  return sharp(svg).composite([{ input: mark, gravity: 'centre' }]).png().toBuffer();
}

function icoFromPngs(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, buffer } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.buffer)]);
}

const icons = [
  [16, 'favicon-16.png', 0.06, 0.22],
  [32, 'favicon-32.png', 0.08, 0.22],
  [32, 'favicon.png', 0.08, 0.22],
  [48, 'favicon-48.png', 0.1, 0.22],
  [64, 'favicon-64.png', 0.1, 0.22],
  [180, 'apple-touch-icon.png', 0.14, 0.22],
  [192, 'favicon-192.png', 0.12, 0.22],
  [512, 'favicon-512.png', 0.12, 0.22],
];

const written = [];
for (const [size, name, pad, radius] of icons) {
  const buf = await plate(size, pad, radius);
  fs.writeFileSync(path.join(publicDir, name), buf);
  written.push({ size, name, buffer: buf });
  console.log('wrote', name, buf.length);
}

const ico = icoFromPngs(
  written.filter((image) => [16, 32, 48].includes(image.size) && image.name.startsWith('favicon-')),
);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);
console.log('wrote favicon.ico', ico.length);
