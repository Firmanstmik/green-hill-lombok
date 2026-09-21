/**
 * Green Hill hero asset pipeline — REAL PHOTOGRAPHY ONLY.
 *
 * Art-directed crops + responsive WebP/JPEG ladders (AVIF kept as optional
 * encode for tooling, but the site serves WebP — soft AVIF was reading blurry).
 * Never invents geography, never erases objects, never upscales past the crop.
 *
 * Sources may be landscape or portrait; crop windows are computed from each
 * negative's real dimensions against the desktop (1.6:1) and mobile (~9:16) frames.
 *
 * Run: npm run build:hero
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'src/assets/greenhill/source');
const outDir = path.join(root, 'src/assets/greenhill/hero');
/*
 * Section 02's founder portrait is produced here, not in a script of its own,
 * so it shares one definition of `grade()` with the hero. The whole point of
 * grading it is that it must read as the same photography; a second copy of
 * the grade would drift the moment either is touched.
 */
const founderOutDir = path.join(root, 'src/assets/greenhill/founder');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(founderOutDir, { recursive: true });
fs.mkdirSync(sourceDir, { recursive: true });

/** Desktop target aspect — mid-range of the real hero box (1.36–1.83). */
const DESKTOP_ASPECT = 1.6;
const MOBILE_W = 576;
const MOBILE_CROP_H = { '01': 850, '02': 850, '03': 850 };

/* Cap below typical source crop (~1500–1536). Never invent 1920 from a 1.5k negative. */
const DESKTOP_WIDTHS = [960, 1200, 1440];
const MOBILE_WIDTHS = [432, 576, 720, 1080];

/**
 * Largest region of `aspect` (w/h) that fits inside the source.
 * `biasX` / `biasY`: 0 = left/top, 0.5 = center, 1 = right/bottom.
 */
function fitCrop(srcW, srcH, aspect, biasX = 0.5, biasY = 0.5) {
  const srcAspect = srcW / srcH;
  let width;
  let height;
  if (srcAspect > aspect) {
    height = srcH;
    width = Math.round(height * aspect);
  } else {
    width = srcW;
    height = Math.round(width / aspect);
  }
  width = Math.min(width, srcW);
  height = Math.min(height, srcH);
  const left = Math.max(0, Math.min(srcW - width, Math.round((srcW - width) * biasX)));
  const top = Math.max(0, Math.min(srcH - height, Math.round((srcH - height) * biasY)));
  return { left, top, width, height };
}

/** Crop only — no grade. Soft colour grading was reading as haze on full-bleed hero. */
async function cropOnly(srcPath, region) {
  return sharp(srcPath).extract(region).toBuffer();
}

async function emit(baseName, buffer, width, height, nativeWidth, destDir = outDir) {
  // Never upscale — soft “premium” blur came from inventing pixels past the crop.
  if (width > nativeWidth) {
    return null;
  }

  let pipeline = sharp(buffer).resize(width, height, {
    fit: 'fill',
    kernel: sharp.kernel.lanczos3,
  });

  // Light recover only when downscaling; skip on 1:1 copies of the crop.
  if (width < nativeWidth * 0.98) {
    pipeline = pipeline.sharpen({ sigma: 0.45, m1: 0.35, m2: 0.18 });
  }

  const files = [
    ['avif', () => pipeline.clone().avif({ quality: 78, effort: 6 })],
    ['webp', () => pipeline.clone().webp({ quality: 92, effort: 6 })],
    ['jpg', () => pipeline.clone().jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })],
  ];

  const written = {};
  for (const [ext, make] of files) {
    const file = path.join(destDir, `${baseName}-${width}.${ext}`);
    await make().toFile(file);
    written[ext] = Math.round(fs.statSync(file).size / 1024);
  }
  return written;
}

