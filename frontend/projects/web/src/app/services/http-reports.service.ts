import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ReportMessageDto, ReportsApi } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, type Observable, throwError } from 'rxjs';

/**
 * {@link ReportsApi} over HTTP: `POST /api/messages/{id}/reports` (ADR 0000). A 5xx opens the
 * server-error screen through the interceptor; every failure passes on to the dialog as an `ApiError`.
 * It holds no state and is provided on the chat screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpReportsService implements ReportsApi {
  private readonly http = inject(HttpClient);

  report(messageId: string, report: ReportMessageDto): Observable<void> {
    return this.http
      .post<void>(`/api/messages/${encodeURIComponent(messageId)}/reports`, report)
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
          ),
        ),
      );
  }
}
