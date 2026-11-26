import type { ApiError } from '@cf/api';

/**
 * What Sign in and Join show when a Google sign-in is refused or doesn't finish (L2-049 AC5, AC11;
 * ADR 0099): `google-limited` as "Too many attempts" (mock `google-limited`), `google-unverified`
 * as "Your Google email isn't verified" (mock `google-unverified`), `google-no-account` as the
 * notice that offers Join (Sign in's mock `google-no-account`), `suspended` as "Your account is
 * suspended" (mock `suspended`), and `google-failed` as "Google sign-in didn't finish" (mock
 * `google-failed`) for anything else, Google being unavailable included.
 */
export type GoogleRefusal =
  'google-limited' | 'google-unverified' | 'google-no-account' | 'suspended' | 'google-failed';

/** Each refusal is its status and code together. */
const REFUSALS: readonly (readonly [number, string, GoogleRefusal])[] = [
  [429, 'too_many_attempts', 'google-limited'],
  [401, 'google_email_unverified', 'google-unverified'],
  [404, 'no_account', 'google-no-account'],
  [403, 'account_suspended', 'suspended'],
];

export function googleRefusalOf(error: unknown): GoogleRefusal {
  if (!isApiError(error)) return 'google-failed';
  const match = REFUSALS.find(([status, code]) => status === error.status && code === error.code);
  return match ? match[2] : 'google-failed';
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string'
  );
}
