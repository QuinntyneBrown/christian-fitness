import type { Routes } from '@angular/router';

const forbidden = () => import('./pages/forbidden/forbidden-page');

/**
 * Every route is lazy (AGENTS.md, "Lazy loading and memory"; L2-035 AC2) and has a title, so the
 * router sets the document title on every navigation (L2-038 AC6). The staff areas load with the
 * shell (`shell/staff.routes.ts`), after the screens outside it, so opening one of those (the
 * offline screen above all) never waits on the staff routes. The wildcard comes last.
 */
const titled = (page: string) => `${page} · Christian Fitness Admin`;

export const routes: Routes = [
  {
    path: 'sign-in',
    title: titled('Staff sign in'),
    loadComponent: () => import('./pages/sign-in/sign-in-page'),
  },
  {
    // The second step, after the password (L2-046; ADR 0013). The API decides whether a pending
    // sign-in exists; without one the code is refused and staff go back to sign in.
    path: 'sign-in/verify',
    title: titled('Enter your code'),
    loadComponent: () => import('./pages/two-step/two-step-page'),
  },
  {
    // Opened by forbiddenInterceptor on a 403 to a read, the URL asked for kept (L2-047; ADR 0016).
    path: 'forbidden',
    title: titled('Staff only'),
    loadComponent: forbidden,
  },
  {
    // The same screen for a role the area refuses: staffAuthGuard and forbiddenInterceptor open it
    // with the URL asked for kept (L2-019 AC5; ADR 0020). The words come from the route data.
    path: 'admins-only',
    title: titled('Admins only'),
    data: { reason: 'role' },
    loadComponent: forbidden,
  },
  {
    path: 'offline',
    title: titled("You're offline"),
    loadComponent: () => import('./pages/offline/offline-page'),
  },
  {
    path: 'server-error',
    title: titled('Something went wrong'),
    loadComponent: () => import('./pages/server-error/server-error-page'),
  },
  {
    // The shell and every staff area behind staffAuthGuard (ADR 0011, ADR 0016).
    path: '',
    loadChildren: () => import('./shell/staff.routes'),
  },
  {
    path: '**',
    title: titled('Page not found'),
    loadComponent: () => import('./pages/not-found/not-found-page'),
  },
];
