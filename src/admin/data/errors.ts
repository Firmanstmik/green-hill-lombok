/**
 * Turns Supabase (database, storage, auth) errors into calm sentences for
 * the admin. Technical text never reaches the screen: anything not
 * recognised here becomes the caller's own sentence for the action
 * ("Could not save this opportunity.").
 */
export type BackendError = { message?: string; code?: string; name?: string; status?: number; statusCode?: string | number } | null | undefined;

const RULES: { test: (e: Required<Pick<NonNullable<BackendError>, 'message' | 'code'>> & { status: string; name: string }) => boolean; text: string }[] = [
  {
    test: (e) => /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(e.message) || e.name === 'AuthRetryableFetchError',
    text: 'We couldn’t reach Green Hill just now. Please check your connection and try again.',
  },
  {
    test: (e) => ['PGRST301', 'PGRST303'].includes(e.code) || e.status === '401' || /jwt|session.*(expired|missing)/i.test(e.message),
    text: 'Your session has ended. Please sign in again.',
  },
  {
    test: (e) => e.code === '42501' || /row-level security|permission denied|only the green hill admin|gh:not_admin/i.test(e.message),
    text: 'Your account doesn’t have permission to do this. Please sign in again with an admin account.',
  },
  {
    test: (e) => e.status === '413' || /exceeded the maximum allowed size|payload too large|entity too large/i.test(e.message),
    text: 'This file is too large to upload.',
  },
  {
    test: (e) => /mime type|invalid_mime_type|content type .* not (allowed|supported)/i.test(e.message),
    text: 'This file type isn’t supported here.',
  },
  {
    test: (e) => e.status === '429' || /rate limit|too many requests/i.test(e.message),
    text: 'There have been a lot of requests in a short time. Please wait a moment and try again.',
  },
  {
    test: (e) => /changed somewhere else since you opened it/i.test(e.message),
    text: 'This was changed somewhere else since you opened it. Reload to see the latest version.',
  },
  {
    test: (e) => /properties_price_display_check/.test(e.message),
    text: 'Please check the price: for a range, the upper amount must be higher than the starting amount.',
  },
  {
    test: (e) => /notes_publishable/.test(e.message),
    text: 'A note needs a title, its text and website-ready images before it can be published.',
  },
  {
    test: (e) => /properties_media_matches_visibility/.test(e.message),
    text: 'Some files are still private for this opportunity. Save again so Green Hill can prepare them for the website.',
  },
  {
    test: (e) => /(notes|site_content)_size/.test(e.message),
    text: 'This is too long to save. Please shorten it a little.',
  },
];

export function friendlyError(error: BackendError, fallback: string): string {
  if (!error) return fallback;
  const facts = {
    message: String(error.message ?? ''),
    code: String(error.code ?? ''),
    status: String(error.status ?? error.statusCode ?? ''),
    name: String(error.name ?? ''),
  };
  return RULES.find((rule) => rule.test(facts))?.text ?? fallback;
}
