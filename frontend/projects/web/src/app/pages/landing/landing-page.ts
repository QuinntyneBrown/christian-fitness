import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  type EventSummaryDto,
  type FrontPageDto,
  type LandingEventDto,
  PUBLIC_EVENTS_SERVICE,
  STORIES_SERVICE,
} from '@cf/api';
import {
  Button,
  EventRow,
  Footer,
  Headline,
  InlineMessage,
  JoinCard,
  List,
  Masthead,
  type MastheadSection,
  Ranked,
  type RankedItem,
  RuleTitle,
  Seal,
  SkeletonRegion,
  Spinner,
  StoryLead,
  StoryRow,
} from '@cf/components';
import {
  type EventCardView,
  eventCardViewOf,
  NEWS_SECTIONS,
  type NewsSection,
  newsSectionOf,
  RIVER_MAX,
  riverWith,
  storyTeaserOf,
  type StoryTeaserView,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpPublicEventsService } from '../../services/http-public-events.service';
import { HttpStoriesService } from '../../services/http-stories.service';

/** How many events the rail asks for (L2-001 AC5). */
const TAKE = 4;
const EVENT_SKELETONS = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
const HEADLINE_SKELETONS = [1, 2, 3, 4];
const RIVER_SKELETONS = [1, 2, 3];

/** One row of the rail's "Upcoming events", worded for a visitor. */
interface LandingRow {
  id: string;
  month: string;
  day: string;
  heading: string;
  meta: string;
}

/**
 * The public landing page at `/`, a news front page (L2-001, L2-002): the masthead with the
 * sections; for Latest the lead story beside four headlines and the river under "The latest", for
 * a section its stories alone under its name; the rail with the call to join, the next four
 * events and "Most read"; John 10:10 and the footer. A signed-in member never sees it
 * (`redirectSignedInGuard`). `STORIES_SERVICE` and `PUBLIC_EVENTS_SERVICE` are bound here, so the
 * clients and their requests live only while the page does. The stories and the events load and
 * fail on their own, each with its own Try again. The section is the address's `section` value
 * (ADR 0071); choosing one routes without a reload and asks for that section's stories. The river
 * grows 12 stories at a time and never holds more than 60 (L2-037).
 */
