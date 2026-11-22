import type { ApiError } from '@cf/api';

/**
 * What the Join screen shows for a failed join (L2-003 AC2, L2-032 AC1, L2-034 AC2; ADR 0008,
 * ADR 0010): `email-taken` on the email field (mock `invalid`), `rate-limited` as "Too many new
 * profiles" for any 429 (mock `limited`), `refused` as the generic "Check your details" alert
 * (mock `refused`), `failed` as "We couldn't create your profile" (mock `error`).
 */
export type JoinRefusal = 'email-taken' | 'rate-limited' | 'refused' | 'failed';

/** Branches on the error's code and status; anything that is not an `ApiError` is a failure. */
export function joinRefusalOf(error: unknown): JoinRefusal {
  if (!isApiError(error) || error.status === 0 || error.status >= 500) return 'failed';
  if (error.status === 429) return 'rate-limited';
  return error.code === 'email_taken' ? 'email-taken' : 'refused';
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string'
  );
}
