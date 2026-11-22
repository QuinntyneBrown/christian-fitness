import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { SessionApi, SessionDto } from '@cf/api';
import type { Observable } from 'rxjs';

/** {@link SessionApi} over HTTP: `GET /api/session`. It holds no state. */
@Injectable()
export class HttpSessionService implements SessionApi {
  private readonly http = inject(HttpClient);

  current(): Observable<SessionDto> {
    return this.http.get<SessionDto>('/api/session');
  }
}
