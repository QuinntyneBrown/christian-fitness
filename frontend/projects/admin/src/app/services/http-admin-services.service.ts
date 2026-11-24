import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AdminServicesApi, PendingApplicationsDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AdminServicesApi} over HTTP: `GET /api/admin/services/applications` (ADR 0048). A failure
 * errors with an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds
 * no state.
 */
@Injectable()
export class HttpAdminServicesService implements AdminServicesApi {
  private readonly http = inject(HttpClient);

  applications(): Observable<PendingApplicationsDto> {
    return this.http
      .get<PendingApplicationsDto>('/api/admin/services/applications')
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
