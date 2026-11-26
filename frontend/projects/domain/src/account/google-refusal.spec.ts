import type { ApiError } from '@cf/api';
import { googleRefusalOf, type GoogleRefusal } from './google-refusal';

// L2-049 AC3, AC5, AC7, AC11, L2-004 AC9, AC10, L2-003 AC11 and the mocks' `google-failed`,
// `google-limited`, `google-unverified`, `google-no-account` and `suspended` states (ADR 0099).
// Each refusal is its status and code together; anything else is "didn't finish".
describe('googleRefusalOf', () => {
  it.each<{ error: ApiError; expected: GoogleRefusal }>([
    { error: { status: 429, code: 'too_many_attempts' }, expected: 'google-limited' },
    { error: { status: 401, code: 'google_email_unverified' }, expected: 'google-unverified' },
    { error: { status: 404, code: 'no_account' }, expected: 'google-no-account' },
    { error: { status: 403, code: 'account_suspended' }, expected: 'suspended' },
    { error: { status: 503, code: 'google_unavailable' }, expected: 'google-failed' },
    { error: { status: 400, code: 'validation_failed' }, expected: 'google-failed' },
    { error: { status: 400, code: 'antiforgery_failed' }, expected: 'google-failed' },
    { error: { status: 401, code: 'no_account' }, expected: 'google-failed' },
    { error: { status: 404, code: 'google_email_unverified' }, expected: 'google-failed' },
    { error: { status: 403, code: 'too_many_attempts' }, expected: 'google-failed' },
    { error: { status: 429, code: 'error' }, expected: 'google-failed' },
    { error: { status: 401, code: 'invalid_credentials' }, expected: 'google-failed' },
    { error: { status: 500, code: 'server_error' }, expected: 'google-failed' },
    { error: { status: 0, code: 'network' }, expected: 'google-failed' },
  ])('$error.status $error.code is $expected', ({ error, expected }) => {
    expect(googleRefusalOf(error)).toBe(expected);
  });

  it('reads anything that is not an ApiError as "didn\'t finish"', () => {
    expect(googleRefusalOf(new Error('boom'))).toBe('google-failed');
    expect(googleRefusalOf(null)).toBe('google-failed');
  });
});
