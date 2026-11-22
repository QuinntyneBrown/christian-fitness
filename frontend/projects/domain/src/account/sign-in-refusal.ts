import type { ApiError } from '@cf/api';

/**
 * What the Sign in screen shows for a failed sign-in (L2-004 AC2, L2-032 AC1; ADR 0009):
 * `invalid-credentials` as "Email or password is incorrect", naming neither field (mock
 * `invalid`), and `failed` as "We couldn't sign you in" (mock `failed`) for anything else.
 */
export type SignInRefusal = 'invalid-credentials' | 'failed';

/** Only a 401 with code `invalid_credentials` blames the credentials; anything else is a failure. */
export function signInRefusalOf(error: unknown): SignInRefusal {
  return isApiError(error) && error.status === 401 && error.code === 'invalid_credentials'
    ? 'invalid-credentials'
    : 'failed';
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string'
  );
}
