import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { OwnProfileDto, ProfileApi } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link ProfileApi} over HTTP: `GET /api/profile/me` (ADR 0013). A 5xx opens the server-error
 * screen through the interceptor; every failure passes on to the screen. It holds no state, and is
 * provided on the Profile screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpProfileService implements ProfileApi {
  private readonly http = inject(HttpClient);

  own(): Observable<OwnProfileDto> {
    return this.http.get<OwnProfileDto>('/api/profile/me');
  }
}
