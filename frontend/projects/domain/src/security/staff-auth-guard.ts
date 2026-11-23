import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { catchError, map, of } from 'rxjs';
import { isSessionExpired } from '../admin/session-expiry';

/**
 * Lets a staff route of the admin app open only with a staff session (L2-018 AC4; ADR 0011): it
 * asks `STAFF_SESSION_SERVICE` for the current session. A session opens the route; a 401 sends the
 * visitor to `/sign-in`, except a session that expired, which `sessionExpiredInterceptor` sends
 * there saying why (L2-018 AC5; ADR 0016); anything else keeps them where they are, since a 5xx
 * already opens the server-error screen and a 403 the forbidden screen. The admin routes use it as
 * `canActivateChild`, so every move between areas asks again.
 */
export const staffAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(STAFF_SESSION_SERVICE)
    .current()
    .pipe(
      map(() => true),
      catchError((error: unknown) =>
        of(
          error instanceof HttpErrorResponse && error.status === 401 && !isSessionExpired(error)
            ? router.parseUrl('/sign-in')
            : false,
        ),
      ),
    );
};
