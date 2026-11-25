import type { Routes } from '@angular/router';
import { memberAuthGuard, redirectSignedInGuard, signedOutGuard } from '@cf/domain';

/**
 * Every route is lazy (AGENTS.md, "Lazy loading and memory"; L2-035 AC2) and has a title, so the
 * router sets the document title on every navigation (L2-038 AC6). The wildcard comes last.
 */
const titled = (page: string) => `${page} · Christian Fitness`;
const eventChat = () => import('./pages/event-chat/event-chat-page');
const offline = () => import('./pages/offline/offline-page');

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Christian Fitness',
    canActivate: [redirectSignedInGuard],
    loadComponent: () => import('./pages/landing/landing-page'),
  },
  {
    path: 'join',
    title: titled('Join'),
    loadComponent: () => import('./pages/join/join-page'),
  },
  {
    path: 'sign-in',
    title: titled('Sign in'),
    loadComponent: () => import('./pages/sign-in/sign-in-page'),
  },
  {
    path: 'forgot-password',
    title: titled('Forgot password'),
    loadComponent: () => import('./pages/forgot-password/forgot-password-page'),
  },
  {
    // The emailed link: the token rides in the fragment, which the page reads and drops (ADR 0014).
    path: 'reset-password',
    title: titled('Reset password'),
    loadComponent: () => import('./pages/reset-password/reset-password-page'),
  },
  {
    // A claim link opened signed out: the listing's name, Sign in and Join (L2-078 AC4; ADR 0092).
    // With a session it does not match, and the shell's child of the same address opens.
    path: 'claim/:token',
    title: titled('Claim a listing'),
    canMatch: [signedOutGuard],
    loadComponent: () => import('./pages/claim-listing/claim-sign-in-page'),
  },
  {
    // Every member route is a child of the shell, which opens only with a session (ADR 0009).
    path: '',
    canActivate: [memberAuthGuard],
    loadComponent: () => import('./shell/member-shell'),
    children: [
      {
        // A stand-in until slice 13.1 (ADR 0007).
        path: 'home',
        title: titled('Home'),
        loadComponent: () => import('./pages/home/home-page'),
      },
      {
        // The published events that have not started, paged (L2-009; ADR 0027).
        path: 'events',
        title: titled('Events'),
        loadComponent: () => import('./pages/events/events-page'),
      },
      {
        // One series with its sessions, sign-up panel and host (L2-051; ADR 0096).
        path: 'events/series/:id',
        title: titled('Event series'),
        loadComponent: () => import('./pages/event-series/event-series-page'),
      },
      {
        // A series' one group chat: the chat page in its series form (L2-052 AC2; ADR 0099).
        path: 'events/series/:id/chat',
        title: titled('Group chat'),
        data: { series: true },
        loadComponent: eventChat,
      },
      {
        // One published event in full (L2-010; ADR 0031).
        path: 'events/:id',
        title: titled('Event'),
        loadComponent: () => import('./pages/event-detail/event-detail-page'),
      },
      {
        // The directory: published listings by kind, with kind chips and a search (L2-054; ADR 0082).
        path: 'directory',
        title: titled('Directory'),
        loadComponent: () => import('./pages/directory/directory-page'),
      },
      {
        // A member suggests someone, or themselves, for the directory (L2-062; ADR 0086).
        path: 'directory/suggest',
        title: titled('Suggest a listing'),
        loadComponent: () => import('./pages/suggest-listing/suggest-listing-page'),
      },
      {
        // A claim link opened with a session: the listing as it will appear, Publish or This isn't me (L2-078; ADR 0092).
        path: 'claim/:token',
        title: titled('Claim a listing'),
        loadComponent: () => import('./pages/claim-listing/claim-listing-page'),
      },
      {
        // One published listing's profile (L2-055; ADR 0087).
        path: 'directory/:id',
        title: titled('Listing'),
        loadComponent: () => import('./pages/listing-profile/listing-profile-page'),
      },
      {
        // Services: so far the heading and "Apply to be listed" (L2-026; ADR 0000); the list is slice 16.1.
        path: 'services',
        title: titled('Services'),
        loadComponent: () => import('./pages/services/services-page'),
      },
      {
        // One professional's listing in full: below LG a row on Services opens it (L2-013 AC4; ADR 0052).
        path: 'services/:id',
        title: titled('Professional'),
        loadComponent: () => import('./pages/service-detail/service-detail-page'),
      },
      {
        // An event's group chat, for the members registered for it (L2-016; ADR 0039).
        path: 'events/:id/chat',
        title: titled('Group chat'),
        loadComponent: eventChat,
      },
      {
        // The member's conversations, newest first, with unread counts (L2-015; ADR 0042).
        path: 'messages',
        title: titled('Messages'),
        loadComponent: () => import('./pages/messages/messages-page'),
      },
      {
        // A private conversation with a member: the chat page in its direct form (L2-014; ADR 0043).
        path: 'messages/:id',
        title: titled('Direct message'),
        data: { direct: true },
        loadComponent: eventChat,
      },
      {
        // Another member's public profile (L2-005 AC3; ADR 0038).
        path: 'members/:id',
        title: titled('Member'),
        loadComponent: () => import('./pages/member-profile/member-profile-page'),
      },
      {
        // The member's in-app inbox, opened from the bell (ADR 0068, ADR 0083).
        path: 'notifications',
        title: titled('Notifications'),
        loadComponent: () => import('./pages/notifications/notifications-page'),
      },
      {
        // The signed-in member's own profile (L2-005; ADR 0015).
        path: 'profile',
        title: titled('Profile'),
        loadComponent: () => import('./pages/profile/profile-page'),
      },
    ],
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

export default routes;
