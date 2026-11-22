import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import { catchError, map, of } from 'rxjs';

/**
 * Lets a member route open only with a session (ADR 0007, 0009, 0010): it asks `SESSION_SERVICE`
 * for the current session. A session opens the route; a 401 sends the visitor to `/sign-in` with
 * the URL they asked for as `returnUrl`, so the sign-in screen brings them back (L2-004 AC6); any
 * other failure keeps them where they are, since a 5xx already opens the server-error screen.
 */
export const memberAuthGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(SESSION_SERVICE)
    .current()
    .pipe(
      map(() => true),
      catchError((error: unknown) =>
        of(
          error instanceof HttpErrorResponse && error.status === 401
            ? router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } })
            : false,
        ),
      ),
    );
};
