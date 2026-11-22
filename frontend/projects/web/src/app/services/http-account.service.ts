import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AccountApi, JoinRequestDto, SessionDto } from '@cf/api';
import type { Observable } from 'rxjs';

/** {@link AccountApi} over HTTP: `POST /api/account/join`. It holds no state. */
@Injectable()
export class HttpAccountService implements AccountApi {
  private readonly http = inject(HttpClient);

  join(request: JoinRequestDto): Observable<SessionDto> {
    return this.http.post<SessionDto>('/api/account/join', request);
  }
}
