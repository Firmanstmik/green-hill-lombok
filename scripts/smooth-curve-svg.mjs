import fs from 'fs';

/**
 * Smooth the logo-traced polygon envelopes into cubic Bezier SVG paths.
 * Source samples come from green-hill-curve-mark.svg column envelopes.
 */

function parsePoly(d) {
  const nums = d.match(/-?\d+\.?\d*/g).map(Number);
  const pts = [];
  for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

function chaikin(pts, iterations = 3) {
  let cur = pts;
  for (let n = 0; n < iterations; n++) {
    const next = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % cur.length];
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    cur = next;
  }
  return cur;
}

function simplify(pts, minDist = 1.4) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = out[out.length - 1];
    const dx = pts[i][0] - prev[0];
    const dy = pts[i][1] - prev[1];
    if (Math.hypot(dx, dy) >= minDist) out.push(pts[i]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function toCubicPath(pts) {
  if (pts.length < 2) return '';
  const f = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  let d = `M${f(pts[0])}`;
  // Catmull-Rom to cubic
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  d += 'Z';
  return d;
}

const raw = fs.readFileSync('src/assets/greenhill/brand/green-hill-curve-mark.svg', 'utf8');
const paths = [...raw.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)];

const smoothed = paths.map(([, fill, d]) => {
  let pts = parsePoly(d);
  // Drop duplicate closing point if present
  if (
    pts.length > 2 &&
    Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.5
  ) {
    pts = pts.slice(0, -1);
  }
  pts = simplify(chaikin(pts, 2), 1.8);
  return { fill, d: toCubicPath(pts) };
});

// Fit into a tighter viewBox by scanning path numbers
let minX = Infinity,
  minY = Infinity,
  maxX = 0,
  maxY = 0;
for (const { d } of smoothed) {
  const nums = d.match(/-?\d+\.?\d*/g).map(Number);
  for (let i = 0; i < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
}
const pad = 1.5;
minX -= pad;
minY -= pad;
maxX += pad;
maxY += pad;
const vbW = maxX - minX;
const vbH = maxY - minY;

function shift(d) {
  return d.replace(/-?\d+\.?\d*/g, (m, offset, str) => {
    // alternate x/y — fragile; better re-parse
    return m;
  });
}

function shiftPath(d) {
  const parts = d.split(/(?=[MCZ])/);
  return parts
    .map((part) => {
      if (part === 'Z' || !part) return part;
      const cmd = part[0];
      const nums = part.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
      const out = [];
      for (let i = 0; i < nums.length; i += 2) {
        out.push((nums[i] - minX).toFixed(2), (nums[i + 1] - minY).toFixed(2));
      }
      return cmd + out.join(' ');
    })
    .join('');
}

const forest = smoothed.find((p) => p.fill === '#17382E');
const gold = smoothed.find((p) => p.fill === '#C79D5A');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW.toFixed(2)} ${vbH.toFixed(2)}" fill="none" aria-hidden="true">
  <path class="gh-brand-curve__forest" fill="#17382E" d="${shiftPath(forest.d)}"/>
  <path class="gh-brand-curve__cream" fill="#C79D5A" d="${shiftPath(gold.d)}"/>
</svg>
`;

fs.writeFileSync('src/assets/greenhill/brand/green-hill-curve-mark.svg', svg);
console.log('viewBox', vbW.toFixed(2), vbH.toFixed(2));
console.log('wrote smoothed svg');
