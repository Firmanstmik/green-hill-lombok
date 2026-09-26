import { describe, expect, it } from 'vitest';
import { friendlyError } from './errors';

const fallback = 'Could not save this opportunity.';

describe('friendlyError', () => {
  it('never shows technical Supabase text', () => {
    for (const error of [
      { message: 'new row violates row-level security policy for table "properties"', code: '42501' },
      { message: 'JWT expired', code: 'PGRST301' },
      { message: 'TypeError: Failed to fetch' },
      { message: 'The object exceeded the maximum allowed size', statusCode: '413' },
      { message: 'mime type image/gif is not supported' },
      { message: 'new row for relation "properties" violates check constraint "properties_price_display_check"', code: '23514' },
      { message: 'column "foo" does not exist', code: '42703' },
      { message: 'syntax error at or near "select"', code: '42601' },
    ]) {
      const text = friendlyError(error, fallback);
      expect(text).not.toMatch(/row-level|JWT|TypeError|relation|constraint|column|syntax|mime/i);
      expect(text.length).toBeGreaterThan(10);
    }
  });

  it('explains the situations an admin can act on', () => {
    expect(friendlyError({ message: 'Failed to fetch' }, fallback)).toMatch(/connection/);
    expect(friendlyError({ message: 'JWT expired', code: 'PGRST301' }, fallback)).toMatch(/sign in again/);
    expect(friendlyError({ message: 'permission denied for table enquiries', code: '42501' }, fallback)).toMatch(/permission/);
    expect(friendlyError({ message: 'Payload too large', statusCode: 413 }, fallback)).toMatch(/too large/);
    expect(friendlyError({ message: 'This page was changed somewhere else since you opened it', code: '40001' }, fallback)).toMatch(/Reload/);
    expect(friendlyError({ message: 'violates check constraint "notes_publishable"' }, fallback)).toMatch(/note needs/);
  });

  it('falls back to the action’s own sentence for anything unknown', () => {
    expect(friendlyError({ message: 'column "foo" does not exist' }, fallback)).toBe(fallback);
    expect(friendlyError(null, fallback)).toBe(fallback);
  });
});
