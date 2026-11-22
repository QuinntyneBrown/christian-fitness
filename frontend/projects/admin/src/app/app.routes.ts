import type { Routes } from '@angular/router';

/**
 * Every route is lazy (AGENTS.md, "Lazy loading and memory"; L2-035 AC2) and has a title, so the
 * router sets the document title on every navigation (L2-038 AC6). The wildcard comes last.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Christian Fitness Admin',
    loadComponent: () => import('./pages/start/start-page').then((m) => m.StartPage),
  },
  {
    path: 'server-error',
    title: 'Something went wrong · Christian Fitness Admin',
    loadComponent: () =>
      import('./pages/server-error/server-error-page').then((m) => m.ServerErrorPage),
  },
  {
    path: '**',
    title: 'Page not found · Christian Fitness Admin',
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
