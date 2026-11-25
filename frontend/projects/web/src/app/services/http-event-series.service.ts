import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { EventSeriesApi, SeriesCountDto } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link EventSeriesApi} over HTTP: `GET /api/events/series/count` (ADR 0093). A 5xx opens the
 * server-error screen through the interceptor; every failure passes on to the screen. It holds no
 * state, and is provided on the Events screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpEventSeriesService implements EventSeriesApi {
  private readonly http = inject(HttpClient);

  count(): Observable<SeriesCountDto> {
    return this.http.get<SeriesCountDto>('/api/events/series/count');
  }
}
