import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EVENTS_SERVICE, type EventCategory } from '@cf/api';
import {
  Button,
  Chip,
  ChipBar,
  Container,
  EmptyState,
  EventCard,
  EventGrid,
  InlineMessage,
  Skeleton,
  SkeletonRegion,
  Spinner,
} from '@cf/components';
import {
  appendPage,
  EMPTY_FEED,
  type EventCardView,
  eventCardViewOf,
  eventCategoryChips,
  eventCategoryOf,
  type EventFeed,
  hasMore,
  noCategoryEventsText,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpEventsService } from '../../services/http-events.service';
import { InView } from './in-view';

/** How many skeleton cards stand in while the first page loads (mock `events/loading`). */
const SKELETON_CARDS = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];

/**
 * Events at `/events` (L2-009 AC1, AC4 to AC7; ADR 0027): the published events that have not
 * started, soonest first, as cards. The first page loads on arrival and the next 20 when the end
 * of the list comes into view, until there is no more or 200 are shown, which ends the list with a
 * note. `EVENTS_SERVICE` is bound here, so the client lives only while the screen does, and the
 * observer, the request and the cards go with it. While the first page loads it shows skeleton
 * cards; with no events it says so and points home; a 4xx or no answer shows "Events didn't load"
 * with Try again (a 5xx is the server-error screen's, L2-043 AC4). A next page that fails leaves
 * the cards and offers Try again under them.
 */
@Component({
  selector: 'cf-events-page',
  imports: [
    Button,
    Chip,
    ChipBar,
    Container,
    EmptyState,
    EventCard,
    EventGrid,
    InlineMessage,
    InView,
    Skeleton,
    SkeletonRegion,
    Spinner,
  ],
  providers: [{ provide: EVENTS_SERVICE, useClass: HttpEventsService }],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
})
export default class EventsPage {
  private readonly events = inject(EVENTS_SERVICE);
  private readonly router = inject(Router);
  protected readonly category = signal<EventCategory | null>(null);
  protected readonly chips = computed(() => eventCategoryChips(this.category()));
  protected readonly noResultsText = computed(() => {
    const current = this.category();
    return current === null ? '' : noCategoryEventsText(current);
  });
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  protected readonly skeletons = SKELETON_CARDS;
  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  /** The next page: waiting for the end to show, on its way, or failed. */
  protected readonly more = signal<'idle' | 'loading' | 'failed'>('idle');
  private readonly feed = signal<EventFeed>(EMPTY_FEED);

  protected readonly cards = computed<EventCardView[]>(() =>
    this.feed().events.map((event) => eventCardViewOf(event)),
  );
  /** The end of the list is watched only while there is a next page and none is on its way. */
  protected readonly watching = computed(
    () => this.state() === 'loaded' && this.more() === 'idle' && hasMore(this.feed()),
  );
  protected readonly capped = computed(() => this.feed().capped);

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.category.set(eventCategoryOf(params.get('category')));
        this.loadFirst();
      });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** Asks for the first page again, in place. */
  protected retry(): void {
    this.loadFirst();
  }

  /** Asks for the next page, when the end shows or Try again is pressed. */
  protected loadMore(): void {
    const cursor = this.feed().nextCursor;
    if (cursor === null || this.more() === 'loading') return;
    this.request?.unsubscribe();
    this.more.set('loading');
    this.request = this.events
      .page(cursor, this.category())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.feed.update((feed) => appendPage(feed, page));
          this.more.set('idle');
        },
        error: () => this.more.set('failed'),
      });
  }

  private loadFirst(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.more.set('idle');
    this.feed.set(EMPTY_FEED);
    this.request = this.events
      .page(null, this.category())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.feed.set(appendPage(EMPTY_FEED, page));
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; anything else shows the failed state.
        error: () => this.state.set('failed'),
      });
  }
}
