import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { isApiUrl, pathOf } from '../errors/server-error';

/** The admin app's Staff sign in route. */
const SIGN_IN_PATH = '/sign-in';

/**
 * How Staff sign in learns that the session ended (mock state `session-expired`): after 30 idle
 * minutes (`idle`, L2-018 AC6) or 12 hours after sign-in (`max-age`, AC9; ADR 0100). It travels as
 * the router navigation state `{ session: <ending> }`.
 */
export type SessionEnding = 'idle' | 'max-age';

/**
 * True for an API refusal saying the staff session ran out: 401 with code `session_expired`
 * (L2-018 AC5; ADR 0016). Any other 401 means there was no session to run out.
 */
export function isSessionExpired(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) return false;
  const body: unknown = error.error;
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { code?: unknown }).code === 'session_expired'
  );
}

/**
 * The ending a router navigation state carries, or null: only `{ session: 'idle' }` and
 * `{ session: 'max-age' }` count, so no other value reaches the screen.
 */
export function sessionEndingOf(state: unknown): SessionEnding | null {
  const value =
    typeof state === 'object' && state !== null ? (state as { session?: unknown }).session : null;
  return value === 'idle' || value === 'max-age' ? value : null;
}

/** The ending a `session_expired` refusal names: its `reason` `max_age`, or idle otherwise (ADR 0100). */
function endingOf(error: HttpErrorResponse): SessionEnding {
  const reason = (error.error as { reason?: unknown }).reason;
  return reason === 'max_age' ? 'max-age' : 'idle';
}

/**
 * Returns staff to Staff sign in when a request to `/api/admin/` finds the session expired
 * (L2-018 AC6, AC9; ADR 0016, ADR 0100), whichever screen or guard sent it and whatever its method,
 * with the {@link SessionEnding} as navigation state so the screen says why. Not while Staff sign in already shows. The
 * error always passes on, so no caller waits forever. Registered in the admin `app.config.ts`.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        isSessionExpired(error) &&
        isAdminApi(request.url) &&
        pathOf(router.url) !== SIGN_IN_PATH
      ) {
        const ending = endingOf(error as HttpErrorResponse);
        void router.navigateByUrl(SIGN_IN_PATH, { state: { session: ending } });
      }
      return throwError(() => error);
    }),
  );
};

function isAdminApi(url: string): boolean {
  return isApiUrl(url, '/api/admin/');
}
