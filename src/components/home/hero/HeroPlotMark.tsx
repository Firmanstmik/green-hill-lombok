import { motion, useReducedMotion } from 'framer-motion';
import { HERO_EASE } from './heroData';

/**
 * The eyebrow mark — a surveyed land parcel.
 *
 * It replaces a plain gold rule, which decorated the line without saying
 * anything. This is the one glyph in the hero that names the business: an
 * irregular boundary polygon with a peg at each corner, the way a parcel is
 * drawn on a land title. Green Hill sells land, and a visitor reads that in
 * the first 18 pixels rather than three paragraphs down.
 *
 * Deliberately not from an icon set. Tested at render size against the
 * photograph, the obvious alternatives all collapsed into something else:
 * concentric contours read as a target, a hill-and-sun read as an image
 * placeholder, a trig triangle read as a warning sign. An irregular polygon
 * with corner pegs reads as one thing only.
 *
 * The boundary draws itself once on entry and the pegs settle after it, which
 * says "surveyed" rather than "decorated". Under reduced motion it is simply
 * there.
 */

/** Corner pegs, in draw order around the boundary. */
const PEGS = [
  { cx: 9.6, cy: 3.1 },
  { cx: 21.4, cy: 7.3 },
  { cx: 15, cy: 18.9 },
  { cx: 3.4, cy: 15.2 },
  { cx: 2.6, cy: 7.4 },
];

const BOUNDARY = 'M2.6 7.4 9.6 3.1l11.8 4.2-6.4 11.6L3.4 15.2Z';

export function HeroPlotMark() {
  const reduce = useReducedMotion();

  return (
    <span className="gh-hero-eyebrow__mark" aria-hidden>
      <svg viewBox="0 0 24 22" width="19" height="17" fill="none" focusable="false">
        <motion.path
          d={BOUNDARY}
          stroke="currentColor"
          strokeWidth={1.05}
          strokeLinejoin="round"
          opacity={0.8}
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.35, ease: HERO_EASE }}
        />
        {PEGS.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={1.15}
            fill="currentColor"
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: reduce ? 0 : 0.4,
              delay: reduce ? 0 : 0.85 + i * 0.07,
              ease: HERO_EASE,
            }}
          />
        ))}
      </svg>
    </span>
  );
}
