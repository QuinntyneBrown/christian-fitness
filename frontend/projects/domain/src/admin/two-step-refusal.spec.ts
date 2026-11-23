import type { ApiError } from '@cf/api';
import {
  twoStepEndingOf,
  twoStepRefusalOf,
  type TwoStepEnding,
  type TwoStepRefusal,
} from './two-step-refusal';

// L2-046 AC3 to AC5, AC7 and the mock's `invalid` and `failed` states and the sign-in screen's
// `two-step-expired` and `two-step-locked` states (ADR 0012).
describe('twoStepRefusalOf', () => {
  it.each<{ error: ApiError; expected: TwoStepRefusal }>([
    { error: { status: 401, code: 'invalid_code' }, expected: 'invalid-code' },
    { error: { status: 401, code: 'two_step_expired' }, expected: 'expired' },
    { error: { status: 429, code: 'too_many_attempts' }, expected: 'locked' },
    { error: { status: 400, code: 'invalid_code' }, expected: 'failed' },
    { error: { status: 403, code: 'two_step_expired' }, expected: 'failed' },
    { error: { status: 401, code: 'too_many_attempts' }, expected: 'failed' },
    { error: { status: 401, code: 'unauthenticated' }, expected: 'failed' },
    { error: { status: 403, code: 'not_staff' }, expected: 'failed' },
    { error: { status: 400, code: 'antiforgery_failed' }, expected: 'failed' },
    { error: { status: 500, code: 'server_error' }, expected: 'failed' },
    { error: { status: 0, code: 'network' }, expected: 'failed' },
  ])('$error.status $error.code is $expected', ({ error, expected }) => {
    expect(twoStepRefusalOf(error)).toBe(expected);
  });

  it.each([null, undefined, new Error('boom'), 'invalid_code'])(
    'reads %s, which is not an ApiError, as a failure',
    (error) => {
      expect(twoStepRefusalOf(error)).toBe('failed');
    },
  );
});

// The navigation state the code screen leaves for Staff sign in: only the two endings it knows.
describe('twoStepEndingOf', () => {
  it.each<{ state: unknown; expected: TwoStepEnding | null }>([
    { state: { twoStep: 'expired' }, expected: 'expired' },
    { state: { twoStep: 'locked' }, expected: 'locked' },
    { state: { twoStep: 'failed' }, expected: null },
    { state: { twoStep: 'invalid-code' }, expected: null },
    { state: { twoStep: '<b>expired</b>' }, expected: null },
    { state: { other: 'expired' }, expected: null },
    { state: {}, expected: null },
    { state: 'expired', expected: null },
    { state: null, expected: null },
    { state: undefined, expected: null },
  ])('$state is $expected', ({ state, expected }) => {
    expect(twoStepEndingOf(state)).toBe(expected);
  });
});
