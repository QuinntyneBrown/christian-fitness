import { LegalChange } from '../legal/legal-change';
import { legalNoticeProvider } from '../legal/legal-notice';
import { Footer } from '@cf/components';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
  CHAT_CONNECTION,
  CONVERSATIONS,
  NOTIFICATION_STREAM,
  NOTIFICATIONS_SERVICE,
  SESSION_SERVICE,
} from '@cf/api';
import {
  Banner,
  type MemberDestination,
  type MemberDestinationKey,
  SkipLink,
  TabBar,
  TopBar,
} from '@cf/components';
import { initialsOf, NetworkStatus } from '@cf/domain';
import { filter } from 'rxjs';
import { HttpConversationsService } from '../services/http-conversations.service';
import { HttpNotificationsService } from '../services/http-notifications.service';
import { MemberInbox } from '../services/member-inbox';
import { MemberNotifications } from '../services/member-notifications';
import { SignalRChatConnection } from '../services/signalr-chat-connection';

/**
 * The places of the member app (L2-008 AC1; ADR 0027, 0042, 0045, 0000, 0082).
 * `TopBar` omits Profile from its link row (the avatar button covers it from MD up); `TabBar`
 * shows all six below MD (L2-008 AC1, AC2).
 */
const DESTINATIONS: readonly MemberDestination[] = [
  { key: 'home', label: 'Home', href: '/home' },
  { key: 'events', label: 'Events', href: '/events' },
  { key: 'directory', label: 'Directory', href: '/directory' },
  { key: 'services', label: 'Services', href: '/services' },
  { key: 'messages', label: 'Messages', href: '/messages' },
  { key: 'profile', label: 'Profile', href: '/profile' },
];

/**
 * The routed layout around every member route, behind `memberAuthGuard` (ADR 0007, 0009): the
 * design system's skip link, the top bar's app header above the route and the mobile tab bar below
 * MD (L2-008 AC1–AC3; ADR 0019, 0045). `MemberInbox` refreshes the member's conversations on entry
 * and on route changes so the navigation unread badge, Home's Messages aside and Messages share one
 * request. `MemberNotifications` loads the member's notifications once on entry for the bell, which
 * the Notifications screen shares (ADR 0068, ADR 0083), and opens the member's one real-time
 * connection, which chat screens share and which ends with the shell, so pushed notifications reach
 * the bell on every member screen. Sign out ends the session on the server and returns the member to the start, a session
 * that had already ended included (L2-004 AC5); any other failure keeps them where they are with
 * Sign out enabled.
 */
@Component({
  selector: 'cf-member-shell',
  host: { '[attr.data-offline-ready]': 'offlineReady() ? "" : null' },
  imports: [LegalChange, Footer, Banner, RouterOutlet, SkipLink, TabBar, TopBar],
  providers: [
    legalNoticeProvider,
    { provide: CONVERSATIONS, useClass: HttpConversationsService },
    MemberInbox,
    { provide: NOTIFICATIONS_SERVICE, useClass: HttpNotificationsService },
    // The member's one real-time connection, for chat and notifications alike (ADR 0083).
    SignalRChatConnection,
    { provide: CHAT_CONNECTION, useExisting: SignalRChatConnection },
    { provide: NOTIFICATION_STREAM, useExisting: SignalRChatConnection },
    MemberNotifications,
  ],
  templateUrl: './member-shell.html',
  styleUrl: './member-shell.scss',
})
export default class MemberShell {
  private readonly session = inject(SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly inbox = inject(MemberInbox);
  protected readonly notifications = inject(MemberNotifications);
  protected readonly network = inject(NetworkStatus);

  protected readonly signingOut = signal(false);
  /** True once the offline screen's lazy chunk is loaded, so it can open with no network. */
  protected readonly offlineReady = signal(false);
  protected readonly initials = signal('');
  protected readonly destinations = DESTINATIONS;
  /** The place showing, read from the address; none on any other. */
  protected readonly current = signal<MemberDestinationKey | null>(placeOf(this.urlNow()));
  /** True on the Notifications screen, where the bell is current. */
  protected readonly onNotifications = signal(isNotifications(this.urlNow()));

  constructor() {
    let lastUrl = this.urlNow();
    this.inbox.refresh();
    this.notifications.load();
    this.notifications.listen();
    if (this.network.online()) {
      void import('../pages/offline/offline-page').then(() => this.offlineReady.set(true));
    }
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.current.set(placeOf(this.router.url));
        this.onNotifications.set(isNotifications(this.router.url));
        if (this.router.url !== lastUrl) {
          lastUrl = this.router.url;
          this.inbox.refresh();
        }
      });
    this.session
      .current()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => this.initials.set(initialsOf(session.name)),
        // The guard has just read the session; a failure now leaves the avatar without letters.
        error: () => undefined,
      });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  protected signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.session
      .signOut()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: () => this.signingOut.set(false),
      });
  }

  /** Where the navigation that is creating the shell is going, or else where the router is. */
  private urlNow(): string {
    const navigation = this.router.currentNavigation();
    return navigation
      ? this.router.serializeUrl(navigation.finalUrl ?? navigation.extractedUrl)
      : this.router.url;
  }
}

/** Whether an address is the Notifications screen. */
function isNotifications(url: string): boolean {
  return url.split(/[?#]/, 1)[0] === '/notifications';
}

/** The place of the member app an address is in: Events covers an event under it too. */
function placeOf(url: string): MemberDestinationKey | null {
  const path = url.split(/[?#]/, 1)[0];
  if (path === '/profile') return 'profile';
  if (path === '/home') return 'home';
  if (path === '/messages' || path.startsWith('/messages/')) return 'messages';
  if (path === '/services') return 'services';
  if (path === '/directory' || path.startsWith('/directory/')) return 'directory';
  if (path === '/events' || path.startsWith('/events/')) return 'events';
  return null;
}
