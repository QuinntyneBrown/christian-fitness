import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EVENTS_SERVICE } from '@cf/api';
import {
  Button,
  Checkbox,
  Chip,
  ChipBar,
  Container,
  EmptyState,
  EventCard,
  EventGrid,
  InlineMessage,
  SearchField,
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
  type EventFeed,
  eventListHref,
  type EventListQuery,
  eventListQueryOf,
  eventSearchOf,
  EVENT_SEARCH_DELAY_MS,
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
 * started, soonest first, as cards. The address holds the category, the search (`q`) and "Only
 * events I'm going to" (`going`), and every
 * new address starts the list again (L2-075; ADR 0081); typing waits for a pause, then replaces it.
 * The first page loads on arrival and the next 20 when the end
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
    Checkbox,
    Chip,
    ChipBar,
    Container,
    EmptyState,
    EventCard,
    EventGrid,
    InlineMessage,
    InView,
    SearchField,
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
  /** The selection the address holds: category and search (ADR 0081). */
  protected readonly query = signal<EventListQuery>({ category: null, q: '', going: false });
  protected readonly category = computed(() => this.query().category);
  /**
   * The search field's text. It is the member's while they type (a trailing space stays) and the
   * address's when the address names another search: on arrival, on Back and after clearing.
   */
  protected readonly term = signal('');
  /**
   * The wait after the last key before the search is asked for. A plain timer, cleared on each key
   * and on destroy: `debounceTime` would add to the initial bundle (lesson 26.1).
   */
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly chips = computed(() => eventCategoryChips(this.query()));
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
        const query = eventListQueryOf(params);
        this.query.set(query);
        if (eventSearchOf(this.term()) !== query.q) this.term.set(query.q);
        this.loadFirst();
      });
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  /** "Only events I'm going to" was ticked or cleared: a new place in history, as a chip is. */
  protected onGoing(going: boolean): void {
    this.navigate(eventListHref({ ...this.query(), going }));
  }

  /** The search field changed: show it at once, ask for it once typing pauses. */
  protected onSearch(text: string): void {
    this.term.set(text);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      // The address is replaced: a search is one place in history, not one a letter.
      const href = eventListHref({ ...this.query(), q: eventSearchOf(text) });
      void this.router.navigateByUrl(href, { replaceUrl: true });
    }, EVENT_SEARCH_DELAY_MS);
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
      .page(cursor, this.query())
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
      .page(null, this.query())
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
