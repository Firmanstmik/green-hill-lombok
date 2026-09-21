import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Green Hill brand mark — the wave beneath the G/H monogram.
 *
 * The two crescents are the real geometry, traced from the official lockup
 * (logo-green-hill-desktop.png) rather than redrawn by eye: the artwork was
 * masked by colour, the lowest contiguous run sampled per column to separate
 * the wave from the C and H stems above it, the outline simplified with
 * Douglas–Peucker and refitted as Catmull–Rom cubics. Overlaid on the original
 * the curves sit on top of it.
 *
 * It had to be re-derived because the official logo .svg is not a vector — it
 * is a base64 PNG in an SVG wrapper — and the mark it replaced was a raster
 * crop, which cannot be drawn on, recoloured, or stay crisp at arbitrary DPR.
 *
 * Motion: the green body arrives first and the gold crest follows ~120ms
 * behind, each unveiled left to right. That order is the point — it reads as a
 * swell arriving and the light catching its crest, not as a UI wipe. It plays
 * once on entry and then stays completely still.
 *
 * Clip-path IDs are instance-unique via useId so Section 02 and Section 03 can
 * host the mark on the same page without colliding.
 */

const VIEW_BOX = '0 0 96 37.62';
const GREEN = 'M3.02 27.93C3.73 28.23 5.79 29.21 7.30 29.69C8.81 30.18 10.57 30.60 12.08 30.83C13.59 31.06 14.57 31.16 16.36 31.08C18.14 30.99 20.47 30.83 22.77 30.32C25.08 29.82 26.38 29.63 30.20 28.06C34.01 26.48 42.11 22.44 45.67 20.89C49.24 19.33 49.66 19.33 51.59 18.75C53.52 18.16 55.07 17.70 57.25 17.36C59.43 17.03 62.20 16.73 64.67 16.73C67.15 16.73 69.87 17.03 72.09 17.36C74.32 17.70 75.97 18.12 78.01 18.75C80.04 19.38 82.10 20.13 84.30 21.14C86.50 22.14 91.30 24.56 91.22 24.79C91.13 25.02 86.02 23.09 83.80 22.52C81.57 21.96 79.25 21.62 77.88 21.39C76.52 21.16 77.44 21.14 75.62 21.14C73.79 21.14 69.12 21.20 66.94 21.39C64.75 21.58 64.36 21.77 62.53 22.27C60.71 22.77 59.74 22.77 55.99 24.41C52.24 26.04 43.37 30.53 40.01 32.08C36.66 33.64 37.31 33.24 35.86 33.72C34.41 34.20 33.01 34.64 31.33 34.98C29.65 35.31 27.68 35.63 25.79 35.73C23.91 35.84 22.04 35.84 20.01 35.61C17.97 35.38 15.04 34.68 13.59 34.35C12.14 34.01 12.44 34.10 11.32 33.59C10.21 33.09 8.30 32.23 6.92 31.33C5.54 30.43 3.67 28.71 3.02 28.18Z';
const GOLD = 'M4.15 22.40C4.66 22.54 5.91 23.09 7.17 23.28C8.43 23.47 9.86 23.70 11.70 23.53C13.55 23.36 16.08 22.96 18.24 22.27C20.40 21.58 22.21 20.70 24.66 19.38C27.11 18.06 30.85 15.56 32.96 14.34C35.08 13.13 35.73 12.81 37.37 12.08C39.00 11.34 41.25 10.42 42.78 9.94C44.31 9.46 44.81 9.33 46.55 9.18C48.29 9.04 51.59 9.00 53.22 9.06C54.86 9.12 54.58 9.12 56.37 9.56C58.15 10.00 62.05 11.05 63.92 11.70C65.78 12.35 68.32 13.21 67.56 13.46C66.81 13.71 61.27 13.21 59.39 13.21C57.50 13.21 57.48 13.27 56.24 13.46C55.00 13.65 53.72 13.86 51.96 14.34C50.20 14.83 49.47 14.78 45.67 16.36C41.88 17.93 33.38 22.14 29.19 23.78C25.00 25.42 22.88 25.73 20.51 26.17C18.14 26.61 16.52 26.48 14.97 26.42C13.42 26.36 12.46 26.11 11.20 25.79C9.94 25.48 8.60 25.08 7.42 24.53C6.25 23.99 4.70 22.86 4.15 22.52Z';

const EASE = [0.22, 1, 0.36, 1] as const;
const VB_W = 96;

type Props = {
  className?: string;
  /** Drives the reveal; the section already tracks this and triggers once. */
  isInView?: boolean;
};

export function BrandCurveMark({ className, isInView = true }: Props) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const greenClip = `gh-mark-green-${uid}`;
  const goldClip = `gh-mark-gold-${uid}`;

  /** Clip rect that sweeps left to right. Reduced motion starts fully open. */
  const sweep = (delay: number) =>
    reduce
      ? { initial: { width: VB_W }, animate: { width: VB_W }, transition: { duration: 0 } }
      : {
          initial: { width: 0 },
          animate: { width: isInView ? VB_W : 0 },
          transition: { duration: 1.05, delay, ease: EASE },
        };

  return (
    <span className={className} aria-hidden>
      <svg viewBox={VIEW_BOX} focusable="false" role="presentation">
        <defs>
          <clipPath id={greenClip}>
            <motion.rect x={0} y={0} height={64} {...sweep(0)} />
          </clipPath>
          <clipPath id={goldClip}>
            <motion.rect x={0} y={0} height={64} {...sweep(0.12)} />
          </clipPath>
        </defs>
        <path d={GREEN} className="gh-mark__green" clipPath={`url(#${greenClip})`} />
        <path d={GOLD} className="gh-mark__gold" clipPath={`url(#${goldClip})`} />
      </svg>
    </span>
  );
}
