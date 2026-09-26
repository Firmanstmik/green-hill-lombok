import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES, meetsPasswordPolicy } from './passwordPolicy';
import { AUTH_MESSAGES, authErrorMessage, isValidEmail, resetLinkProblem } from './authMessages';

describe('password policy', () => {
  const config = readFileSync(resolve(__dirname, '../../../supabase/config.toml'), 'utf8');

  it('matches the Supabase Auth configuration', () => {
    expect(config).toMatch(new RegExp(`^minimum_password_length = ${PASSWORD_MIN_LENGTH}$`, 'm'));
    expect(config).toMatch(/^password_requirements = "lower_upper_letters_digits"$/m);
    expect(PASSWORD_RULES.map((rule) => rule.id)).toEqual(['length', 'lower', 'upper', 'digit']);
  });

  it('accepts only passwords the server accepts', () => {
    expect(meetsPasswordPolicy('Greenhill2026')).toBe(true);
    expect(meetsPasswordPolicy('Greenhill26')).toBe(false); // 11 characters
    expect(meetsPasswordPolicy('greenhill2026')).toBe(false); // no uppercase
    expect(meetsPasswordPolicy('GREENHILL2026')).toBe(false); // no lowercase
    expect(meetsPasswordPolicy('GreenHillLombok')).toBe(false); // no digit
  });
});

describe('auth messages', () => {
  it('never passes raw Supabase errors through', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(AUTH_MESSAGES.invalidCredentials);
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe(AUTH_MESSAGES.invalidCredentials);
    expect(authErrorMessage({ status: 429, code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' })).toBe(AUTH_MESSAGES.rateLimited);
    expect(authErrorMessage({ code: 'weak_password', message: 'Password should contain…' })).toBe(AUTH_MESSAGES.weakPassword);
    expect(authErrorMessage({ code: 'same_password' })).toBe(AUTH_MESSAGES.samePassword);
    expect(authErrorMessage({ name: 'AuthSessionMissingError', message: 'Auth session missing!' })).toBe(AUTH_MESSAGES.sessionMissing);
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' })).toBe(AUTH_MESSAGES.network);
    expect(authErrorMessage({ message: 'relation "x" does not exist' })).toBe(AUTH_MESSAGES.unexpected);
  });

  it('recognises expired and invalid reset links', () => {
    expect(resetLinkProblem({ hash: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', search: '' })).toBe('expired');
    expect(resetLinkProblem({ hash: '', search: '?error=access_denied&error_code=bad_jwt' })).toBe('invalid');
    expect(resetLinkProblem({ hash: '#access_token=abc&type=recovery', search: '' })).toBeNull();
  });

  it('checks email shape', () => {
    expect(isValidEmail(' reece@example.com ')).toBe(true);
    expect(isValidEmail('reece@example')).toBe(false);
    expect(isValidEmail('reece example.com')).toBe(false);
  });
});
