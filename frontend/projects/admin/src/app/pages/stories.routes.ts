import type { Routes } from '@angular/router';

/** The title every admin route carries (L2-038 AC6). */
const titled = (page: string) => `${page} · Christian Fitness Admin`;

/**
 * The Stories area's routes, loaded with the area so they cost the initial bundle one entry
 * (ADR 0094, ADR 0097).
 */
const routes: Routes = [
  {
    // Every story, newest activity first, by status and page (journey 22; L2-068; ADR 0097).
    path: '',
    pathMatch: 'full',
    title: titled('Stories'),
    loadComponent: () => import('./stories/stories-page'),
  },
  {
    // The names stories run under, for Admins (journey 21; L2-077; ADR 0094).
    path: 'bylines',
    title: titled('Bylines'),
    loadComponent: () => import('./bylines/bylines-page'),
  },
  {
    // An empty Draft, kept on its first save (journey 22; L2-068 AC4, L2-069; ADR 0097).
    path: 'new',
    title: titled('New story'),
    loadComponent: () => import('./story-editor/story-editor-page'),
  },
  {
    // One story in the editor, after the named routes (journey 22; L2-069; ADR 0097).
    path: ':id',
    title: titled('Edit story'),
    loadComponent: () => import('./story-editor/story-editor-page'),
  },
];

export default routes;
