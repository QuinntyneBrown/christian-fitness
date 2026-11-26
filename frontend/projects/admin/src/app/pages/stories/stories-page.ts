import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ADMIN_STORIES_SERVICE,
  type AdminStoryListDto,
  type AdminStoryListQuery,
  type AdminStoryRowDto,
} from '@cf/api';
import {
  Button,
  EmptyState,
  isPlainClick,
  Pagination,
  ReviewCard,
  SkeletonRegion,
  Status,
  Table,
  type TableColumn,
  type TableRow,
  type TabItem,
  Tabs,
} from '@cf/components';
import {
  storyByline,
  storyListHref,
  storyListQueryOf,
  storyReadsText,
  storyReviewLabel,
  storySectionLabel,
  storyStatusLabel,
  storyTabs,
  storyWhen,
} from '@cf/domain';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminStoriesService } from '../../services/http-admin-stories.service';

/** The table's columns, as mock `admin-stories/default` heads them. */
const COLUMNS: readonly TableColumn[] = [
  { key: 'story', label: 'Story', kind: 'title' },
  { key: 'section', label: 'Section', kind: 'nowrap' },
  { key: 'status', label: 'Status', kind: 'custom' },
  { key: 'when', label: 'When', kind: 'nowrap' },
  { key: 'reads', label: 'Reads', end: true, empty: 'Not published' },
];

/** What the list shows: skeleton rows, one answered page, or the error state. */
type ListState =
  { kind: 'loading' } | { kind: 'ready'; list: AdminStoryListDto; now: Date } | { kind: 'failed' };

/**
 * The Stories page (mock docs/mocks/pages/admin-stories/; L2-068; ADR 0097): every story newest
 * activity first with its byline, section, status, when and reads; the three stories longest in
 * review called out above the tabs, with "All {n} in review" when more wait; the tabs All, Draft,
 * In review, Scheduled and Published with their counts; 50 to a page. The address is its state:
 * `status` names the tab and `page` the page, so Back, a reload and a shared link show it again.
 * While it loads, skeleton rows; with no stories, the empty state offers New story; when they do
 * not load, the error state with Try again. Bylines and New story head the page. Headlines and
 * bylines are rendered as text. Admins only: the guard shows a Moderator "Admins only". Its service
 * is this screen's own (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-stories-page',
  imports: [Button, EmptyState, Pagination, ReviewCard, SkeletonRegion, Status, Table, Tabs],
  templateUrl: './stories-page.html',
  styleUrl: './stories-page.scss',
  providers: [{ provide: ADMIN_STORIES_SERVICE, useClass: HttpAdminStoriesService }],
})
export default class AdminStoriesPage {
  private readonly api = inject(ADMIN_STORIES_SERVICE);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  private readonly reload = new Subject<void>();
  /** Whether the next answer is a page asked for from the pagination, so focus follows to the table. */
  private focusTable = false;

  protected readonly query = signal<AdminStoryListQuery>({ status: null, page: 1 });
  protected readonly state = signal<ListState>({ kind: 'loading' });
  protected readonly columns = COLUMNS;

  private readonly answered = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state : null;
  });
  private readonly tabViews = computed(() =>
    storyTabs(this.query(), this.answered()?.list.counts ?? null),
  );
  protected readonly tabs = computed<TabItem[]>(() =>
    this.tabViews().map(({ label, href, count }) => ({ label, href, count })),
  );
  protected readonly currentHref = computed(() => this.tabViews().find((t) => t.current)?.href);
  protected readonly reviewCards = computed(() => {
    const answered = this.answered();
    if (!answered) return [];
    return answered.list.inReview.map((story) => ({
      id: story.id,
      href: `/stories/${story.id}`,
      label: storyReviewLabel(story.submittedAt, answered.now),
      title: story.headline,
      meta: storyByline(story.byline, story.section),
    }));
  });
  /** "All {n} in review", when more wait than are called out (L2-068 AC2). */
  protected readonly moreInReview = computed(() => {
    const answered = this.answered();
    if (!answered) return null;
    const waiting = answered.list.counts.review;
    return waiting > answered.list.inReview.length ? `All ${waiting} in review` : null;
  });
  protected readonly reviewHref = storyListHref({ status: 'review', page: 1 });
  protected readonly rows = computed<TableRow[]>(() => {
    const answered = this.answered();
    return answered ? answered.list.items.map((row) => rowOf(row, answered.now)) : [];
  });
  /** No story at all, whatever the tab: the empty state offers New story. */
  protected readonly none = computed(() => this.answered()?.list.counts.all === 0);
  protected readonly pages = computed(() => {
    const answered = this.answered();
    return answered && answered.list.pageCount > 1
      ? { page: answered.list.page, pageCount: answered.list.pageCount }
      : null;
  });
  protected readonly pageHref = computed(() => {
    const query = this.query();
    return (page: number) => storyListHref({ ...query, page });
  });

  constructor() {
    const query$ = inject(ActivatedRoute).queryParamMap.pipe(map(storyListQueryOf));
    combineLatest([query$, this.reload.pipe(startWith(undefined))])
      .pipe(
        switchMap(([query]) => {
          this.query.set(query);
          return this.api.list(query).pipe(
            map((list): ListState => ({ kind: 'ready', list, now: new Date() })),
            catchError(() => of<ListState>({ kind: 'failed' })),
            startWith<ListState>({ kind: 'loading' }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.state.set(state);
        if (state.kind !== 'loading' && this.focusTable) {
          this.focusTable = false;
          if (state.kind === 'ready') this.focusTableOnceDrawn();
        }
      });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** A plain click on one of the page's links moves in the app; a modified click is the browser's. */
  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate(href);
  }

  protected goToPage(page: number): void {
    this.focusTable = true;
    this.navigate(this.pageHref()(page));
  }

  protected tryAgain(): void {
    this.reload.next();
  }

  /** The status badge's variant for the row `id`. */
  protected statusOf(id: string): AdminStoryRowDto['status'] {
    return this.answered()?.list.items.find((row) => row.id === id)?.status ?? 'draft';
  }

  private focusTableOnceDrawn(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('.table-wrap')?.focus(),
      { injector: this.injector },
    );
  }
}

function rowOf(row: AdminStoryRowDto, now: Date): TableRow {
  return {
    id: row.id,
    name: row.headline,
    cells: {
      story: { text: row.headline, sub: row.byline ?? undefined, href: `/stories/${row.id}` },
      section: { text: storySectionLabel(row.section) },
      status: { text: storyStatusLabel(row.status) },
      when: { text: storyWhen(row.status, row.when, now) },
      reads: { text: storyReadsText(row.reads) ?? '' },
    },
  };
}
