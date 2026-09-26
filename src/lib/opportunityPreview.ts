/**
 * Admin preview hand-off.
 * The editor writes the current (possibly unsaved) record here, then opens the
 * real public memo with `?preview=1`. The memo renders that record instead of
 * fetching, so the preview is the exact public experience.
 * It only ever reads this browser's own storage, so nothing is exposed.
 */
export const PREVIEW_STORAGE_KEY = 'gh-admin-preview';
export const PREVIEW_ROUTE_KEY = 'preview';

type PreviewPayload = { key: string; row: Record<string, unknown>; at: number };

export function writeOpportunityPreview(key: string, row: Record<string, unknown>): void {
  try {
    const payload: PreviewPayload = { key, row, at: Date.now() };
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or blocked: the preview falls back to the saved record.
  }
}

export function readOpportunityPreview(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as PreviewPayload;
    return payload && payload.key === key && payload.row ? payload.row : null;
  } catch {
    return null;
  }
}

export function isPreviewRequest(search: string): boolean {
  return new URLSearchParams(search).get(PREVIEW_ROUTE_KEY) === '1';
}
