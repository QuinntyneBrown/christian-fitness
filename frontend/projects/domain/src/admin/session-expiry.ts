import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { isApiUrl, pathOf } from '../errors/server-error';

/** The admin app's Staff sign in route. */
const SIGN_IN_PATH = '/sign-in';

/** How Staff sign in learns that the session ended while idle (mock state `session-expired`). */
export type SessionEnding = 'expired';

/** The router navigation state that carries it (`{ session: 'expired' }`). */
export const SESSION_EXPIRED_STATE = { session: 'expired' } as const;

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
 * The ending a router navigation state carries, or null: only `{ session: 'expired' }` counts, so
 * no other value reaches the screen.
 */
export function sessionEndingOf(state: unknown): SessionEnding | null {
  const value =
    typeof state === 'object' && state !== null ? (state as { session?: unknown }).session : null;
  return value === 'expired' ? value : null;
}

/**
 * Returns staff to Staff sign in when a request to `/api/admin/` finds the session expired
 * (L2-018 AC5; ADR 0016), whichever screen or guard sent it and whatever its method, with
 * {@link SESSION_EXPIRED_STATE} so the screen says why. Not while Staff sign in already shows. The
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
        void router.navigateByUrl(SIGN_IN_PATH, { state: SESSION_EXPIRED_STATE });
      }
      return throwError(() => error);
    }),
  );
};

function isAdminApi(url: string): boolean {
  return isApiUrl(url, '/api/admin/');
}
