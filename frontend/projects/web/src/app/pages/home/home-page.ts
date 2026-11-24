import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HOME_SERVICE, SESSION_SERVICE } from '@cf/api';
import {
  Avatar,
  Button,
  Container,
  EmptyState,
  EventRow,
  InlineMessage,
  Link,
  List,
  MiniRow,
  NextEvent,
  Skeleton,
  SkeletonRegion,
  Split,
} from '@cf/components';
import {
  homeMessageRowsOf,
  type HomeRowView,
  homeRowViewOf,
  type NextEventView,
  nextEventViewOf,
  welcomeOf,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpHomeService } from '../../services/http-home.service';
import { MemberInbox } from '../../services/member-inbox';

/** The skeleton rows that stand in while Home loads (mock `home/loading`). */
const SKELETON_ROWS = [{ id: '1' }, { id: '2' }, { id: '3' }];

/**
 * Home at `/home` (L2-007 AC1 to AC5; ADR 0044, 0045): the greeting, "Welcome, {first name}", from
 * the signed-in member's session, then the member's next event as the `next-event` card or, with
 * none, an invitation to browse Events, "Coming up" (up to three events that suit their interests),
 * and the "Messages" aside (up to three newest conversations from `MemberInbox`, an inline empty
 * invitation with none, or `cf-inline-message` when conversations fail independently of events).
 */
@Component({
  selector: 'cf-home-page',
  imports: [
    Avatar,
    Button,
    Container,
    EmptyState,
    EventRow,
    InlineMessage,
    Link,
    List,
    MiniRow,
    NextEvent,
    Skeleton,
    SkeletonRegion,
    Split,
  ],
  providers: [{ provide: HOME_SERVICE, useClass: HttpHomeService }],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly home = inject(HOME_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly inbox = inject(MemberInbox);
  private request: Subscription | null = null;

  protected readonly greeting = signal(welcomeOf(null));
  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly next = signal<NextEventView | null>(null);
  protected readonly suggested = signal<HomeRowView[]>([]);
  protected readonly messageRows = computed(() =>
    homeMessageRowsOf(this.inbox.conversations(), new Date()),
  );
  protected readonly skeletons = SKELETON_ROWS;

  constructor() {
    inject(SESSION_SERVICE)
      .current()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (session) => this.greeting.set(welcomeOf(session.name)),
        error: () => undefined,
      });
    this.load();
  }

  /** Asks for Home again, in place. */
  protected retry(): void {
    this.load();
  }

  /** Asks for the Messages aside again, in place, while keeping Home's events visible. */
  protected retryMessages(): void {
    this.inbox.retryInline();
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.home
      .home()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (home) => {
          this.next.set(home.nextEvent ? nextEventViewOf(home.nextEvent, new Date()) : null);
          this.suggested.set(home.suggested.map((event) => homeRowViewOf(event)));
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; anything else shows the failed state.
        error: () => this.state.set('failed'),
      });
  }
}
