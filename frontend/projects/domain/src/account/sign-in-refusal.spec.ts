import type { ApiError } from '@cf/api';
import { signInRefusalOf, type SignInRefusal } from './sign-in-refusal';

// L2-004 AC2 to AC4, L2-032 AC1 and the mock's `invalid`, `error`, `suspended` and `failed`
// states (ADR 0009, ADR 0010).
describe('signInRefusalOf', () => {
  it.each<{ error: ApiError; expected: SignInRefusal }>([
    { error: { status: 401, code: 'invalid_credentials' }, expected: 'invalid-credentials' },
    { error: { status: 429, code: 'too_many_attempts' }, expected: 'too-many-attempts' },
    { error: { status: 403, code: 'account_suspended' }, expected: 'suspended' },
    { error: { status: 401, code: 'error' }, expected: 'failed' },
    { error: { status: 400, code: 'invalid_credentials' }, expected: 'failed' },
    { error: { status: 401, code: 'too_many_attempts' }, expected: 'failed' },
    { error: { status: 401, code: 'account_suspended' }, expected: 'failed' },
    { error: { status: 403, code: 'forbidden' }, expected: 'failed' },
    { error: { status: 400, code: 'antiforgery_failed' }, expected: 'failed' },
    { error: { status: 429, code: 'error' }, expected: 'failed' },
    { error: { status: 429, code: 'rate_limited' }, expected: 'failed' },
    { error: { status: 500, code: 'server_error' }, expected: 'failed' },
    { error: { status: 503, code: 'error' }, expected: 'failed' },
    { error: { status: 0, code: 'network' }, expected: 'failed' },
  ])('$error.status $error.code is $expected', ({ error, expected }) => {
    expect(signInRefusalOf(error)).toBe(expected);
  });

  it('reads anything that is not an ApiError as a failure', () => {
    expect(signInRefusalOf(new Error('boom'))).toBe('failed');
  });
});
