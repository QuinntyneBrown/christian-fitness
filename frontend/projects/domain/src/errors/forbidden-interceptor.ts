import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** The route of the admin app's "Staff only" screen (L2-047). */
export const FORBIDDEN_PATH = '/forbidden';

/** The route of the same screen's "Admins only" state, for a role the area refuses (L2-019 AC5). */
export const ADMINS_ONLY_PATH = '/admins-only';

/**
 * Shows the "Staff only" screen when the API refuses a read: a GET to `/api/` answering 403
 * (L2-047 AC1; ADR 0016), or "Admins only" when the code is `forbidden_role`, a role the area
 * refuses (L2-019 AC5; ADR 0020). The address bar shows the URL staff asked for (`browserUrl`):
 * where a navigation still in flight is going, as when the guard's request is refused, or else the
 * current URL, so a reload asks again. A write's 403 passes on to the screen that sent it (AC3), so
 * Staff sign in still shows `not_staff` itself. Not while either screen already shows. The error
 * always passes on, so no caller waits forever. Registered in the admin `app.config.ts`.
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
        !SCREENS.includes(router.url.split(/[?#]/, 1)[0])
      ) {
        const screen = codeOf(error) === 'forbidden_role' ? ADMINS_ONLY_PATH : FORBIDDEN_PATH;
        void router.navigateByUrl(screen, { browserUrl: urlOf(router) });
      }
      return throwError(() => error);
    }),
  );
};

const SCREENS: readonly string[] = [FORBIDDEN_PATH, ADMINS_ONLY_PATH];

/** The ProblemDetails `code` of a refusal, or null. */
function codeOf(error: HttpErrorResponse): unknown {
  const body: unknown = error.error;
  return typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : null;
}

/** The URL refused: where the navigation in flight is going, or else where the router is. */
function urlOf(router: Router): string {
  const navigation = router.currentNavigation();
  return navigation
    ? router.serializeUrl(navigation.finalUrl ?? navigation.extractedUrl)
    : router.url;
}
