import type { ApiError } from '@cf/api';
import { staffSignInRefusalOf, type StaffSignInRefusal } from './staff-sign-in-refusal';

// L2-018 AC2, AC3, L2-032 AC1 and the mock's `invalid`, `not-staff` and `failed` states (ADR 0011).
describe('staffSignInRefusalOf', () => {
  it.each<{ error: ApiError; expected: StaffSignInRefusal }>([
    { error: { status: 401, code: 'invalid_credentials' }, expected: 'invalid-credentials' },
    { error: { status: 403, code: 'not_staff' }, expected: 'not-staff' },
    { error: { status: 403, code: 'forbidden' }, expected: 'failed' },
    { error: { status: 403, code: 'account_suspended' }, expected: 'failed' },
    { error: { status: 429, code: 'too_many_attempts' }, expected: 'failed' },
    { error: { status: 401, code: 'not_staff' }, expected: 'failed' },
    { error: { status: 401, code: 'unauthenticated' }, expected: 'failed' },
    { error: { status: 400, code: 'antiforgery_failed' }, expected: 'failed' },
    { error: { status: 500, code: 'server_error' }, expected: 'failed' },
    { error: { status: 0, code: 'network' }, expected: 'failed' },
  ])('$error.status $error.code is $expected', ({ error, expected }) => {
    expect(staffSignInRefusalOf(error)).toBe(expected);
  });

  it.each([null, undefined, new Error('boom'), 'not_staff'])(
    'reads %s, which is not an ApiError, as a failure',
    (error) => {
      expect(staffSignInRefusalOf(error)).toBe('failed');
    },
  );
});
