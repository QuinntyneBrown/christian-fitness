import type { ApiError } from '@cf/api';
import { resetPasswordRefusalOf, type ResetPasswordRefusal } from './reset-password-refusal';

// L2-045 AC4, AC5 and AC6, L2-032 AC1: a 410 `reset_link_expired` is the expired notice, a 400
// refusal of the body marks the new password, and anything else is a failure the screen names.
describe('resetPasswordRefusalOf', () => {
  it.each<{ error: ApiError; expected: ResetPasswordRefusal }>([
    { error: { status: 410, code: 'reset_link_expired' }, expected: 'expired' },
    { error: { status: 400, code: 'validation_failed' }, expected: 'invalid' },
    { error: { status: 400, code: 'reset_link_expired' }, expected: 'failed' },
    { error: { status: 410, code: 'error' }, expected: 'failed' },
    { error: { status: 400, code: 'antiforgery_failed' }, expected: 'failed' },
    { error: { status: 500, code: 'validation_failed' }, expected: 'failed' },
    { error: { status: 500, code: 'server_error' }, expected: 'failed' },
    { error: { status: 503, code: 'error' }, expected: 'failed' },
    { error: { status: 0, code: 'network' }, expected: 'failed' },
  ])('$error.status $error.code is $expected', ({ error, expected }) => {
    expect(resetPasswordRefusalOf(error)).toBe(expected);
  });

  it('reads anything that is not an ApiError as a failure', () => {
    expect(resetPasswordRefusalOf(new Error('boom'))).toBe('failed');
  });
});
