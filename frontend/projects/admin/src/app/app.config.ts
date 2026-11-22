import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

/**
 * The composition root of the admin app: it binds every injection token (AGENTS.md). Zoneless
 * change detection is Angular's default, so no zone provider appears here.
 */
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes)],
};
