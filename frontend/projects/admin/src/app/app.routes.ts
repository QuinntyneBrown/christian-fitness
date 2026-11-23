import type { Routes } from '@angular/router';
import { staffAuthGuard } from '@cf/domain';

/** An area's routed stand-in until its slice: the area's heading, nothing else (ADR 0011). */
const area = () => import('./pages/area/area-page').then((m) => m.AreaPage);

/**
 * Every route is lazy (AGENTS.md, "Lazy loading and memory"; L2-035 AC2) and has a title, so the
 * router sets the document title on every navigation (L2-038 AC6). The wildcard comes last.
 */
export const routes: Routes = [
  {
    path: 'sign-in',
    title: 'Staff sign in · Christian Fitness Admin',
    loadComponent: () => import('./pages/sign-in/sign-in-page').then((m) => m.SignInPage),
  },
  {
    // The second step, after the password (L2-046; ADR 0013). The API decides whether a pending
    // sign-in exists; without one the code is refused and staff go back to sign in.
    path: 'sign-in/verify',
    title: 'Enter your code · Christian Fitness Admin',
    loadComponent: () => import('./pages/two-step/two-step-page').then((m) => m.TwoStepPage),
  },
  {
    // Every staff route is a child of the shell, which opens only with a staff session (ADR 0011).
    // The guard runs for every child, so each move between areas checks the session (ADR 0016).
    path: '',
    canActivateChild: [staffAuthGuard],
    loadComponent: () => import('./shell/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        // Stand-ins until slices 28.1 and 21.1 (ADR 0011).
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · Christian Fitness Admin',
        data: { heading: 'Dashboard' },
        loadComponent: area,
      },
      {
        // Every event under All, Published and Draft, and the event editor (slice 10.1; ADR 0021).
        path: 'events',
        title: 'Events · Christian Fitness Admin',
        loadComponent: () => import('./pages/events/events-page').then((m) => m.AdminEventsPage),
      },
      {
        path: 'services',
        title: 'Services · Christian Fitness Admin',
        data: { heading: 'Services' },
        loadComponent: area,
      },
      {
        // The members, searched, filtered by status and paged (slice 26.1; ADR 0022).
        path: 'members',
        title: 'Members · Christian Fitness Admin',
        loadComponent: () => import('./pages/members/members-page').then((m) => m.AdminMembersPage),
      },
    ],
  },
  {
    // Opened by forbiddenInterceptor on a 403 to a read, the URL asked for kept (L2-047; ADR 0016).
    path: 'forbidden',
    title: 'Staff only · Christian Fitness Admin',
    loadComponent: () => import('./pages/forbidden/forbidden-page').then((m) => m.ForbiddenPage),
  },
  {
    // The same screen for a role the area refuses: staffAuthGuard and forbiddenInterceptor open it
    // with the URL asked for kept (L2-019 AC5; ADR 0020). The words come from the route data.
    path: 'admins-only',
    title: 'Admins only · Christian Fitness Admin',
    data: { reason: 'role' },
    loadComponent: () => import('./pages/forbidden/forbidden-page').then((m) => m.ForbiddenPage),
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
