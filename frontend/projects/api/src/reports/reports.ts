import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * What a member says when they report a message (L2-017; ADR 0057): an optional reason of at most 500
 * characters, `null` when they gave none.
 */
export interface ReportMessageDto {
  reason: string | null;
}

/**
 * Reports a message of a group chat or a direct conversation (L2-017; ADR 0057). It completes once the
 * report is recorded and the sender is flagged for staff. A refusal errors with an `ApiError` whose
 * `code` a screen branches on: `already_reported`, `cannot_report_own_message`, `message_not_found` and
 * `field_too_long`; any other failure is a generic one.
 */
export interface ReportsApi {
  report(messageId: string, report: ReportMessageDto): Observable<void>;
}

/** Binds {@link ReportsApi}; the chat screen's providers provide it. */
export const REPORTS_SERVICE = new InjectionToken<ReportsApi>('REPORTS_SERVICE');
