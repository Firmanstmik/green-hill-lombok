import sharp from 'sharp';
import fs from 'fs';

const { data, info } = await sharp('src/assets/greenhill/brand/green-hill-curve-mark.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const w = info.width;
const h = info.height;

function sample(isColor) {
  const top = [];
  const bot = [];
  for (let x = 0; x < w; x++) {
    let t = -1;
    let b = -1;
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 40) continue;
      if (!isColor(data[i], data[i + 1], data[i + 2])) continue;
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

const gold = sample((r, g, b) => r > 140 && g > 100 && b < 160);
const green = sample((r, g, b) => r < 90 && g < 120 && r + g + b > 40);

// Decimate to ~14 key points
function decimate(pts, n = 14) {
  if (pts.length <= n) return pts;
  const out = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i / (n - 1)) * (pts.length - 1));
    out.push(pts[idx]);
  }
  return out;
}

function fitBezier(pts) {
  // Scale into viewBox 0 0 100 36
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...gold.top.map((p) => p[1]), ...green.bot.map((p) => p[1]));
  const maxY = Math.max(...gold.bot.map((p) => p[1]), ...green.bot.map((p) => p[1]));
  const sx = 100 / (maxX - minX || 1);
  const sy = 34 / (maxY - minY || 1);
  return pts.map(([x, y]) => [(x - minX) * sx, (y - minY) * sy + 1]);
}

const gTop = fitBezier(decimate(gold.top, 12));
const gBot = fitBezier(decimate(gold.bot, 12));
const fTop = fitBezier(decimate(green.top, 12));
const fBot = fitBezier(decimate(green.bot, 12));

function pathFromRibbon(top, bot) {
  const f = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  // Use quadratic midpoints for smoother look
  let d = `M${f(top[0])}`;
  for (let i = 1; i < top.length; i++) {
    const prev = top[i - 1];
    const cur = top[i];
    const cpx = (prev[0] + cur[0]) / 2;
    const cpy = (prev[1] + cur[1]) / 2;
    d += `Q${prev[0].toFixed(2)} ${prev[1].toFixed(2)} ${cpx.toFixed(2)} ${cpy.toFixed(2)}`;
  }
  d += `L${f(top[top.length - 1])}`;
  d += `L${f(bot[bot.length - 1])}`;
  for (let i = bot.length - 2; i >= 0; i--) {
    const next = bot[i + 1];
    const cur = bot[i];
    const cpx = (next[0] + cur[0]) / 2;
    const cpy = (next[1] + cur[1]) / 2;
    d += `Q${next[0].toFixed(2)} ${next[1].toFixed(2)} ${cpx.toFixed(2)} ${cpy.toFixed(2)}`;
  }
  d += `L${f(bot[0])}Z`;
  return d;
}

// Better: Catmull-Rom closed ribbon
function ribbon(top, bot) {
  const pts = [...top, ...[...bot].reverse()];
  const f = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  let d = `M${f(pts[0])}`;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${f(p2)}`;
  }
  d += 'Z';
  return d;
}

const goldD = ribbon(gTop, gBot);
const forestD = ribbon(fTop, fBot);

const component = `/**
 * Brand underline from the Green Hill logo — gold over forest.
 * Vector paths fitted to the official logo crop for crisp HD rendering.
 */
export function BrandCurveMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 36"
      width={56}
      height={20}
      aria-hidden
      focusable="false"
    >
      <path className="gh-brand-curve__forest" fill="#17382E" d="${forestD}" />
      <path className="gh-brand-curve__cream" fill="#C79D5A" d="${goldD}" />
    </svg>
  );
}
`;

fs.writeFileSync('src/components/brand/BrandCurveMark.tsx', component);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 36">
  <path fill="#17382E" d="${forestD}"/>
  <path fill="#C79D5A" d="${goldD}"/>
</svg>`;
await sharp(Buffer.from(svg)).resize(500).png().toFile('src/assets/greenhill/brand/_curve-svg-preview.png');
console.log('wrote BrandCurveMark + preview');
console.log('gold pts', gTop.length, 'forest', fTop.length);
