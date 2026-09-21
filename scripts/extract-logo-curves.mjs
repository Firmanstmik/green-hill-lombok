import sharp from 'sharp';
import fs from 'fs';

// 1) Transparent PNG from raw logo crop
const src = 'src/assets/greenhill/brand/_curve-raw-crop.png';
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const out = Buffer.from(data);

for (let i = 0; i < out.length; i += 4) {
  if (out[i] + out[i + 1] + out[i + 2] < 48) out[i + 3] = 0;
}

let minX = w,
  minY = h,
  maxX = 0,
  maxY = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (out[(y * w + x) * 4 + 3] > 8) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}
const pad = 2;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(w - 1, maxX + pad);
maxY = Math.min(h - 1, maxY + pad);
const tw = maxX - minX + 1;
const th = maxY - minY + 1;

await sharp(out, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left: minX, top: minY, width: tw, height: th })
  .png()
  .toFile('src/assets/greenhill/brand/green-hill-curve-mark.png');

console.log('png', tw, th);

// 2) Sample envelopes for compact SVG (gold vs green)
const { data: px, info: mi } = await sharp('src/assets/greenhill/brand/green-hill-curve-mark.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

function sampleEnv(isColor, step) {
  const top = [];
  const bot = [];
  for (let x = 0; x < mi.width; x += step) {
    let t = -1;
    let b = -1;
    for (let y = 0; y < mi.height; y++) {
      const i = (y * mi.width + x) * 4;
      if (px[i + 3] < 40) continue;
      if (!isColor(px[i], px[i + 1], px[i + 2])) continue;
      if (t < 0) t = y;
      b = y;
    }
    if (t >= 0) {
      top.push([x, t]);
      bot.push([x, b]);
    }
  }
  // force last column
  {
    const x = mi.width - 1;
    let t = -1;
    let b = -1;
    for (let y = 0; y < mi.height; y++) {
      const i = (y * mi.width + x) * 4;
      if (px[i + 3] < 40) continue;
      if (!isColor(px[i], px[i + 1], px[i + 2])) continue;
      if (t < 0) t = y;
      b = y;
    }
    if (t >= 0) {
      top.push([x, t]);
      bot.push([x, b]);
    }
  }
  return { top, bot };
}

const gold = sampleEnv((r, g, b) => r > 140 && g > 100 && b < 160, 10);
const green = sampleEnv((r, g, b) => r < 90 && g < 120 && r + g + b > 40, 10);

function catmull(pts) {
  if (pts.length < 2) return '';
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${f(p2)}`;
  }
  return d;
}

function closedPath(env) {
  const forward = env.top;
  const back = [...env.bot].reverse();
  const d1 = catmull(forward);
  // continue along bottom
  let d = d1;
  for (let i = 0; i < back.length - 1; i++) {
    const p0 = back[Math.max(0, i - 1)];
    const p1 = back[i];
    const p2 = back[i + 1];
    const p3 = back[Math.min(back.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    if (i === 0) {
      // line to start of bottom then curves — first point already connected via L
      d += `L${f(back[0])}`;
    }
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${f(p2)}`;
  }
  d += 'Z';
  return d;
}

const goldD = closedPath(gold);
const greenD = closedPath(green);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mi.width} ${mi.height}" fill="none" aria-hidden="true">
  <path class="gh-brand-curve__forest" fill="#17382E" d="${greenD}"/>
  <path class="gh-brand-curve__cream" fill="#C79D5A" d="${goldD}"/>
</svg>
`;
fs.writeFileSync('src/assets/greenhill/brand/green-hill-curve-mark.svg', svg);
console.log('svg gold pts', gold.top.length, 'green', green.top.length);

await sharp(Buffer.from(svg))
  .resize(560)
  .png()
  .toFile('src/assets/greenhill/brand/_curve-svg-preview.png');

await sharp({
  create: {
    width: tw * 2 + 40,
    height: th * 2 + 40,
    channels: 4,
    background: { r: 235, g: 230, b: 220, alpha: 1 },
  },
})
  .composite([
    {
      input: await sharp('src/assets/greenhill/brand/green-hill-curve-mark.png')
        .resize(tw * 2, th * 2, { kernel: 'lanczos3' })
        .png()
        .toBuffer(),
      left: 20,
      top: 20,
    },
  ])
  .png()
  .toFile('src/assets/greenhill/brand/_curve-preview-ivory.png');
