import type { Routes } from '@angular/router';
import { staffAuthGuard } from '@cf/domain';

/** The title every admin route carries (L2-038 AC6). */
const titled = (page: string) => `${page} · Christian Fitness Admin`;

/**
 * The staff areas, loaded with the shell so their routes, the guard and the area table stay out of
 * the initial bundle (AGENTS.md, "Lazy loading and memory"). Every staff route is a child of the
 * shell, which opens only with a staff session (ADR 0011). The guard runs for every child, so each
 * move between areas checks the session (ADR 0016).
 */
const routes: Routes = [
  {
    // A story as readers will see it, opened in a new tab outside the shell, for Admins only
    // (journey 22; L2-069 AC13; ADR 0097).
    path: 'stories/:id/preview',
    title: titled('Preview'),
    canActivate: [staffAuthGuard],
    loadComponent: () => import('../pages/story-preview/story-preview-page'),
  },
  {
    path: '',
    canActivateChild: [staffAuthGuard],
    loadComponent: () => import('./admin-shell'),
    children: [
      {
        // The community's activity over the last weeks (slice 28.1; ADR 0000).
        path: '',
        pathMatch: 'full',
        title: titled('Dashboard'),
        loadComponent: () => import('../pages/dashboard/dashboard-page'),
      },
      {
        // Stories and its screens, loaded with the area (journey 21; ADR 0094).
        path: 'stories',
        loadChildren: () => import('../pages/stories.routes'),
      },
      {
        // Every event under All, Published and Draft, and the event editor (slice 10.1; ADR 0021).
        path: 'events',
        title: titled('Events'),
        loadComponent: () => import('../pages/events/events-page'),
      },
      {
        // Who registered for one event and how much of its capacity is used (slice 24.1; ADR 0036).
        path: 'events/:id/registrations',
        title: titled('Registrations'),
        loadComponent: () => import('../pages/event-registrations/event-registrations-page'),
      },
      {
        // Every series by its next session, the chosen one's summary and dates (journey 9; ADR 0091).
        path: 'series',
        title: titled('Event series'),
        loadComponent: () => import('../pages/series/series-page'),
      },
      {
        // Listing suggestions and what is listed (journey 18; ADR 0090), for Admins and Moderators.
        path: 'listings',
        title: titled('Listings'),
        loadComponent: () => import('../pages/manage-listings/manage-listings-page'),
      },
      {
        // The application queue (slice 21.1; ADR 0049).
        path: 'services',
        title: titled('Services'),
        loadComponent: () => import('../pages/manage-services/manage-services-page'),
      },
      {
        // The members, searched, filtered by status and paged (slice 26.1; ADR 0022).
        path: 'members',
        title: titled('Members'),
        loadComponent: () => import('../pages/members/members-page'),
      },
    ],
  },
];

export default routes;
