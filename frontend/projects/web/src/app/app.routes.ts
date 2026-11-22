import type { Routes } from '@angular/router';

/** Every route is lazy (AGENTS.md, "Lazy loading and memory"; L2-035 AC2). */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/start/start-page').then((m) => m.StartPage),
  },
];