async function dominantColor(buffer) {
  const { data } = await sharp(buffer).resize(1, 1, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const hex = [data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  return `#${hex}`;
}

/**
 * Three chapters from the new hero gallery.
 * 01 coastline · 02 section1 · 03 section2
 */
const jobs = [
  {
    id: '01',
    label: 'Land & Ocean',
    source: 'hero-coastal-land.jpg',
    desktopBias: { x: 0.55, y: 0.45 },
    mobileBias: { x: 0.62, y: 0.4 },
    outDesktop: 'green-hill-hero-land-ocean',
    outMobile: 'green-hill-hero-land-ocean-mobile',
  },
  {
    id: '02',
    label: 'Land & Light',
    source: 'hero-section1.webp',
    desktopBias: { x: 0.5, y: 0.45 },
    mobileBias: { x: 0.5, y: 0.45 },
    outDesktop: 'green-hill-hero-land-light',
    outMobile: 'green-hill-hero-land-light-mobile',
  },
  {
    id: '03',
    label: 'On the Ground',
    source: 'hero-section2.webp',
    desktopBias: { x: 0.5, y: 0.5 },
    mobileBias: { x: 0.5, y: 0.48 },
    outDesktop: 'green-hill-hero-on-the-ground',
    outMobile: 'green-hill-hero-on-the-ground-mobile',
  },
];

const report = [];

for (const job of jobs) {
  const srcPath = path.join(sourceDir, job.source);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Missing source: ${srcPath}`);
  }
  const meta = await sharp(srcPath).metadata();
  const srcW = meta.width;
  const srcH = meta.height;
  console.log(`\n[${job.id}] ${job.label}  ←  ${job.source} (${srcW}x${srcH})`);

  const desktop = fitCrop(srcW, srcH, DESKTOP_ASPECT, job.desktopBias.x, job.desktopBias.y);
  const mobileAspect = MOBILE_W / MOBILE_CROP_H[job.id];
  const mobile = fitCrop(srcW, srcH, mobileAspect, job.mobileBias.x, job.mobileBias.y);

  console.log(`  desktop crop ${desktop.width}x${desktop.height} @ ${desktop.left},${desktop.top}`);
  console.log(`  mobile  crop ${mobile.width}x${mobile.height} @ ${mobile.left},${mobile.top}`);

  const deskBuf = await cropOnly(srcPath, desktop);
  const mobBuf = await cropOnly(srcPath, mobile);

  // Always include the native crop as the top rung so retina gets the real pixels.
  const deskWidths = [...new Set([...DESKTOP_WIDTHS.filter((w) => w < desktop.width), desktop.width])].sort(
    (a, b) => a - b
  );

  for (const w of deskWidths) {
    const h = Math.round((w * desktop.height) / desktop.width);
    const kb = await emit(job.outDesktop, deskBuf, w, h, desktop.width);
    if (!kb) continue;
    console.log(`  desktop ${w}x${h}  avif ${kb.avif}KB  webp ${kb.webp}KB  jpg ${kb.jpg}KB`);
  }

  const mobWidths = [
    ...new Set([...MOBILE_WIDTHS.filter((w) => w < mobile.width), Math.min(mobile.width, 1080)]),
  ].sort((a, b) => a - b);

  for (const w of mobWidths) {
    const h = Math.round((w * mobile.height) / mobile.width);
    const kb = await emit(job.outMobile, mobBuf, w, h, mobile.width);
    if (!kb) continue;
    console.log(`  mobile  ${w}x${h}   avif ${kb.avif}KB  webp ${kb.webp}KB  jpg ${kb.jpg}KB`);
  }

  report.push({
    id: job.id,
    label: job.label,
    source: job.source,
    sourceSize: `${srcW}x${srcH}`,
    desktopCrop: desktop,
    mobileCrop: mobile,
    desktopWidths: deskWidths,
    mobileWidths: mobWidths,
    mobileCropHeightAt576: Math.round((576 * mobile.height) / mobile.width),
    dominant: await dominantColor(deskBuf),
  });
}

/* ── Section 02 — founder portrait ─────────────────────────────────────
 *
 * Same negative as hero chapter "On the Ground", cropped differently for a
 * different job. The hero frame is landscape and atmospheric; this one is a
 * portrait column in an editorial spread, so it trims 290px of blown sky and
 * the bare branches that cluttered the top third, and keeps what carries the
 * meaning: the bay, the valley, and the vehicle on the cleared plot. Trimming
 * further starts cutting the vehicle itself, which is the one thing that may
 * not be lost.
 *
 * The vehicle stays. It is the evidence that Reece was standing there.
 */
const FOUNDER = {
  source: 'reece-suv-elevated-original.jpg',
  crop: { left: 44, top: 290, width: 587, height: 734 },
  base: 'green-hill-founder-reece',
  /* 1040 covers a ~520px column at DPR2; the negative is 768 wide, so this is
   * the same honest ceiling the hero tiers work to. */
  widths: [520, 760, 1040],
};

{
  const srcPath = path.join(sourceDir, FOUNDER.source);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Missing founder source: ${srcPath}`);
  }
  const meta = await sharp(srcPath).metadata();
  console.log(`
[02] Founder portrait  ←  ${FOUNDER.source} (${meta.width}x${meta.height})`);
  const c = FOUNDER.crop;
  if (c.left + c.width > meta.width || c.top + c.height > meta.height) {
    throw new Error('Founder crop falls outside the negative');
  }
  const buf = await cropOnly(srcPath, c);
  const aspect = c.width / c.height;
  for (const w of FOUNDER.widths) {
    if (w > c.width) continue;
    const h = Math.round(w / aspect);
    const kb = await emit(FOUNDER.base, buf, w, h, c.width, founderOutDir);
    if (!kb) continue;
    console.log(`  ${w}x${h}  avif ${kb.avif}KB  webp ${kb.webp}KB  jpg ${kb.jpg}KB`);
  }
  report.push({
    id: '02-founder',
    label: 'Founder portrait',
    source: FOUNDER.source,
    sourceSize: `${meta.width}x${meta.height}`,
    crop: c,
    widths: FOUNDER.widths,
    aspect: `${c.width}:${c.height}`,
    dominant: await dominantColor(buf),
  });
}

