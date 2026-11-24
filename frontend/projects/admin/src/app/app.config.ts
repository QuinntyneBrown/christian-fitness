import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import {
  ANTIFORGERY_COOKIE,
  ANTIFORGERY_HEADER,
  antiforgeryInterceptor,
  forbiddenInterceptor,
  offlineInterceptor,
  offlineNavigationErrorHandler,
  serverErrorInterceptor,
  sessionExpiredInterceptor,
} from '@cf/domain';
import { routes } from './app.routes';
import { HttpStaffSessionService } from './services/http-staff-session.service';

/**
 * The composition root of the admin app: it binds every injection token (AGENTS.md). Zoneless
 * change detection is Angular's default, so no zone provider appears here. The HTTP client is the
 * member app's (ADR 0007, 0010): an offline GET or lazy route opens the offline screen (L2-043
 * AC9, ADR 0046), a 5xx to a GET opens the server-error screen (L2-043 AC4, ADR 0006), every
 * state-changing request carries the antiforgery token (L2-030 AC3, ADR 0009), an expired staff
 * session returns staff to sign in (L2-018 AC5, ADR 0016) and a 403 to a GET opens the "Staff
 * only" screen (L2-047, ADR 0016).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withNavigationErrorHandler(offlineNavigationErrorHandler)),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: ANTIFORGERY_COOKIE, headerName: ANTIFORGERY_HEADER }),
      withInterceptors([
        offlineInterceptor,
        serverErrorInterceptor,
        sessionExpiredInterceptor,
        forbiddenInterceptor,
        antiforgeryInterceptor,
      ]),
    ),
    { provide: STAFF_SESSION_SERVICE, useClass: HttpStaffSessionService },
  ],
};
