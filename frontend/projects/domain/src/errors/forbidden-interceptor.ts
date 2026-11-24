import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { failedRouteOf, isApiUrl } from './server-error';

/** The route of the admin app's "Staff only" screen (L2-047). */
export const FORBIDDEN_PATH = '/forbidden';

/** The route of the same screen's "Admins only" state, for a role the area refuses (L2-019 AC5). */
export const ADMINS_ONLY_PATH = '/admins-only';

const SCREENS: readonly string[] = [FORBIDDEN_PATH, ADMINS_ONLY_PATH];

/**
 * Shows the "Staff only" screen when the API refuses a read: a GET to `/api/` answering 403
 * (L2-047 AC1; ADR 0016), or "Admins only" when the code is `forbidden_role` (L2-019 AC5; ADR 0020).
 */
export const forbiddenInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        request.method === 'GET' &&
        isApiUrl(request.url) &&
        !SCREENS.includes(router.url.split(/[?#]/, 1)[0])
      ) {
        const body: unknown = error.error;
        const code =
          typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : null;
        const screen = code === 'forbidden_role' ? ADMINS_ONLY_PATH : FORBIDDEN_PATH;
        void router.navigateByUrl(screen, { browserUrl: failedRouteOf(router) });
      }
      return throwError(() => error);
    }),
  );
};
