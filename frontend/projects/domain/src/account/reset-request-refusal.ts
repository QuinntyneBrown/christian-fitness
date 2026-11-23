import type { ApiError } from '@cf/api';

/**
 * What the Forgot password screen shows for a failed reset request (L2-044 AC5, AC7, L2-034 AC3;
 * ADR 0010, ADR 0013): `invalid` marks the email field, as the form's own check does (mock
 * `invalid`); `rate-limited` is "Too many requests" for any 429 (mock `limited`); `failed` is
 * "We couldn't send the email" (mock `error`).
 */
export type ResetRequestRefusal = 'invalid' | 'rate-limited' | 'failed';

/** Only a 400 refusal of the body blames the email, and a 429 is the address's limit; anything else is a failure. */
export function resetRequestRefusalOf(error: unknown): ResetRequestRefusal {
  if (!isApiError(error)) return 'failed';
  if (error.status === 429) return 'rate-limited';
  return error.status === 400 &&
    (error.code === 'validation_failed' || error.code === 'field_too_long')
    ? 'invalid'
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
