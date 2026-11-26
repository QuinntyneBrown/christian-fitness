import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AddSessionDto,
  AdminSeriesApi,
  AdminSeriesDto,
  AdminSeriesListDto,
  EventHostDto,
  EventHostListDto,
  EventImageDto,
  SeriesDraftDto,
  SessionChangeDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AdminSeriesApi} over HTTP: `/api/admin/series`, its hosts and its images (ADR 0091). A failure errors with an
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

  create(draft: SeriesDraftDto): Observable<AdminSeriesDto> {
    return this.http.post<AdminSeriesDto>('/api/admin/series', draft).pipe(catchError(asApiError));
  }

  update(id: string, draft: SeriesDraftDto): Observable<AdminSeriesDto> {
    return this.http
      .put<AdminSeriesDto>(`/api/admin/series/${encodeURIComponent(id)}`, draft)
      .pipe(catchError(asApiError));
  }

  addSession(id: string, session: AddSessionDto): Observable<AdminSeriesDto> {
    return this.http
      .post<AdminSeriesDto>(`/api/admin/series/${encodeURIComponent(id)}/sessions`, session)
      .pipe(catchError(asApiError));
  }

  cancelSession(id: string, sessionId: string): Observable<SessionChangeDto> {
    return this.http
      .post<SessionChangeDto>(
        `/api/admin/series/${encodeURIComponent(id)}/sessions/${encodeURIComponent(sessionId)}/cancel`,
        null,
      )
      .pipe(catchError(asApiError));
  }

  restoreSession(id: string, sessionId: string): Observable<SessionChangeDto> {
    return this.http
      .post<SessionChangeDto>(
        `/api/admin/series/${encodeURIComponent(id)}/sessions/${encodeURIComponent(sessionId)}/restore`,
        null,
      )
      .pipe(catchError(asApiError));
  }

  defaultHost(): Observable<EventHostDto> {
    return this.http
      .get<EventHostDto>('/api/admin/series/hosts/default')
      .pipe(catchError(asApiError));
  }

  searchHosts(q: string): Observable<EventHostListDto> {
    return this.http
      .get<EventHostListDto>('/api/admin/series/hosts', { params: { q } })
      .pipe(catchError(asApiError));
  }

  uploadImage(file: File): Observable<EventImageDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<EventImageDto>('/api/admin/series/images', body)
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
