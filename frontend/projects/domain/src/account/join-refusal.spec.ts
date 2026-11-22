import type { ApiError } from '@cf/api';
import { joinRefusalOf, type JoinRefusal } from './join-refusal';

// L2-003 AC2, L2-032 AC1 and the mock's `invalid`, `refused` and `error` states.
describe('joinRefusalOf', () => {
  it.each<{ error: ApiError; expected: JoinRefusal }>([
    { error: { status: 409, code: 'email_taken' }, expected: 'email-taken' },
    { error: { status: 400, code: 'field_too_long' }, expected: 'refused' },
    { error: { status: 400, code: 'validation_failed' }, expected: 'refused' },
    { error: { status: 429, code: 'error' }, expected: 'refused' },
    { error: { status: 409, code: 'error' }, expected: 'refused' },
    { error: { status: 500, code: 'server_error' }, expected: 'failed' },
    { error: { status: 503, code: 'error' }, expected: 'failed' },
    { error: { status: 0, code: 'network' }, expected: 'failed' },
  ])('$error.status $error.code is $expected', ({ error, expected }) => {
    expect(joinRefusalOf(error)).toBe(expected);
  });

  it('reads anything that is not an ApiError as a failure', () => {
    expect(joinRefusalOf(new Error('boom'))).toBe('failed');
  });
});
