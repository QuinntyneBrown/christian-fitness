import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  EventSeriesApi,
  SeriesCountDto,
  SeriesDetailDto,
  SeriesListDto,
  SeriesSelection,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, type Observable, throwError } from 'rxjs';

/**
 * {@link EventSeriesApi} over HTTP: `GET /api/events/series?category=&q=&joined=true`,
 * `GET /api/events/series/count` (ADR 0093), `GET /api/events/series/{id}` (ADR 0096) and
 * `POST /api/events/series/{id}/enrolment` (ADR 0099); the
 * member is the session's, never named in the request. A 5xx opens the server-error screen
 * through the interceptor; every failure passes on to the screen. It holds no state, and is provided on the Events and Event series screens, so it
 * lives only while a screen does.
 */
@Injectable()
export class HttpEventSeriesService implements EventSeriesApi {
  private readonly http = inject(HttpClient);

  list(selection: SeriesSelection): Observable<SeriesListDto> {
    let params = new HttpParams();
    if (selection.category) params = params.set('category', selection.category);
    if (selection.q) params = params.set('q', selection.q);
    if (selection.joined) params = params.set('joined', 'true');
    return this.http.get<SeriesListDto>('/api/events/series', { params });
  }

  count(): Observable<SeriesCountDto> {
    return this.http.get<SeriesCountDto>('/api/events/series/count');
  }

  get(id: string): Observable<SeriesDetailDto> {
    return this.http.get<SeriesDetailDto>(`/api/events/series/${encodeURIComponent(id)}`);
  }

  join(id: string): Observable<SeriesDetailDto> {
    return this.http
      .post<SeriesDetailDto>(`/api/events/series/${encodeURIComponent(id)}/enrolment`, null)
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
