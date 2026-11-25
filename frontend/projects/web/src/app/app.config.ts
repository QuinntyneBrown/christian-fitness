import {type ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter,withInMemoryScrolling,withNavigationErrorHandler} from '@angular/router';
import {offlineNavigationErrorHandler} from '@cf/domain';
import {routes} from './app.routes';

/** HTTP and session providers load with the routes that make data requests. */
export const appConfig:ApplicationConfig={providers:[
 provideBrowserGlobalErrorListeners(),
 provideRouter(routes,withInMemoryScrolling({anchorScrolling:'enabled'}),withNavigationErrorHandler(offlineNavigationErrorHandler))
]};
