import sharp from 'sharp';
import { readFileSync } from 'fs';

const svgPath = 'src/assets/greenhill/Logo Green Hill Lombok.svg';
const outPath = 'src/invoice/logo-green-hill-lombok-transparent.png';
const svgText = readFileSync(svgPath, 'utf8');

const matches = [...svgText.matchAll(/xlink:href="data:image\/png;base64,([^"]+)"/g)];
if (!matches.length) throw new Error('No embedded PNG found in SVG');

let best = matches[0][1];
for (const m of matches) {
  if (m[1].length > best.length) best = m[1];
}

const embedded = Buffer.from(best, 'base64');
const { data, info } = await sharp(embedded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.from(data);

for (let i = 0; i < out.length; i += 4) {
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Ivory / near-white paper
  const isPaper = r > 235 && g > 230 && b > 220;
  // Black canvas background from the SVG export (not forest-green ink)
  const isBlackBg = luma < 22 && chroma < 14;

  if (isPaper || isBlackBg) {
    out[i + 3] = 0;
  }
}

await sharp(out, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .resize({ width: 1100, fit: 'inside', withoutEnlargement: true })
  .png()
  .toFile(outPath);

const check = await sharp(outPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const sample = (x, y) => {
  const i = (y * check.info.width + x) * 4;
  return [check.data[i], check.data[i + 1], check.data[i + 2], check.data[i + 3]];
};

await sharp({
  create: {
    width: check.info.width,
    height: check.info.height,
    channels: 3,
    background: { r: 241, g: 237, b: 229 },
  },
})
  .composite([{ input: outPath, blend: 'over' }])
  .png()
  .toFile('src/invoice/_logo-on-ivory-check.png');

console.log('size', check.info.width, check.info.height);
console.log('corner', sample(8, 8));
console.log('center', sample(Math.floor(check.info.width / 2), Math.floor(check.info.height / 2)));
console.log('wrote', outPath);
