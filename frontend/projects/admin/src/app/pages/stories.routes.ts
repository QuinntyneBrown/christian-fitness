import type { Routes } from '@angular/router';

/** The title every admin route carries (L2-038 AC6). */
const titled = (page: string) => `${page} · Christian Fitness Admin`;

/**
 * The Stories area's routes, loaded with the area so they cost the initial bundle one entry
 * (ADR 0094). Until the Stories list exists, Stories opens Bylines.
 */
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'bylines' },
  {
    // The names stories run under, for Admins (journey 21; L2-077; ADR 0094).
    path: 'bylines',
    title: titled('Bylines'),
    loadComponent: () => import('./bylines/bylines-page'),
  },
];

export default routes;
