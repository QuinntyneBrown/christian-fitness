import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import {
  ANTIFORGERY_COOKIE,
  ANTIFORGERY_HEADER,
  antiforgeryInterceptor,
  offlineInterceptor,
  offlineNavigationErrorHandler,
  serverErrorInterceptor,
} from '@cf/domain';
import { routes } from './app.routes';
import { HttpSessionService } from './services/http-session.service';

/**
 * The composition root of the member app: it binds every injection token (AGENTS.md). Zoneless
 * change detection is Angular's default, so no zone provider appears here. The HTTP client is
 * provided here because almost every screen loads data on arrival (ADR 0007); an offline GET or
 * lazy route opens the offline screen (L2-043 AC9, ADR 0046) and a 5xx to a GET opens the
 * server-error screen (L2-043 AC4, ADR 0006). Every state-changing request carries the antiforgery
 * token: Angular copies it from its cookie, and `antiforgeryInterceptor` fetches one first when
 * there is none (L2-030 AC3, ADR 0009).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withNavigationErrorHandler(offlineNavigationErrorHandler)),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: ANTIFORGERY_COOKIE, headerName: ANTIFORGERY_HEADER }),
      withInterceptors([offlineInterceptor, serverErrorInterceptor, antiforgeryInterceptor]),
    ),
    { provide: SESSION_SERVICE, useClass: HttpSessionService },
  ],
};
