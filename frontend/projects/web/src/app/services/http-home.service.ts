import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { HomeApi, HomeDto } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link HomeApi} over HTTP: `GET /api/home` (ADR 0044). A 5xx opens the server-error screen
 * through the interceptor; every failure passes on to the screen. It holds no state, and is
 * provided on the Home screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpHomeService implements HomeApi {
  private readonly http = inject(HttpClient);

  home(): Observable<HomeDto> {
    return this.http.get<HomeDto>('/api/home');
  }
}
