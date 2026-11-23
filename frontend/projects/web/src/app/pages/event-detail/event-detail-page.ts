import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EVENTS_SERVICE } from '@cf/api';
import {
  Button,
  Card,
  Container,
  type DescriptionItem,
  DescriptionList,
  EmptyState,
  ErrorPage,
  Link,
  Skeleton,
  SkeletonRegion,
} from '@cf/components';
import { type EventDetailView, eventDetailViewOf } from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpEventsService } from '../../services/http-events.service';

/**
 * Event detail at `/events/:id` (L2-010 AC1, AC2; ADR 0031): one published event with its picture,
 * category, title, date, time, place and area, summary, price, spots left and how many are going.
 * `EVENTS_SERVICE` is bound here, so the client lives only while the screen does. While it loads
 * it shows skeletons; an id that is not there (404) shows the not-found screen; any other failure
 * shows "This event didn't load" with Try again (a 5xx is the server-error screen's, L2-043 AC4).
 * Register takes a place (L2-011; ADR 0032): the button is busy while it asks, then the panel says
 * "You're going" with the new count, and any refusal shows a generic message with Register still
 * usable. The group chat link and the full-event page wait for slices 12.x and 6.2.
 */
@Component({
  selector: 'cf-event-detail-page',
  imports: [
    Button,
    Card,
    Container,
    DescriptionList,
    EmptyState,
    ErrorPage,
    Link,
    Skeleton,
    SkeletonRegion,
  ],
  providers: [{ provide: EVENTS_SERVICE, useClass: HttpEventsService }],
  templateUrl: './event-detail-page.html',
  styleUrl: './event-detail-page.scss',
})
export class EventDetailPage {
  private readonly events = inject(EVENTS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private id = '';
  private request: Subscription | null = null;
  private registration: Subscription | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  protected readonly event = signal<EventDetailView | null>(null);
  protected readonly registering = signal(false);
  protected readonly registerFailed = signal(false);
  protected readonly facts = computed<DescriptionItem[]>(() => {
    const view = this.event();
    return view
      ? [
          { term: view.day, detail: view.time, icon: 'clock' },
          { term: view.place, detail: view.area, icon: 'pin' },
        ]
      : [];
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = params.get('id') ?? '';
        this.load();
      });
  }

  /** Asks for the event again, in place. */
  protected retry(): void {
    this.load();
  }

  /** Takes a place at the event, once at a time. */
  protected register(): void {
    if (this.registering()) return;
    this.registering.set(true);
    this.registerFailed.set(false);
    this.registration?.unsubscribe();
    this.registration = this.events
      .register(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.event.set(eventDetailViewOf(event));
          this.registering.set(false);
        },
        error: () => {
          this.registerFailed.set(true);
          this.registering.set(false);
        },
      });
  }

  private load(): void {
    this.request?.unsubscribe();
    this.registration?.unsubscribe();
    this.registering.set(false);
    this.registerFailed.set(false);
    this.state.set('loading');
    this.request = this.events
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.event.set(eventDetailViewOf(event));
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; a 404 is "not found", anything else "failed".
        error: (error: unknown) =>
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed',
          ),
      });
  }
}
