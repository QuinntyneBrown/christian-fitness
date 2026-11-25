import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { EventSeriesApi, SeriesCountDto, SeriesListDto, SeriesSelection } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link EventSeriesApi} over HTTP: `GET /api/events/series?category=&q=&joined=true` and
 * `GET /api/events/series/count` (ADR 0093); the member is the session's, never named in the
 * request. A 5xx opens the server-error screen through the interceptor; every failure passes on to
 * the screen. It holds no state, and is provided on the Events screen, so it lives only while the
 * screen does.
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
}
