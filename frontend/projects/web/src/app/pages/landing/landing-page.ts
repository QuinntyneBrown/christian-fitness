import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  type EventSummaryDto,
  type LandingEventDto,
  PUBLIC_EVENTS_SERVICE,
  STORIES_SERVICE,
  storyImageUrl,
  type StorySummaryDto,
} from '@cf/api';
import {
  Button,
  EventRow,
  Footer,
  HeadlineList,
  InlineMessage,
  JoinCard,
  List,
  Masthead,
  type MastheadSection,
  type NewsStoryView,
  RankedList,
  type RankedStory,
  River,
  Seal,
  Skeleton,
  SkeletonRegion,
  SkipLink,
  Spinner,
  StoryLead,
} from '@cf/components';
import {
  eventCardViewOf,
  NEWS_SECTIONS,
  newsSectionOf,
  RIVER_MAX,
  RIVER_PAGE,
  riverEndOf,
  storyAge,
  storySectionLabel,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpPublicEventsService } from '../../services/http-public-events.service';
import { HttpStoriesService } from '../../services/http-stories.service';

/** How many events the rail asks for (L2-001 AC5). */
const TAKE = 4;
const NO_ROWS: readonly NewsStoryView[] = [];
const SKELETON_ROWS = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];

/** One row of the rail's "Upcoming events", worded for a visitor. */
interface RailRow {
  id: string;
  month: string;
  day: string;
  heading: string;
  meta: string;
}

type Load = 'loading' | 'loaded' | 'failed';

/**
 * The news front page at `/` (L2-001, L2-002; ADR 0107; mock `landing/`), for visitors: a
 * signed-in member never sees it (`redirectSignedInGuard`). The masthead lists the sections;
 * `?section=<slug>` chooses one, and an unknown one is Latest. Latest shows the lead, four
 * headlines and the river under "The latest"; a section shows only its river under its name. The
 * river grows 12 stories at a time up to 60 with More stories. The rail holds the join card, the
 * next four events and "Most read". Stories, events and most read load and fail apart, and Try
 * again asks for the part that failed alone. `STORIES_SERVICE` and `PUBLIC_EVENTS_SERVICE` are
 * bound here, so their clients and requests live only while the page does. Every word a story
 * gives is rendered as text.
 */
@Component({
  selector: 'cf-landing-page',
  imports: [
    Button,
    EventRow,
    Footer,
    HeadlineList,
    InlineMessage,
    JoinCard,
    List,
    Masthead,
    RankedList,
    River,
    Seal,
    Skeleton,
    SkeletonRegion,
    SkipLink,
    Spinner,
    StoryLead,
  ],
  providers: [
    { provide: PUBLIC_EVENTS_SERVICE, useClass: HttpPublicEventsService },
    { provide: STORIES_SERVICE, useClass: HttpStoriesService },
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export default class LandingPage {
  private readonly events = inject(PUBLIC_EVENTS_SERVICE);
  private readonly stories = inject(STORIES_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private eventsRequest: Subscription | null = null;
  private storiesRequest: Subscription | null = null;
  private now = new Date();

  protected readonly skeletons = SKELETON_ROWS;
  protected readonly section = signal(newsSectionOf(null));
  protected readonly latest = computed(() => this.section().story === null);
  protected readonly sections = computed<MastheadSection[]>(() =>
    NEWS_SECTIONS.map((s) => ({
      label: s.label,
      href: s.href,
      current: s.slug === this.section().slug,
    })),
  );

  protected readonly storiesState = signal<Load>('loading');
  protected readonly lead = signal<NewsStoryView | null>(null);
  protected readonly headlines = signal<NewsStoryView[]>([]);
  protected readonly river = signal<NewsStoryView[]>([]);
  private readonly more = signal(false);
  protected readonly moreState = signal<'idle' | 'loading' | 'failed'>('idle');
  /** The river's rows once the stories have loaded; none while they load or after they fail. */
  protected readonly riverRows = computed(() =>
    this.storiesState() === 'loaded' ? this.river() : NO_ROWS,
  );
  protected readonly riverEnd = computed(() => riverEndOf(this.river().length, this.more()));
  /** The river's title is the page's `h1` unless the lead is. */
  protected readonly riverIsHeading = computed(
    () => !this.latest() || (this.storiesState() !== 'loading' && this.lead() === null),
  );

  protected readonly eventsState = signal<Load>('loading');
  protected readonly rows = signal<RailRow[]>([]);
  /** "Most read"; empty while it loads, when nothing was read and when it fails, which hides it. */
  protected readonly mostRead = signal<RankedStory[]>([]);

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.section.set(newsSectionOf(params.get('section')));
        this.loadStories();
      });
    this.loadEvents();
    this.loadMostRead();
  }

  /** Follows a section or a story inside the app. */
  protected go(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** Asks for the section's front page again, from the top. */
  protected loadStories(): void {
    this.storiesRequest?.unsubscribe();
    this.storiesState.set('loading');
    this.moreState.set('idle');
    this.storiesRequest = this.stories
      .frontPage(this.section().story, 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.now = new Date();
          this.lead.set(page.lead ? this.viewOf(page.lead) : null);
          this.headlines.set(page.headlines.map((s) => this.viewOf(s)));
          this.river.set(page.latest.slice(0, RIVER_PAGE).map((s) => this.viewOf(s)));
          this.more.set(page.more);
          this.storiesState.set('loaded');
        },
        error: () => this.storiesState.set('failed'),
      });
  }

  /** Adds the next 12 river stories, keeping those shown when it fails (ADR 0107). */
  protected loadMore(): void {
    const shown = this.river().length;
    if (shown >= RIVER_MAX) return;
    this.storiesRequest?.unsubscribe();
    this.moreState.set('loading');
    this.storiesRequest = this.stories
      .frontPage(this.section().story, shown)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const added = page.latest.slice(0, RIVER_PAGE).map((s) => this.viewOf(s));
          this.river.update((river) => [...river, ...added].slice(0, RIVER_MAX));
          this.more.set(page.more);
          this.moreState.set('idle');
        },
        error: () => this.moreState.set('failed'),
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
          this.rows.set(events.slice(0, TAKE).map(railRowOf));
          this.eventsState.set('loaded');
        },
        error: () => this.eventsState.set('failed'),
      });
  }

  private loadMostRead(): void {
    this.stories
      .mostRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stories) =>
          this.mostRead.set(
            stories.slice(0, 5).map((s) => ({ href: storyHref(s.slug), title: s.headline })),
          ),
        // A failed "Most read" hides itself; nothing else on the page changes (mock `most-read-failed`).
        error: () => this.mostRead.set([]),
      });
  }

  private viewOf(story: StorySummaryDto): NewsStoryView {
    return {
      href: storyHref(story.slug),
      section: storySectionLabel(story.section),
      title: story.headline,
      summary: story.summary,
      author: story.author ?? '',
      age: storyAge(story.publishedAt, this.now),
      image: story.image ? storyImageUrl(story.image.key) : null,
    };
  }
}

function storyHref(slug: string): string {
  return `/stories/${encodeURIComponent(slug)}`;
}

function railRowOf(event: LandingEventDto): RailRow {
  const summary: EventSummaryDto = {
    ...event,
    priceCents: 0,
    capacity: 0,
    going: 0,
    imageKey: null,
  };
  const card = eventCardViewOf(summary);
  return {
    id: card.id,
    month: card.month,
    day: card.day,
    heading: card.heading,
    meta: `${card.time} · ${event.area}`,
  };
}
