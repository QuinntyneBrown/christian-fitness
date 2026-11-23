import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { PublicEventsApi, LandingEventDto } from '@cf/api';
import type { Observable } from 'rxjs';

/** {@link PublicEventsApi} over HTTP: `GET /api/public/events/upcoming?take=`. Holds no state. */
@Injectable()
export class HttpPublicEventsService implements PublicEventsApi {
  private readonly http = inject(HttpClient);

  upcoming(take: number): Observable<LandingEventDto[]> {
    return this.http.get<LandingEventDto[]>('/api/public/events/upcoming', {
      params: new HttpParams().set('take', take),
    });
  }
}
