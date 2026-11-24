import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { type NavigationError, RedirectCommand, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { failedRouteOf, isApiUrl, OFFLINE_PATH } from './server-error';

/**
 * Opens the offline screen when a GET to `/api/` fails without an answer (`status === 0`) while
 * the browser is offline (`navigator.onLine === false`; L2-043 AC9, ADR 0046). Uses
 * `skipLocationChange` (without writing `ɵrouterUrl` to `history.state`) and passes `from` so the
 * offline screen keeps the destination URL in the address bar and "Try again" reloads it online.
 */
export const offlineInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const win = inject(DOCUMENT).defaultView;
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        request.method === 'GET' &&
        error.status === 0 &&
        win?.navigator.onLine === false &&
        isApiUrl(request.url) &&
        !isOfflineScreen(router.url)
      ) {
        const from = failedRouteOf(router);
        void router.navigate([OFFLINE_PATH], { skipLocationChange: true, queryParams: { from } });
      }
      return throwError(() => error);
    }),
  );
};

/**
 * Redirects to the offline screen when a lazy route chunk cannot be fetched while the browser is
 * offline (`navigator.onLine === false`; L2-043 AC9, ADR 0046), without forwarding an unhandled
 * error or polluting `history.state`.
 */
export function offlineNavigationErrorHandler(error: NavigationError): RedirectCommand | void {
  const router = inject(Router);
  const win = inject(DOCUMENT).defaultView;
  if (
    win?.navigator.onLine === false &&
    !isOfflineScreen(router.url) &&
    !isOfflineScreen(error.url)
  ) {
    return new RedirectCommand(
      router.createUrlTree([OFFLINE_PATH], { queryParams: { from: error.url } }),
      { skipLocationChange: true },
    );
  }
}

function isOfflineScreen(url: string): boolean {
  return url.split(/[?#]/, 1)[0] === OFFLINE_PATH;
}
