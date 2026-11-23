import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HOME_SERVICE, SESSION_SERVICE } from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  EventRow,
  Link,
  List,
  NextEvent,
  SkeletonRegion,
  Split,
} from '@cf/components';
import {
  type HomeRowView,
  homeRowViewOf,
  type NextEventView,
  nextEventViewOf,
  welcomeOf,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpHomeService } from '../../services/http-home.service';

/** The skeleton rows that stand in while Home loads (mock `home/loading`). */
const SKELETON_ROWS = [{ id: '1' }, { id: '2' }, { id: '3' }];

/**
 * Home at `/home` (L2-007 AC1 to AC3; ADR 0044): the greeting, "Welcome, {first name}", from the
 * signed-in member's session, then the member's next event as the `next-event` card or, with none,
 * an invitation to browse Events, and "Coming up": up to three events that suit their interests.
 * `HOME_SERVICE` is bound here so the client lives only while the screen does. While it loads it
 * shows skeletons; a 4xx or no answer shows "Your home page didn't load" with Try again, which
 * asks again in place (a 5xx is the server-error screen's, L2-043 AC4). The greeting reads
 * "Welcome" until the session arrives and stays so when it fails: a server error shows the
 * server-error screen; a visitor without a session is sent to sign in.
 */
@Component({
  selector: 'cf-home-page',
  imports: [Button, Container, EmptyState, EventRow, Link, List, NextEvent, SkeletonRegion, Split],
  providers: [{ provide: HOME_SERVICE, useClass: HttpHomeService }],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly home = inject(HOME_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  protected readonly greeting = signal(welcomeOf(null));
  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly next = signal<NextEventView | null>(null);
  protected readonly suggested = signal<HomeRowView[]>([]);
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
