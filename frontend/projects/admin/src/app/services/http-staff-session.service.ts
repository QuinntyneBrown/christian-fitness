import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  GoogleRedirectDto,
  StaffGoogleStartDto,
  StaffSessionApi,
  StaffSessionDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, map, of, throwError, type Observable } from 'rxjs';

/**
 * {@link StaffSessionApi} over HTTP: `GET` and `DELETE /api/admin/session`,
 * `POST /api/admin/session/google/start` and `POST /api/admin/session/google` (ADR 0011, ADR
 * 0100). A failed write errors with an `ApiError` (`apiErrorOf`), so no screen handles an
 * `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpStaffSessionService implements StaffSessionApi {
  private readonly http = inject(HttpClient);

  current(): Observable<StaffSessionDto> {
    return this.http.get<StaffSessionDto>('/api/admin/session');
  }

  startGoogle(request: StaffGoogleStartDto): Observable<GoogleRedirectDto> {
    return this.http
      .post<GoogleRedirectDto>('/api/admin/session/google/start', request)
      .pipe(catchError(asApiError));
  }

  completeGoogle(): Observable<StaffSessionDto> {
    return this.http
      .post<StaffSessionDto>('/api/admin/session/google', {})
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
