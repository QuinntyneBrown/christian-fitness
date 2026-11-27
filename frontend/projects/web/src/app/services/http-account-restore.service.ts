import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AccountRestoreApi, SessionDto, SignInRequestDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AccountRestoreApi} over HTTP: `POST /api/account/restore` and its `/google` (L2-066 AC6).
 * A failure errors with an `ApiError`. It holds no state, and Sign in provides it, so it stays out
 * of the initial bundle.
 */
@Injectable()
export class HttpAccountRestoreService implements AccountRestoreApi {
  private readonly http = inject(HttpClient);

  password(request: SignInRequestDto): Observable<SessionDto> {
    return this.http.post<SessionDto>('/api/account/restore', request).pipe(catchError(asApiError));
  }

  google(): Observable<SessionDto> {
    return this.http
      .post<SessionDto>('/api/account/restore/google', {})
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
