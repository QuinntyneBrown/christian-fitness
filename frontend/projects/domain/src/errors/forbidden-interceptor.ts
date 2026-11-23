import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** The route of the admin app's "Staff only" screen (L2-047). */
export const FORBIDDEN_PATH = '/forbidden';

/**
 * Shows the "Staff only" screen when the API refuses a read: a GET to `/api/` answering 403
 * (L2-047 AC1; ADR 0016). The address bar shows the URL staff asked for (`browserUrl`): where a
 * navigation still in flight is going, as when the guard's request is refused, or else the current
 * URL, so a reload asks again. A write's 403 passes on to the screen that sent it (AC3), so Staff
 * sign in still shows `not_staff` itself. Not while the screen already shows. The error always passes on, so no
 * caller waits forever. Registered in the admin `app.config.ts`.
 */
export const forbiddenInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        request.method === 'GET' &&
        new URL(request.url, 'http://app.invalid').pathname.startsWith('/api/') &&
        router.url.split(/[?#]/, 1)[0] !== FORBIDDEN_PATH
      ) {
        void router.navigateByUrl(FORBIDDEN_PATH, { browserUrl: urlOf(router) });
      }
      return throwError(() => error);
    }),
  );
};

/** The URL refused: where the navigation in flight is going, or else where the router is. */
function urlOf(router: Router): string {
  const navigation = router.currentNavigation();
  return navigation
    ? router.serializeUrl(navigation.finalUrl ?? navigation.extractedUrl)
    : router.url;
}
