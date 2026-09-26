import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC = 'src/assets/greenhill/logo-green-hill-mobile.png';
const OUT = 'public';
const IVORY = { r: 241, g: 237, b: 229, alpha: 1 };

function isInk(r, g, b, a) {
  if (a < 40) return false;
  const lum = (r + g + b) / 3;
  if (lum < 12) return false;
  // forest green monogram
  if (r < 80 && g < 120 && b < 90 && g >= r - 5 && lum < 100) return true;
  // gold sun / wave
  if (r > 150 && g > 100 && b < 140 && r > b + 30 && g > b + 15) return true;
  return false;
}

const trimmedPng = await sharp(SRC).trim({ threshold: 8 }).png().toBuffer();
const { data, info } = await sharp(trimmedPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
console.log('trimmed', w, h);

let minX = w;
let minY = h;
let maxX = 0;
let maxY = 0;
let ink = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (isInk(data[i], data[i + 1], data[i + 2], data[i + 3])) {
      ink++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}
console.log('ink', ink, 'bbox', minX, minY, maxX, maxY);

// Keep monogram only (exclude GREEN HILL / LOMBOK wordmark in lower third).
const boxH = maxY - minY + 1;
const monoBottom = minY + Math.round(boxH * 0.58);
const left = Math.max(0, minX - 12);
const top = Math.max(0, minY - 12);
const right = Math.min(w - 1, maxX + 12);
const bottom = Math.min(h - 1, monoBottom + 20);
const cw = right - left + 1;
const ch = bottom - top + 1;
console.log('crop', left, top, cw, ch);

const cropBuf = await sharp(trimmedPng)
  .extract({ left, top, width: cw, height: ch })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const cd = Buffer.from(cropBuf.data);
for (let i = 0; i < cd.length; i += 4) {
  const r = cd[i];
  const g = cd[i + 1];
  const b = cd[i + 2];
  const a = cd[i + 3];
  if (a < 40) {
    cd[i] = 0;
    cd[i + 1] = 0;
    cd[i + 2] = 0;
    cd[i + 3] = 0;
    continue;
  }
  const lum = (r + g + b) / 3;
  // Strip pure black and non-brand dark pixels
  if (lum < 14 || (!isInk(r, g, b, a) && lum < 70)) {
    cd[i] = 0;
    cd[i + 1] = 0;
    cd[i + 2] = 0;
    cd[i + 3] = 0;
  }
}

const cleaned = await sharp(cd, {
  raw: { width: cropBuf.info.width, height: cropBuf.info.height, channels: 4 },
})
  .trim({ threshold: 2 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Lift near-black forest to a clearer favicon green (still on-brand, not black).
const lifted = Buffer.from(cleaned.data);
const FOREST = [31, 84, 66]; // #1F5442 — readable at 16–32px
for (let i = 0; i < lifted.length; i += 4) {
  const a = lifted[i + 3];
  if (a < 40) continue;
  const r = lifted[i];
  const g = lifted[i + 1];
  const b = lifted[i + 2];
  const lum = (r + g + b) / 3;
  const isGold = r > 150 && g > 100 && b < 140 && r > b + 30;
  const isForest = !isGold && r < 80 && g < 120 && b < 90 && g >= r - 5 && lum < 100;
  if (isForest) {
    lifted[i] = FOREST[0];
    lifted[i + 1] = FOREST[1];
    lifted[i + 2] = FOREST[2];
  }
}

const monoPng = await sharp(lifted, {
  raw: { width: cleaned.info.width, height: cleaned.info.height, channels: 4 },
})
  .png()
  .toBuffer({ resolveWithObject: true });

console.log('mono', monoPng.info.width, 'x', monoPng.info.height);

async function makeFavicon(size, padRatio = 0.12) {
  const pad = Math.max(1, Math.round(size * padRatio));
  const inner = Math.max(1, size - pad * 2);
  const mark = await sharp(monoPng.data)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  if (size >= 180) {
    const radius = Math.round(size * 0.18);
    const plate = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="rgb(241,237,229)"/></svg>`
    );
    return sharp(plate)
      .composite([{ input: mark, gravity: 'centre' }])
      .png()
      .toBuffer();
  }

  return sharp({
    create: { width: size, height: size, channels: 4, background: IVORY },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toBuffer();
}

const outputs = [
  [16, 'favicon-16.png', 0.1],
  [32, 'favicon-32.png', 0.1],
  [64, 'favicon-64.png', 0.11],
  [192, 'favicon-192.png', 0.12],
  [512, 'favicon-512.png', 0.12],
  [180, 'apple-touch-icon.png', 0.12],
  [32, 'favicon.png', 0.1],
];

for (const [size, name, pad] of outputs) {
  const buf = await makeFavicon(size, pad);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('wrote', name, buf.length);
}

const ico32 = await makeFavicon(32, 0.1);
await sharp(ico32).png().toFile(path.join(OUT, 'favicon.ico'));
console.log('wrote favicon.ico');

const v = await sharp(path.join(OUT, 'favicon-64.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let blackish = 0;
let ivory = 0;
let forest = 0;
let gold = 0;
for (let i = 0; i < v.data.length; i += 4) {
  if (v.data[i + 3] < 20) continue;
  const r = v.data[i];
  const g = v.data[i + 1];
  const b = v.data[i + 2];
  const lum = (r + g + b) / 3;
  if (lum < 18) blackish++;
  if (r > 220 && g > 210 && b > 200) ivory++;
  if (r < 80 && g < 120 && b < 90 && g >= r - 5) forest++;
  if (r > 150 && g > 100 && b < 140) gold++;
}
console.log({ blackish, ivory, forest, gold });
