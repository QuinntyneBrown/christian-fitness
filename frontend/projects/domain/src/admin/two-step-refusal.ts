import type { ApiError } from '@cf/api';

/**
 * What the code screen does with a refused code (L2-046 AC3 to AC5, AC7; ADR 0012):
 * `invalid-code` says "That code doesn't match…" under the field (mock `invalid`), `expired` and
 * `locked` end the pending sign-in and go back to Staff sign in, and `failed` says "We couldn't
 * check your code…" under the field (mock `failed`) for anything else.
 */
export type TwoStepRefusal = 'invalid-code' | 'expired' | 'locked' | 'failed';

/** How a pending sign-in ended, as Staff sign in tells it (mock states `two-step-expired`, `two-step-locked`). */
export type TwoStepEnding = 'expired' | 'locked';

/** Each refusal is its status and its code together; anything else is a failure. */
export function twoStepRefusalOf(error: unknown): TwoStepRefusal {
  if (!isApiError(error)) return 'failed';
  if (error.status === 401 && error.code === 'invalid_code') return 'invalid-code';
  if (error.status === 401 && error.code === 'two_step_expired') return 'expired';
  if (error.status === 429 && error.code === 'too_many_attempts') return 'locked';
  return 'failed';
}

/**
 * The ending a router navigation state carries (`{ twoStep: 'expired' }`), or null: only the two
 * endings the code screen leaves count, so no other value reaches the screen.
 */
export function twoStepEndingOf(state: unknown): TwoStepEnding | null {
  const value =
    typeof state === 'object' && state !== null ? (state as { twoStep?: unknown }).twoStep : null;
  return value === 'expired' || value === 'locked' ? value : null;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string'
  );
}