@Component({
  selector: 'cf-landing-page',
  imports: [
    Button,
    EventRow,
    Footer,
    Headline,
    InlineMessage,
    JoinCard,
    List,
    Masthead,
    Ranked,
    RuleTitle,
    Seal,
    SkeletonRegion,
    Spinner,
    StoryLead,
    StoryRow,
  ],
  providers: [
    { provide: STORIES_SERVICE, useClass: HttpStoriesService },
    { provide: PUBLIC_EVENTS_SERVICE, useClass: HttpPublicEventsService },
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export default class LandingPage {
  private readonly storiesApi = inject(STORIES_SERVICE);
  private readonly events = inject(PUBLIC_EVENTS_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private storiesRequest: Subscription | null = null;
  private eventsRequest: Subscription | null = null;
  private nextCursor: string | null = null;

  protected readonly eventSkeletons = EVENT_SKELETONS;
  protected readonly headlineSkeletons = HEADLINE_SKELETONS;
  protected readonly riverSkeletons = RIVER_SKELETONS;

  protected readonly section = signal<NewsSection>(NEWS_SECTIONS[0]!);
  protected readonly sections = computed<MastheadSection[]>(() =>
    NEWS_SECTIONS.map((section) => ({
      label: section.label,
      href: section.href,
      current: section === this.section(),
    })),
  );

  protected readonly storiesState = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly lead = signal<StoryTeaserView | null>(null);
  protected readonly headlines = signal<StoryTeaserView[]>([]);
  protected readonly river = signal<StoryTeaserView[]>([]);
  protected readonly mostRead = signal<RankedItem[]>([]);
  /** Whether another page of the river can be asked for, and how the last ask went. */
  protected readonly more = signal<'none' | 'ready' | 'loading' | 'failed'>('none');
  protected readonly capped = computed(() => this.river().length >= RIVER_MAX);

  protected readonly isLatest = computed(() => this.section().slug === null);
  /** The lead and the headlines show for Latest, while it loads and once it has a lead. */
  protected readonly showsTop = computed(
    () => this.isLatest() && (this.storiesState() === 'loading' || this.lead() !== null),
  );
  protected readonly riverTitle = computed(() =>
    this.isLatest() ? 'The latest' : this.section().label,
  );
  protected readonly emptyText = computed(() =>
    this.isLatest()
      ? 'No stories yet. Check back soon.'
      : `No stories in ${this.section().label} yet this week.`,
  );

  protected readonly eventsState = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly rows = signal<LandingRow[]>([]);

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.section.set(newsSectionOf(params.get('section')));
        this.loadStories();
      });
    this.loadEvents();
  }

  /** Routes to a section's address without a reload. */
  protected go(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** Asks for the section's front page again, in place. */
  protected loadStories(): void {
    this.storiesRequest?.unsubscribe();
    this.storiesState.set('loading');
    this.more.set('none');
    this.storiesRequest = this.storiesApi
      .frontPage(this.section().slug, null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const now = new Date();
          this.lead.set(page.lead ? storyTeaserOf(page.lead, now) : null);
          this.headlines.set(page.headlines.slice(0, 4).map((story) => storyTeaserOf(story, now)));
          this.river.set(riverWith([], teasersOf(page, now)));
          this.mostRead.set(
            page.mostRead.slice(0, 5).map((story) => {
              const teaser = storyTeaserOf(story, now);
              return { id: teaser.id, title: teaser.heading, href: teaser.href };
            }),
          );
          this.settle(page);
          this.storiesState.set('loaded');
        },
        error: () => {
          this.lead.set(null);
          this.headlines.set([]);
          this.river.set([]);
          this.mostRead.set([]);
          this.storiesState.set('failed');
        },
      });
  }

  /** Asks for the next 12 stories of the river, keeping the ones it holds if they do not come. */
  protected loadMore(): void {
    const cursor = this.nextCursor;
    if (!cursor || this.more() === 'loading' || this.capped()) return;
    this.more.set('loading');
    this.storiesRequest?.unsubscribe();
    this.storiesRequest = this.storiesApi
      .frontPage(this.section().slug, cursor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.river.update((held) => riverWith(held, teasersOf(page, new Date())));
          this.settle(page);
        },
        error: () => this.more.set('failed'),
      });
  }

  /** Asks for the events again, in place. */
  protected loadEvents(): void {
    this.eventsRequest?.unsubscribe();
    this.eventsState.set('loading');
    this.eventsRequest = this.events
      .upcoming(TAKE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (events) => {
          this.rows.set(events.slice(0, TAKE).map((event) => rowOf(event)));
          this.eventsState.set('loaded');
        },
        error: () => this.eventsState.set('failed'),
      });
  }

  /** Keeps the cursor of the page after `page`, unless the river is full. */
  private settle(page: FrontPageDto): void {
    this.nextCursor = this.capped() ? null : page.nextCursor;
    this.more.set(this.nextCursor ? 'ready' : 'none');
  }
}

function teasersOf(page: FrontPageDto, now: Date): StoryTeaserView[] {
  return page.latest.map((story) => storyTeaserOf(story, now));
}

function rowOf(event: LandingEventDto): LandingRow {
  const summary: EventSummaryDto = {
    ...event,
    priceCents: 0,
    capacity: 0,
    going: 0,
    imageKey: null,
  };
  const card: EventCardView = eventCardViewOf(summary);
  return {
    id: card.id,
    month: card.month,
    day: card.day,
    heading: card.heading,
    meta: `${card.time} · ${event.area}`,
  };
}
