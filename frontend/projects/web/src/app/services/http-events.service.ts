import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { EventCategory, EventDetailDto, EventPageDto, EventsApi } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link EventsApi} over HTTP: `GET /api/events?cursor=` (ADR 0027). A 5xx opens the server-error
 * screen through the interceptor; every failure passes on to the screen. It holds no state, and is
 * provided on the Events screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpEventsService implements EventsApi {
  private readonly http = inject(HttpClient);

  page(cursor: string | null, category: EventCategory | null = null): Observable<EventPageDto> {
    let params = cursor === null ? new HttpParams() : new HttpParams().set('cursor', cursor);
    if (category !== null) params = params.set('category', category);
    return this.http.get<EventPageDto>('/api/events', { params });
  }

  get(id: string): Observable<EventDetailDto> {
    return this.http.get<EventDetailDto>(`/api/events/${encodeURIComponent(id)}`);
  }
}
