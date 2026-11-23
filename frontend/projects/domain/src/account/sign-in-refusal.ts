import type { ApiError } from '@cf/api';

/**
 * What the Sign in screen shows for a failed sign-in (L2-004 AC2 to AC4, L2-032 AC1; ADR 0009,
 * ADR 0011): `invalid-credentials` as "Email or password is incorrect", naming neither field (mock
 * `invalid`); `too-many-attempts` as "Sign-in paused for 15 minutes" (mock `error`); `suspended`
 * as "Your account is suspended" with whom to contact (mock `suspended`); and `failed` as "We
 * couldn't sign you in" (mock `failed`) for anything else.
 */
export type SignInRefusal = 'invalid-credentials' | 'too-many-attempts' | 'suspended' | 'failed';

/** Each refusal is its status and code together; any other answer is a failure. */
const REFUSALS: readonly (readonly [number, string, SignInRefusal])[] = [
  [401, 'invalid_credentials', 'invalid-credentials'],
  [429, 'too_many_attempts', 'too-many-attempts'],
  [403, 'account_suspended', 'suspended'],
];

export function signInRefusalOf(error: unknown): SignInRefusal {
  if (!isApiError(error)) return 'failed';
  const match = REFUSALS.find(([status, code]) => status === error.status && code === error.code);
  return match ? match[2] : 'failed';
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string'
  );
}
