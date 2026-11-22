import type { ApiError } from '@cf/api';

/**
 * The `ApiError` a service gives a screen for a failed response (L2-032): the status, the
 * ProblemDetails `code` (`network` when no answer arrived, `error` when the body carries none) and
 * the field errors when they are a map of lists of sentences. Nothing else of the body is kept.
 */
export function apiErrorOf(status: number, body: unknown): ApiError {
  if (status === 0) return { status, code: 'network' };
  const problem =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const code = typeof problem['code'] === 'string' ? problem['code'] : 'error';
  const errors = problem['errors'];
  return isFieldErrors(errors) ? { status, code, errors } : { status, code };
}

function isFieldErrors(value: unknown): value is Record<string, string[]> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (messages) => Array.isArray(messages) && messages.every((m) => typeof m === 'string'),
    )
  );
}
