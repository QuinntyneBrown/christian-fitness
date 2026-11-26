import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import { catchError, map, of } from 'rxjs';

/**
 * Opens an event link `/e/<id>`, as a Community Pick caption gives it (L2-072 AC9; ADR 0098): with
 * a session it goes on to the event, `/events/<id>`; a visitor (401) goes to Join, not Sign in (the
 * one exception to L2-004 AC6), with the event as `returnUrl`, so joining or signing in brings
 * them back to it. Any other failure keeps them where they are, since a 5xx already opens the
 * server-error screen. An event that is not published is the event page's not-found view.
 */
export const eventLinkGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const event = `/events/${encodeURIComponent(route.paramMap.get('id') ?? '')}`;
  return inject(SESSION_SERVICE)
    .current()
    .pipe(
      map(() => router.parseUrl(event)),
      catchError((error: unknown) =>
        of(
          error instanceof HttpErrorResponse && error.status === 401
            ? router.createUrlTree(['/join'], { queryParams: { returnUrl: event } })
            : false,
        ),
      ),
    );
};
