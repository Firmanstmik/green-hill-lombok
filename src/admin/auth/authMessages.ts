/**
 * Calm, human wording for Supabase Auth errors. Raw technical messages are
 * never shown to the person signing in.
 */
type AuthErrorLike = { message?: string; code?: string; status?: number; name?: string } | null | undefined;

export const AUTH_MESSAGES = {
  invalidCredentials: 'Those details don’t match our records. Please check your email and password and try again.',
  invalidEmail: 'Please enter a valid email address.',
  missingFields: 'Please enter your email address and password.',
  notConfirmed: 'This account has not been confirmed yet. Please use the link in your invitation email.',
  rateLimited: 'There have been several attempts in a short time. Please wait a few minutes and try again.',
  network: 'We couldn’t reach Green Hill just now. Please check your connection and try again.',
  weakPassword: 'That password doesn’t meet the requirements yet.',
  samePassword: 'Please choose a password that is different from your current one.',
  mismatch: 'The two passwords don’t match.',
  sessionMissing: 'Your reset session has ended. Please request a new reset link.',
  expiredLink: 'This password reset link has expired. Please request a new one.',
  invalidLink: 'This password reset link isn’t valid. Please request a new one.',
  unexpected: 'Something went wrong on our side. Please try again in a moment.',
} as const;

export function authErrorMessage(error: AuthErrorLike): string {
  const code = error?.code ?? '';
  const message = (error?.message ?? '').toLowerCase();
  const name = error?.name ?? '';

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return AUTH_MESSAGES.invalidCredentials;
  if (code === 'email_not_confirmed') return AUTH_MESSAGES.notConfirmed;
  if (code === 'email_address_invalid' || code === 'validation_failed') return AUTH_MESSAGES.invalidEmail;
  if (error?.status === 429 || code.startsWith('over_') || message.includes('rate limit')) return AUTH_MESSAGES.rateLimited;
  if (code === 'weak_password' || message.includes('password should')) return AUTH_MESSAGES.weakPassword;
  if (code === 'same_password') return AUTH_MESSAGES.samePassword;
  if (code === 'session_not_found' || code === 'session_expired' || name === 'AuthSessionMissingError') return AUTH_MESSAGES.sessionMissing;
  if (code === 'otp_expired') return AUTH_MESSAGES.expiredLink;
  if (name === 'AuthRetryableFetchError' || message.includes('failed to fetch') || message.includes('network')) return AUTH_MESSAGES.network;
  return AUTH_MESSAGES.unexpected;
}

/** Reset links that fail come back with `error_code` in the URL hash (or query). */
export function resetLinkProblem(location: { hash: string; search: string }): 'expired' | 'invalid' | null {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(location.search);
  const code = params.get('error_code') ?? query.get('error_code');
  const error = params.get('error') ?? query.get('error');
  if (!code && !error) return null;
  return code === 'otp_expired' ? 'expired' : 'invalid';
}

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
