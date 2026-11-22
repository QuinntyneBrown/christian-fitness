import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AccountApi, JoinRequestDto, SessionDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AccountApi} over HTTP: `POST /api/account/join`. A failed request errors with an
 * `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpAccountService implements AccountApi {
  private readonly http = inject(HttpClient);

  join(request: JoinRequestDto): Observable<SessionDto> {
    return this.http
      .post<SessionDto>('/api/account/join', request)
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
          ),
        ),
      );
  }
}
