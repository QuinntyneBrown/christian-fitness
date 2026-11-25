import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AdminSeriesApi, AdminSeriesDto, AdminSeriesListDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AdminSeriesApi} over HTTP: `/api/admin/series` (ADR 0091). A failure errors with an
 * `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpAdminSeriesService implements AdminSeriesApi {
  private readonly http = inject(HttpClient);

  list(): Observable<AdminSeriesListDto> {
    return this.http.get<AdminSeriesListDto>('/api/admin/series').pipe(catchError(asApiError));
  }

  get(id: string): Observable<AdminSeriesDto> {
    return this.http
      .get<AdminSeriesDto>(`/api/admin/series/${encodeURIComponent(id)}`)
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
