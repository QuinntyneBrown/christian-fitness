import { provideHttpClient } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ACCOUNT_SERVICE, SESSION_SERVICE } from '@cf/api';
import { routes } from './app.routes';
import { HttpAccountService } from './services/http-account.service';
import { HttpSessionService } from './services/http-session.service';

/**
 * The composition root of the member app: it binds every injection token (AGENTS.md). Zoneless
 * change detection is Angular's default, so no zone provider appears here. The HTTP client is
 * provided here because almost every screen loads data on arrival (ADR 0007).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: ACCOUNT_SERVICE, useClass: HttpAccountService },
    { provide: SESSION_SERVICE, useClass: HttpSessionService },
  ],
};
