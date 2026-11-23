import type { Routes } from '@angular/router';
import { memberAuthGuard, redirectSignedInGuard } from '@cf/domain';

/**
 * Every route is lazy (AGENTS.md, "Lazy loading and memory"; L2-035 AC2) and has a title, so the
 * router sets the document title on every navigation (L2-038 AC6). The wildcard comes last.
 */
const titled = (page: string) => `${page} · Christian Fitness`;

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
    title: titled('Join'),
    loadComponent: () => import('./pages/join/join-page').then((m) => m.JoinPage),
  },
  {
    path: 'sign-in',
    title: titled('Sign in'),
    loadComponent: () => import('./pages/sign-in/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: 'forgot-password',
    title: titled('Forgot password'),
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    // The emailed link: the token rides in the fragment, which the page reads and drops (ADR 0014).
    path: 'reset-password',
    title: titled('Reset password'),
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
        title: titled('Home'),
        loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
      },
      {
        // The published events that have not started, paged (L2-009; ADR 0027).
        path: 'events',
        title: titled('Events'),
        loadComponent: () => import('./pages/events/events-page').then((m) => m.EventsPage),
      },
      {
        // One published event in full (L2-010; ADR 0031).
        path: 'events/:id',
        title: titled('Event'),
        loadComponent: () =>
          import('./pages/event-detail/event-detail-page').then((m) => m.EventDetailPage),
      },
      {
        // An event's group chat, for the members registered for it (L2-016; ADR 0039).
        path: 'events/:id/chat',
        title: titled('Group chat'),
        loadComponent: () =>
          import('./pages/event-chat/event-chat-page').then((m) => m.EventChatPage),
      },
      {
        // The member's conversations, newest first, with unread counts (L2-015; ADR 0042).
        path: 'messages',
        title: titled('Messages'),
        loadComponent: () => import('./pages/messages/messages-page').then((m) => m.MessagesPage),
      },
      {
        // Another member's public profile (L2-005 AC3; ADR 0038).
        path: 'members/:id',
        title: titled('Member'),
        loadComponent: () =>
          import('./pages/member-profile/member-profile-page').then((m) => m.MemberProfilePage),
      },
      {
        // The signed-in member's own profile (L2-005; ADR 0015).
        path: 'profile',
        title: titled('Profile'),
        loadComponent: () => import('./pages/profile/profile-page').then((m) => m.ProfilePage),
      },
    ],
  },
  {
    path: 'server-error',
    title: titled('Something went wrong'),
    loadComponent: () =>
      import('./pages/server-error/server-error-page').then((m) => m.ServerErrorPage),
  },
  {
    path: '**',
    title: titled('Page not found'),
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
