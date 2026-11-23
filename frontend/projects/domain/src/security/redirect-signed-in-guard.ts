import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import { catchError, map, of } from 'rxjs';

/**
 * Sends a signed-in member who opens a public route (the landing page) to Home (L2-001 AC4). Any
 * failure to read the session, a 401 or not, leaves the visitor on the page: it is public, and a
 * 5xx already opens the server-error screen.
 */
export const redirectSignedInGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(SESSION_SERVICE)
    .current()
    .pipe(
      map(() => router.createUrlTree(['/home'])),
      catchError(() => of(true)),
    );
};
