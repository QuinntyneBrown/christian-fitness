import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { referenceOf, SERVER_ERROR_PATH } from './server-error';

/**
 * Shows the server-error screen for an unrecoverable server error: a GET to the API (`/api/`)
 * answering 500 or more (L2-043 AC4). The address bar keeps the URL that failed
 * (`skipLocationChange`); the screen gets the response's reference and that URL: where a navigation
 * still in flight is going, as when a guard's request fails, or else the current URL. A write, a 4xx,
 * no answer or a request outside the API passes on to the caller, which shows its own failed
 * state (L2-043 AC5). The error always passes on, so no caller waits forever.
 *
 * Registered with `provideHttpClient(withInterceptors([serverErrorInterceptor]))` in the member
 * app's `app.config.ts` (slice 2.1, ADR 0007); the admin app registers it with its client in
 * slice 9.1.
 */
export const serverErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        request.method === 'GET' &&
        error.status >= 500 &&
        isApi(request.url) &&
        !isShowing(router.url)
      ) {
        const reference = referenceOf((error.error as { reference?: unknown } | null)?.reference);
        const from = urlOf(router);
        void router.navigate([SERVER_ERROR_PATH], {
          skipLocationChange: true,
          queryParams: reference ? { reference, from } : { from },
        });
      }
      return throwError(() => error);
    }),
  );
};

/** The URL that failed: where the navigation in flight is going, or else where the router is. */
function urlOf(router: Router): string {
  const navigation = router.currentNavigation();
  return navigation
    ? router.serializeUrl(navigation.finalUrl ?? navigation.extractedUrl)
    : router.url;
}

function isApi(url: string): boolean {
  return new URL(url, 'http://app.invalid').pathname.startsWith('/api/');
}

/** True while the server-error screen shows: it is not opened again over itself. */
function isShowing(routerUrl: string): boolean {
  return routerUrl.split(/[?#]/, 1)[0] === SERVER_ERROR_PATH;
}
