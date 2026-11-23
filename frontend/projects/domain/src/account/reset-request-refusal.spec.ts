import type { ApiError } from '@cf/api';
import { resetRequestRefusalOf, type ResetRequestRefusal } from './reset-request-refusal';

// L2-044 AC5 and AC7, L2-032 AC1, L2-034 AC3: a 400 refusal marks the email field as the form's
// own check does (mock `invalid`); any 429 is "Too many requests" (mock `limited`); anything else
// is "We couldn't send the email" (mock `error`).
describe('resetRequestRefusalOf', () => {
  it.each<{ error: ApiError; expected: ResetRequestRefusal }>([
    { error: { status: 400, code: 'validation_failed' }, expected: 'invalid' },
    { error: { status: 400, code: 'field_too_long' }, expected: 'invalid' },
    { error: { status: 400, code: 'antiforgery_failed' }, expected: 'failed' },
    { error: { status: 401, code: 'unauthenticated' }, expected: 'failed' },
    { error: { status: 500, code: 'validation_failed' }, expected: 'failed' },
    { error: { status: 429, code: 'rate_limited' }, expected: 'rate-limited' },
    { error: { status: 429, code: 'error' }, expected: 'rate-limited' },
    { error: { status: 500, code: 'server_error' }, expected: 'failed' },
    { error: { status: 503, code: 'error' }, expected: 'failed' },
    { error: { status: 0, code: 'network' }, expected: 'failed' },
  ])('$error.status $error.code is $expected', ({ error, expected }) => {
    expect(resetRequestRefusalOf(error)).toBe(expected);
  });

  it('reads anything that is not an ApiError as a failure', () => {
    expect(resetRequestRefusalOf(new Error('boom'))).toBe('failed');
  });
});
