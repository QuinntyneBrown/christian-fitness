import type { Routes } from '@angular/router';
const titled = (page: string) => page + ' · Christian Fitness';
export const routes: Routes = [
  {
    path: 'terms',
    title: titled('Terms of Service'),
    loadComponent: () => import('./pages/terms/terms-page'),
  },
  {
    path: 'privacy',
    title: titled('Privacy Policy'),
    loadComponent: () => import('./pages/privacy/privacy-page'),
  },
  { path: '', loadChildren: () => import('./member-app.routes') },
];
