import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { catchError, map, of } from 'rxjs';

/**
 * Lets a staff route of the admin app open only with a staff session (L2-018 AC4; ADR 0011): it
 * asks `STAFF_SESSION_SERVICE` for the current session. A session opens the route; a 401 sends the
 * visitor to `/sign-in`; anything else keeps them where they are, since a 5xx already opens the
 * server-error screen.
 */
export const staffAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(STAFF_SESSION_SERVICE)
    .current()
    .pipe(
      map(() => true),
      catchError((error: unknown) =>
        of(
          error instanceof HttpErrorResponse && error.status === 401
            ? router.parseUrl('/sign-in')
            : false,
        ),
      ),
    );
};
