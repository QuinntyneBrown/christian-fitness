import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminEventDto,
  AdminEventListDto,
  AdminEventsApi,
  AdminEventTab,
  CreateEventRequestDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AdminEventsApi} over HTTP: `GET` and `POST /api/admin/events` (ADR 0017). A failure
 * errors with an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds
 * no state.
 */
@Injectable()
export class HttpAdminEventsService implements AdminEventsApi {
  private readonly http = inject(HttpClient);

  list(tab: AdminEventTab): Observable<AdminEventListDto> {
    return this.http
      .get<AdminEventListDto>('/api/admin/events', { params: { status: tab } })
      .pipe(catchError(asApiError));
  }

  create(request: CreateEventRequestDto): Observable<AdminEventDto> {
    return this.http.post<AdminEventDto>('/api/admin/events', request).pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
