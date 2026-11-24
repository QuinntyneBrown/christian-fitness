import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { failedRouteOf, isApiUrl, pathOf, referenceOf, SERVER_ERROR_PATH } from './server-error';

/**
 * Shows the server-error screen for an unrecoverable server error: a GET to the API (`/api/`)
 * answering 500 or more (L2-043 AC4). The address bar keeps the URL that failed
 * (`skipLocationChange`); the screen gets the response's reference and that URL.
 */
export const serverErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        request.method === 'GET' &&
        error.status >= 500 &&
        isApiUrl(request.url) &&
        pathOf(router.url) !== SERVER_ERROR_PATH
      ) {
        const reference = referenceOf((error.error as { reference?: unknown } | null)?.reference);
        const from = failedRouteOf(router);
        void router.navigate([SERVER_ERROR_PATH], {
          skipLocationChange: true,
          queryParams: reference ? { reference, from } : { from },
        });
      }
      return throwError(() => error);
    }),
  );
};
