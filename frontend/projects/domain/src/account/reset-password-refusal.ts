import type { ApiError } from '@cf/api';

/**
 * What the Reset password screen shows for a failed check or save (L2-045 AC4, AC5, AC6; ADR
 * 0011): `expired` is the notice "This link has expired" (mock `error`); `invalid` marks the new
 * password as the form's own check does (mock `invalid`); `failed` is "We couldn't save your
 * password" when saving (mock `failed`) and "We couldn't check your link" when checking (mock
 * `unchecked`).
 */
export type ResetPasswordRefusal = 'expired' | 'invalid' | 'failed';

/** Only a 410 `reset_link_expired` is the expired link and only a 400 refusal blames the password. */
export function resetPasswordRefusalOf(error: unknown): ResetPasswordRefusal {
  if (!isApiError(error)) return 'failed';
  if (error.status === 410 && error.code === 'reset_link_expired') return 'expired';
  if (error.status === 400 && error.code === 'validation_failed') return 'invalid';
  return 'failed';
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string'
  );
}
