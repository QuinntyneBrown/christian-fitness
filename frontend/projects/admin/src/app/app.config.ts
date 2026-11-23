import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import {
  ANTIFORGERY_COOKIE,
  ANTIFORGERY_HEADER,
  antiforgeryInterceptor,
  serverErrorInterceptor,
} from '@cf/domain';
import { routes } from './app.routes';
import { HttpStaffSessionService } from './services/http-staff-session.service';

/**
 * The composition root of the admin app: it binds every injection token (AGENTS.md). Zoneless
 * change detection is Angular's default, so no zone provider appears here. The HTTP client is the
 * member app's (ADR 0007, 0010): a 5xx to a GET opens the server-error screen (L2-043 AC4, ADR
 * 0006), and every state-changing request carries the antiforgery token (L2-030 AC3, ADR 0009).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: ANTIFORGERY_COOKIE, headerName: ANTIFORGERY_HEADER }),
      withInterceptors([serverErrorInterceptor, antiforgeryInterceptor]),
    ),
    { provide: STAFF_SESSION_SERVICE, useClass: HttpStaffSessionService },
  ],
};
