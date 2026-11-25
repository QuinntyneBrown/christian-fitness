import type { Routes } from '@angular/router';
import { staffAuthGuard } from '@cf/domain';

const forbidden = () => import('./pages/forbidden/forbidden-page');
const services = () => import('./pages/manage-services/manage-services-page');
const offline = () => import('./pages/offline/offline-page');

/**
 * Every route is lazy (AGENTS.md, "Lazy loading and memory"; L2-035 AC2) and has a title, so the
 * router sets the document title on every navigation (L2-038 AC6). The wildcard comes last.
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
    // Every staff route is a child of the shell, which opens only with a staff session (ADR 0011).
    // The guard runs for every child, so each move between areas checks the session (ADR 0016).
    path: '',
    canActivateChild: [staffAuthGuard],
    loadComponent: () => import('./shell/admin-shell'),
    children: [
      {
        // The community's activity over the last weeks (slice 28.1; ADR 0000).
        path: '',
        pathMatch: 'full',
        title: titled('Dashboard'),
        loadComponent: () => import('./pages/dashboard/dashboard-page'),
      },
      {
        // Every event under All, Published and Draft, and the event editor (slice 10.1; ADR 0021).
        path: 'events',
        title: titled('Events'),
        loadComponent: () => import('./pages/events/events-page'),
      },
      {
        // Who registered for one event and how much of its capacity is used (slice 24.1; ADR 0036).
        path: 'events/:id/registrations',
        title: titled('Registrations'),
        loadComponent: () => import('./pages/event-registrations/event-registrations-page'),
      },
      {
        // Every series by its next session, the chosen one's summary and dates (journey 9; ADR 0091).
        path: 'series',
        title: titled('Event series'),
        loadComponent: () => import('./pages/series/series-page'),
      },
      {
        // Listing suggestions and what is listed (journey 18; ADR 0090), for Admins and Moderators.
        path: 'listings',
        title: titled('Listings'),
        loadComponent: () => import('./pages/manage-listings/manage-listings-page'),
      },
      {
        // The application queue (slice 21.1; ADR 0049).
        path: 'services',
        title: titled('Services'),
        loadComponent: services,
      },
      {
        // The members, searched, filtered by status and paged (slice 26.1; ADR 0022).
        path: 'members',
        title: titled('Members'),
        loadComponent: () => import('./pages/members/members-page'),
      },
    ],
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
    loadComponent: offline,
  },
  {
    path: 'server-error',
    title: titled('Something went wrong'),
    loadComponent: () => import('./pages/server-error/server-error-page'),
  },
  {
    path: '**',
    title: titled('Page not found'),
    loadComponent: () => import('./pages/not-found/not-found-page'),
  },
];
