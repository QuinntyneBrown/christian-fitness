import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { SessionApi, SessionDto, SignInRequestDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, map, of, throwError, type Observable } from 'rxjs';

/**
 * {@link SessionApi} over HTTP: `GET`, `POST` and `DELETE /api/session`. A failed write errors with
 * an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpSessionService implements SessionApi {
  private readonly http = inject(HttpClient);

  current(): Observable<SessionDto> {
    return this.http.get<SessionDto>('/api/session');
  }

  signIn(request: SignInRequestDto): Observable<SessionDto> {
    return this.http.post<SessionDto>('/api/session', request).pipe(catchError(asApiError));
  }

  signOut(): Observable<void> {
    return this.http.delete<unknown>('/api/session').pipe(
      map(() => undefined),
      // A session that had already ended: the member is signed out either way (ADR 0009).
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 401
          ? of(undefined)
          : asApiError(error),
      ),
    );
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