const IVORY = [241, 237, 229];
const GOLD_ON_DARK = [208, 168, 102];

async function buildHeroLogo(srcName, outBase, heights) {
  const src = path.join(root, 'src/assets/greenhill', srcName);
  if (!fs.existsSync(src)) {
    console.warn(`[logo] skip — missing ${srcName}`);
    return [];
  }
  const { data, info } = await sharp(src).ensureAlpha().trim({ threshold: 1 }).raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const tone = data[i] - data[i + 2] > 40 ? GOLD_ON_DARK : IVORY;
    data[i] = tone[0];
    data[i + 1] = tone[1];
    data[i + 2] = tone[2];
  }

  const recoloured = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const out = [];
  for (const h of heights) {
    const file = path.join(outDir, `${outBase}-${h}.webp`);
    const meta = await recoloured
      .clone()
      .resize({ height: h, kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 92, alphaQuality: 100, effort: 6 })
      .toFile(file);
    out.push({ h, width: meta.width, kb: Math.round(fs.statSync(file).size / 1024) });
  }
  console.log(
    `\n[logo] ${outBase}  (trimmed ${info.width}x${info.height})  ` +
      out.map((o) => `${o.width}x${o.h} ${o.kb}KB`).join('  ')
  );
  return out;
}

/*
 * Solid-bar lockup: the same artwork, trimmed, colours untouched.
 *
 * The bar was being served the raw 4224x2816 export, in which the mark fills
 * only 30.8% of the height. The CSS compensated with a `* 2816 / 856` factor
 * on the height — a magic number that had to be re-guessed for every asset and
 * that silently rendered the wrong size the moment an asset changed. Trimming
 * at build time removes the padding and the guesswork: the mark fills the box,
 * so the bar can ask for the same height as the hero lockup and get the same
 * mark.
 */
async function buildPlainLogo(srcName, outBase, heights) {
  const src = path.join(root, 'src/assets/greenhill', srcName);
  if (!fs.existsSync(src)) {
    console.warn(`[logo] skip — missing ${srcName}`);
    return [];
  }
  const trimmed = sharp(src).ensureAlpha().trim({ threshold: 1 });
  const meta = await trimmed.clone().metadata();
  const out = [];
  for (const h of heights) {
    const file = path.join(outDir, `${outBase}-${h}.webp`);
    const info = await trimmed
      .clone()
      .resize({ height: h, kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 92, alphaQuality: 100, effort: 6 })
      .toFile(file);
    out.push({ h, width: info.width, kb: Math.round(fs.statSync(file).size / 1024) });
  }
  console.log(
    `
[logo] ${outBase}  (trimmed ${meta.width}x${meta.height}, aspect ${(meta.width / meta.height).toFixed(3)})  ` +
      out.map((o) => `${o.width}x${o.h} ${o.kb}KB`).join('  ')
  );
  return out;
}

const logo = {
  desktop: await buildHeroLogo('logo-green-hill-desktop.png', 'green-hill-logo-hero', [56, 112, 168]),
  mobile: await buildHeroLogo('logo-green-hill-mobile.png', 'green-hill-logo-hero-stacked', [44, 88, 132]),
  solid: await buildPlainLogo('logo-green-hill-desktop.png', 'green-hill-logo-solid', [56, 112, 168]),
  solidStacked: await buildPlainLogo('logo-green-hill-mobile.png', 'green-hill-logo-solid-stacked', [44, 88, 132]),
};

fs.writeFileSync(
  path.join(outDir, 'hero-assets-manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), report, logo }, null, 2)
);

console.log('\nDone. Manifest: src/assets/greenhill/hero/hero-assets-manifest.json');
console.log('Dominant colours:', report.map((r) => `${r.id} ${r.dominant}`).join('  '));
