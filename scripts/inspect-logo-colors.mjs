import sharp from 'sharp';
import fs from 'fs';

const { data, info } = await sharp('src/assets/greenhill/logo-green-hill-desktop.webp')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const w = info.width;
const h = info.height;
console.log('size', w, h);

const counts = new Map();
for (let y = Math.floor(h * 0.55); y < h; y++) {
  for (let x = 0; x < Math.floor(w * 0.38); x++) {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 200) continue;
    const key = [Math.round(r / 8) * 8, Math.round(g / 8) * 8, Math.round(b / 8) * 8].join(',');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}
[...counts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([k, v]) => console.log(v, k));

// Save a zoomed crop of the bottom of the GH mark for visual inspection
await sharp('src/assets/greenhill/logo-green-hill-desktop.webp')
  .extract({ left: 0, top: 42, width: 95, height: 30 })
  .resize(95 * 8, 30 * 8, { kernel: 'nearest' })
  .png()
  .toFile('src/assets/greenhill/brand/_inspect-curves.png');

await sharp('src/assets/greenhill/logo-green-hill-desktop.webp')
  .resize(267 * 4, 72 * 4, { kernel: 'lanczos3' })
  .png()
  .toFile('src/assets/greenhill/brand/_logo-desktop-4x.png');

console.log('wrote inspect crops');
