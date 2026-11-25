import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { EventDetailDto, EventPageDto, EventSelection, EventsApi } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link EventsApi} over HTTP: `GET /api/events?cursor=&category=&q=&going=true` (ADR 0027,
 * ADR 0081); the member is the session's, never named in the request. A 5xx opens the server-error
 * screen through the interceptor; every failure passes on to the screen. It holds no state, and is
 * provided on the Events screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpEventsService implements EventsApi {
  private readonly http = inject(HttpClient);

  page(cursor: string | null, selection?: EventSelection): Observable<EventPageDto> {
    let params = cursor === null ? new HttpParams() : new HttpParams().set('cursor', cursor);
    if (selection?.category) params = params.set('category', selection.category);
    if (selection?.q) params = params.set('q', selection.q);
    if (selection?.going) params = params.set('going', 'true');
    return this.http.get<EventPageDto>('/api/events', { params });
  }

  get(id: string): Observable<EventDetailDto> {
    return this.http.get<EventDetailDto>(`/api/events/${encodeURIComponent(id)}`);
  }

  register(id: string): Observable<EventDetailDto> {
    return this.http.post<EventDetailDto>(
      `/api/events/${encodeURIComponent(id)}/registrations`,
      null,
    );
  }

  cancelRegistration(id: string): Observable<EventDetailDto> {
    return this.http.delete<EventDetailDto>(
      `/api/events/${encodeURIComponent(id)}/registrations/me`,
    );
  }
}
