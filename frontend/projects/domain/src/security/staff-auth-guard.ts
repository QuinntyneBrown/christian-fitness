import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { RedirectCommand, Router, type CanActivateFn } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { catchError, map, of } from 'rxjs';
import { canManage, currentAdminArea } from '../admin/admin-areas';
import { isSessionExpired } from '../admin/session-expiry';
import { ADMINS_ONLY_PATH } from '../errors/forbidden-interceptor';

/**
 * Lets a staff route of the admin app open only with a staff session (L2-018 AC4; ADR 0011): it
 * asks `STAFF_SESSION_SERVICE` for the current session. A session opens the route; a 401 sends the
 * visitor to `/sign-in`, except a session that expired, which `sessionExpiredInterceptor` sends
 * there saying why (L2-018 AC5; ADR 0016); anything else keeps them where they are, since a 5xx
 * already opens the server-error screen and a 403 the forbidden screen. The admin routes use it as
 * `canActivateChild`, so every move between areas asks again. A session whose role does not open
 * the area being opened (`canManage`) shows "Admins only" in its place, the address kept, so a
 * reload asks again (L2-019 AC5; ADR 0017); the API refuses that area's requests either way.
 */
export const staffAuthGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(STAFF_SESSION_SERVICE)
    .current()
    .pipe(
      map((staff) => {
        const area = currentAdminArea(state.url);
        return area === null || canManage(staff.role, area)
          ? true
          : new RedirectCommand(router.parseUrl(ADMINS_ONLY_PATH), { browserUrl: state.url });
      }),
      catchError((error: unknown) =>
        of(
          error instanceof HttpErrorResponse && error.status === 401 && !isSessionExpired(error)
            ? router.parseUrl('/sign-in')
            : false,
        ),
      ),
    );
};
