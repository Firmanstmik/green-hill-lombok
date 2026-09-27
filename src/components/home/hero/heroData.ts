/**
 * Hero chapter data — real Green Hill photography only.
 *
 * Masters are served byte-for-byte from `hero-masters/` (copied from
 * `hero section image bg/`). No crop, grade, resize, or re-encode.
 */

import heroSection1 from '@/assets/greenhill/hero-masters/green-hill-hero-section-1.webp';
import heroSection2 from '@/assets/greenhill/hero-masters/green-hill-hero-section-2.webp';
import heroSection3 from '@/assets/greenhill/hero-masters/green-hill-hero-section-3.webp';

export type HeroSlide = {
  id: string;
  /** Untouched master WebP URL. */
  src: string;
  width: number;
  height: number;
  /**
   * Focal point for object-fit: cover when the hero box aspect differs
   * from the master (layout only — the file itself is never altered).
   */
  focus: { desktop: string; mobile: string };
  alt: string;
  number: string;
  title: string;
};

/**
 * Three editorial chapters — one master photograph each.
 *
 * 01 Land & Ocean  → section 1
 * 02 Land & Light  → section 3
 * 03 On the Ground → section 2 (vehicle / site visit)
 */
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'land-ocean',
    src: heroSection1,
    width: 1672,
    height: 940,
    focus: { desktop: '50% 45%', mobile: '50% 42%' },
    alt: 'South Lombok coastline: green hills meeting turquoise water under open sky',
    number: '01',
    title: 'Land & Ocean',
  },
  {
    id: 'land-light',
    src: heroSection3,
    width: 1672,
    height: 941,
    focus: { desktop: '50% 45%', mobile: '50% 45%' },
    alt: 'Elevated South Lombok valley at golden hour, looking across the landscape toward the coast',
    number: '02',
    title: 'Land & Light',
  },
  {
    id: 'on-the-ground',
    src: heroSection2,
    width: 1672,
    height: 941,
    focus: { desktop: '50% 55%', mobile: '50% 58%' },
    alt: 'Site visit on an elevated South Lombok plot: vehicle on cleared ground overlooking the valley and ocean',
    number: '03',
    title: 'On the Ground',
  },
];

/** Quiet, expensive easing — used across hero motion. */
export const HERO_EASE = [0.22, 1, 0.36, 1] as const;

/** Slower-settling cinematic ease for the photograph crossfade. */
export const HERO_CINEMA_EASE = [0.16, 1, 0.3, 1] as const;

/** Each chapter stays this long (ms) — time to see the photograph and read its caption. */
export const HERO_AUTO_MS = 7000;

/** Crossfade duration (seconds) — editorial page-turn, not a carousel wipe. */
export const HERO_CROSSFADE_S = 1.2;

/**
 * Caption choreography (ms, from the start of the crossfade): the old caption
 * leaves after 180 ms, the new one enters from 340 ms and settles by ~900 ms.
 * The values live in CSS (.gh-hero-caption); kept here as the reference.
 */
export const HERO_CAPTION_TIMING = { outDelay: 180, outDuration: 420, inDelay: 340, inDuration: 560 } as const;
