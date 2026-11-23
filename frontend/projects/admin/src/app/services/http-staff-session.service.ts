import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { SignInRequestDto, StaffSessionApi, StaffSessionDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, map, of, throwError, type Observable } from 'rxjs';

/**
 * {@link StaffSessionApi} over HTTP: `GET`, `POST` and `DELETE /api/admin/session` (ADR 0011). A
 * failed write errors with an `ApiError` (`apiErrorOf`), so no screen handles an
 * `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpStaffSessionService implements StaffSessionApi {
  private readonly http = inject(HttpClient);

  current(): Observable<StaffSessionDto> {
    return this.http.get<StaffSessionDto>('/api/admin/session');
  }

  signIn(request: SignInRequestDto): Observable<StaffSessionDto> {
    return this.http
      .post<StaffSessionDto>('/api/admin/session', request)
      .pipe(catchError(asApiError));
  }

  signOut(): Observable<void> {
    return this.http.delete<unknown>('/api/admin/session').pipe(
      map(() => undefined),
      // A session that had already ended: staff are signed out either way (ADR 0011).
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
