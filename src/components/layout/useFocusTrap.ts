import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keep Tab inside an open dialog.
 *
 * The mobile menu declared `aria-modal="true"` but nothing enforced it: tabbing
 * through it walked straight out into the hero's buttons, which are covered by
 * the overlay and invisible. A keyboard or screen-reader user ended up
 * operating controls they could not see.
 *
 * Deliberately a focus trap only — the Escape key and the click-away are still
 * the dialog's own business, so this stays one concern.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Queried per keystroke: the menu staggers its items in, so the set of
      // focusable nodes is not stable at the moment the dialog opens.
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement as HTMLElement | null;

      // Focus escaped (or never entered) — pull it back to the right edge.
      if (!current || !root.contains(current)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [ref, active]);
}
