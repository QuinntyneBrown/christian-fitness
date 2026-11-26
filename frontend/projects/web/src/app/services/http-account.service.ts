import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  GoogleAccountDto,
  GoogleJoinRequestDto,
  AccountApi,
  JoinRequestDto,
  NewPasswordDto,
  PasswordResetCheckDto,
  PasswordResetRequestDto,
  PasswordResetTokenDto,
  SessionDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, map, throwError, type Observable } from 'rxjs';

/**
 * {@link AccountApi} over HTTP: `POST /api/account/join`, `POST /api/account/password-reset` and its
 * `/check` and `/complete`, each token in the body, never the URL. A failed request errors with an
 * `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpAccountService implements AccountApi {
  private readonly http = inject(HttpClient);

  join(request: JoinRequestDto): Observable<SessionDto> {
    return this.http.post<SessionDto>('/api/account/join', request).pipe(catchError(asApiError));
  }

  requestPasswordReset(request: PasswordResetRequestDto): Observable<void> {
    return this.http.post<unknown>('/api/account/password-reset', request).pipe(
      map(() => undefined),
      catchError(asApiError),
    );
  }

  checkPasswordReset(request: PasswordResetTokenDto): Observable<PasswordResetCheckDto> {
    return this.http
      .post<PasswordResetCheckDto>('/api/account/password-reset/check', request)
      .pipe(catchError(asApiError));
  }

  pendingGoogle(): Observable<GoogleAccountDto> {
    return this.http.get<GoogleAccountDto>('/api/account/google').pipe(catchError(asApiError));
  }

  forgetGoogle(): Observable<void> {
    return this.http.delete<unknown>('/api/account/google').pipe(
      map(() => undefined),
      catchError(asApiError),
    );
  }

  joinWithGoogle(request: GoogleJoinRequestDto): Observable<SessionDto> {
    return this.http
      .post<SessionDto>('/api/account/join/google', request)
      .pipe(catchError(asApiError));
  }

  completePasswordReset(request: NewPasswordDto): Observable<void> {
    return this.http.post<unknown>('/api/account/password-reset/complete', request).pipe(
      map(() => undefined),
      catchError(asApiError),
    );
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
