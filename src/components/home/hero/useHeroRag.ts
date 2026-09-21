import { useEffect, useState } from 'react';

/**
 * Matches the hero's own `@media (max-width: 767px)` breakpoint.
 *
 * The headline rag is authored per breakpoint, so this has to be right on the
 * *first* paint: the shared `useIsMobile` hook starts `undefined` and settles
 * in an effect, which would flash the desktop rag — visible, because the
 * headline is the LCP element. Reading `matchMedia` in the state initialiser
 * removes the swap entirely.
 */
const QUERY = '(max-width: 767px)';

export function useHeroNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    setNarrow(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return narrow;
}
