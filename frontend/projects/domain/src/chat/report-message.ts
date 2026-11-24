import type { ApiError, ReportMessageDto } from '@cf/api';

/** The longest reason a report may carry, in characters (L2-017 AC3), as the API's validator. */
export const REPORT_REASON_MAX = 500;

/** What the report dialog sends for the text typed in Reason: trimmed, `null` when blank. */
export function reportOf(reason: string): ReportMessageDto {
  const text = reason.trim();
  return { reason: text === '' ? null : text };
}

/** Whether `reason`, once trimmed, is within the limit the API enforces. */
export function reportReasonFits(reason: string): boolean {
  return reason.trim().length <= REPORT_REASON_MAX;
}

/**
 * What a refused report means to the member (mocks `failed` and `refused`): `already` when they
 * reported this message before (`already_reported`), `failed` for any other refusal or no answer.
 * The server's words are never shown.
 */
export type ReportRefusal = 'already' | 'failed';

/** Branches on the error's `code`; anything that is not an `ApiError` is a failure. */
export function reportRefusalOf(error: unknown): ReportRefusal {
  const code = typeof error === 'object' && error !== null ? (error as ApiError).code : undefined;
  return code === 'already_reported' ? 'already' : 'failed';
}
