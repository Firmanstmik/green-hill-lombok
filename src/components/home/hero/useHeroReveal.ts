import { useReducedMotion } from 'framer-motion';
import { HERO_EASE } from './heroData';

/**
 * Shared “speaking” entrance — opacity + restrained lift.
 * Reduced motion: fade only, no transform.
 */
export function useHeroReveal() {
  const reduce = useReducedMotion();

  const reveal = (delay: number, y = 16) => {
    if (reduce) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.45, delay: Math.min(delay, 0.2), ease: HERO_EASE },
      };
    }
    return {
      initial: { opacity: 0, y },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.82, delay, ease: HERO_EASE },
    };
  };

  return { reduce, reveal };
}
