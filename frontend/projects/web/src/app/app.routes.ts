import type { Routes } from '@angular/router';
import { memberAuthGuard, redirectSignedInGuard } from '@cf/domain';

/**
 * Every route is lazy (AGENTS.md, "Lazy loading and memory"; L2-035 AC2) and has a title, so the
 * router sets the document title on every navigation (L2-038 AC6). The wildcard comes last.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Christian Fitness',
    canActivate: [redirectSignedInGuard],
    loadComponent: () => import('./pages/landing/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'join',
    title: 'Join · Christian Fitness',
    loadComponent: () => import('./pages/join/join-page').then((m) => m.JoinPage),
  },
  {
    path: 'sign-in',
    title: 'Sign in · Christian Fitness',
    loadComponent: () => import('./pages/sign-in/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: 'forgot-password',
    title: 'Forgot password · Christian Fitness',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    // The emailed link: the token rides in the fragment, which the page reads and drops (ADR 0014).
    path: 'reset-password',
    title: 'Reset password · Christian Fitness',
    loadComponent: () =>
      import('./pages/reset-password/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    // Every member route is a child of the shell, which opens only with a session (ADR 0009).
    path: '',
    canActivate: [memberAuthGuard],
    loadComponent: () => import('./shell/member-shell').then((m) => m.MemberShell),
    children: [
      {
        // A stand-in until slice 13.1 (ADR 0007).
        path: 'home',
        title: 'Home · Christian Fitness',
        loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
      },
      {
        // The published events that have not started, paged (L2-009; ADR 0027).
        path: 'events',
        title: 'Events · Christian Fitness',
        loadComponent: () => import('./pages/events/events-page').then((m) => m.EventsPage),
      },
      {
        // One published event in full (L2-010; ADR 0031).
        path: 'events/:id',
        title: 'Event · Christian Fitness',
        loadComponent: () =>
          import('./pages/event-detail/event-detail-page').then((m) => m.EventDetailPage),
      },
      {
        // The signed-in member's own profile (L2-005; ADR 0015).
        path: 'profile',
        title: 'Profile · Christian Fitness',
        loadComponent: () => import('./pages/profile/profile-page').then((m) => m.ProfilePage),
      },
    ],
  },
  {
    path: 'server-error',
    title: 'Something went wrong · Christian Fitness',
    loadComponent: () =>
      import('./pages/server-error/server-error-page').then((m) => m.ServerErrorPage),
  },
  {
    path: '**',
    title: 'Page not found · Christian Fitness',
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
