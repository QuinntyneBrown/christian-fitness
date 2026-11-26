import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ADMIN_EVENTS_SERVICE,
  type AdminEventCountsDto,
  type AdminEventDetailDto,
  type AdminEventDto,
  type AdminEventTab,
  TOASTS_SERVICE,
} from '@cf/api';
import {
  Button,
  EmptyState,
  SkeletonRegion,
  Status,
  Table,
  type TableColumn,
  type TableRow,
  type TabItem,
  Tabs,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import {
  adminEventSubOf,
  adminEventTabOf,
  adminEventTabs,
  eventSavedToast,
  eventWhen,
  ToastStore,
} from '@cf/domain';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import type { EventEditorResult } from '../../dialogs/event-editor/event-editor-dialog';
import { HttpAdminEventsService } from '../../services/http-admin-events.service';

/** The list's columns (mock `admin-events`); the Edit action is the table's last column. */
const COLUMNS: readonly TableColumn[] = [
  { key: 'event', label: 'Event', kind: 'primary' },
  { key: 'date', label: 'Date', kind: 'nowrap' },
  { key: 'registered', label: 'Registered', kind: 'count' },
  { key: 'status', label: 'Status', kind: 'custom' },
];

/** The word each status badge carries. */
const STATUS_WORD: Record<AdminEventDto['status'], string> = {
  draft: 'Draft',
  published: 'Published',
  cancelled: 'Cancelled',
};

/** What the list shows: skeleton rows, the asked tab's events, or the error state. */
type ListState =
  { kind: 'loading' } | { kind: 'ready'; events: readonly AdminEventDto[] } | { kind: 'failed' };

/** The empty state each tab shows when it holds no events (mocks `empty`, `tab-empty`). */
const EMPTY: Record<AdminEventTab, { heading: string; text: string }> = {
  all: {
    heading: 'No events yet',
    text: 'Create the first one. It appears in the member app as soon as you publish it.',
  },
  published: {
    heading: 'Nothing published yet',
    text: 'Publish a draft and it appears here and in the member app.',
  },
  draft: {
    heading: 'No drafts',
    text: 'Save an event as a draft and it waits here until you publish it.',
  },
};

/**
 * The Events page (mock docs/mocks/pages/admin-events/; L2-022 AC5, AC6; ADR 0021): every event
 * soonest first under All, Published and Draft, the tab named by the URL's `status`. Switching tabs
 * moves without reloading and asks for that tab again. While the list loads, skeleton rows; with
 * none, the empty state; when it does not load, the error state with Try again. New event opens
 * the event editor, imported on first use; a saved draft says so in a toast and the list reloads.
 * Every part is the design system's, composed from the library: tabs, table with a status badge,
 * skeleton region, empty and error states, and the admin toast region.
 * Its services are this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-events-page',
  imports: [Button, EmptyState, SkeletonRegion, Status, Table, Tabs, ToastRegion],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
  providers: [
    { provide: ADMIN_EVENTS_SERVICE, useClass: HttpAdminEventsService },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
})
export default class AdminEventsPage {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly toasts = inject(TOASTS_SERVICE);

  /** Asks for the list again; `true` keeps the rows on screen meanwhile (after an edit). */
  private readonly reload = new Subject<boolean>();
  private editorOpen = false;

  protected readonly tab = signal<AdminEventTab>('all');
  /** The last counts the API gave; none until the first answer. */
  private readonly counts = signal<AdminEventCountsDto | null>(null);
  protected readonly state = signal<ListState>({ kind: 'loading' });

  protected readonly columns = COLUMNS;
  private readonly tabViews = computed(() =>
    adminEventTabs(this.tab(), this.state().kind === 'loading' ? null : this.counts()),
  );
  protected readonly tabs = computed<TabItem[]>(() =>
    this.tabViews().map(({ label, href, count }) =>
      count === null ? { label, href } : { label, href, count },
    ),
  );
  protected readonly currentHref = computed(() => this.tabViews().find((t) => t.current)?.href);
  private readonly shownEvents = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.events : [];
  });
  protected readonly rows = computed<TableRow[]>(() => {
    const now = Date.now();
    return this.shownEvents().map((event) => rowOf(event, now));
  });
  protected readonly empty = computed(() => EMPTY[this.tab()]);
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'info',
      heading: title,
      text,
    })),
  );

  constructor() {
    const tab$ = inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => adminEventTabOf(params.get('status'))),
    );
    combineLatest([tab$, this.reload.pipe(startWith(false))])
      .pipe(
        switchMap(([tab, quiet]) => {
          this.tab.set(tab);
          if (!quiet) this.state.set({ kind: 'loading' });
          return this.events.list(tab).pipe(
            map((list) => ({ list })),
            catchError(() => of({ list: null })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ list }) => {
        if (list) this.counts.set(list.counts);
        this.state.set(list ? { kind: 'ready', events: list.events } : { kind: 'failed' });
      });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** The status badge's variant for the row `id`. */
  protected statusOf(id: string): AdminEventDto['status'] {
    return this.shownEvents().find((event) => event.id === id)?.status ?? 'draft';
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }

  protected tryAgain(): void {
    this.reload.next(false);
  }

  protected async newEvent(): Promise<void> {
    if (this.editorOpen) return;
    this.editorOpen = true;
    // The editor and CDK Dialog load on the first New event, not with the page.
    const { openEventEditor } = await import('../../dialogs/event-editor/event-editor-dialog');
    if (this.destroyRef.destroyed) return;
    openEventEditor(this.injector)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.editorOpen = false;
        if (!result) return;
        this.say(result);
        this.reload.next(false);
      });
  }

  /**
   * Opens the editor on the event `id` (L2-022 AC7): the event is loaded first, and one that does
   * not load says so in a toast and opens nothing. A saved change says so in a toast and reloads
   * the list with the rows kept, so focus stays on the row's Edit action.
   */
  protected editEvent(id: string): void {
    if (this.editorOpen) return;
    this.editorOpen = true;
    this.events
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => void this.openEditor(event),
        error: () => {
          this.editorOpen = false;
          this.toasts.show(
            "Couldn't open the event",
            "We couldn't reach the server. Try Edit again in a moment.",
          );
        },
      });
  }

  private say(result: EventEditorResult): void {
    const { title, text } = eventSavedToast(result.event.title, result.outcome);
    this.toasts.show(title, text);
  }

  private async openEditor(event: AdminEventDetailDto): Promise<void> {
    const { openEventEditorFor } = await import('../../dialogs/event-editor/event-editor-dialog');
    if (this.destroyRef.destroyed) return;
    openEventEditorFor(this.injector, event)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.editorOpen = false;
        if (!result) return;
        this.say(result);
        this.reload.next(true);
      });
  }
}

/**
 * A row of the table; a published event still to come also gets "Make it a pick", which opens
 * Community Pick with it chosen (L2-072 AC1; ADR 0098).
 */
function rowOf(event: AdminEventDto, now: number): TableRow {
  const pickable = event.status === 'published' && Date.parse(event.startsAt) > now;
  return {
    id: event.id,
    name: event.title,
    ...(pickable
      ? {
          quietLink: {
            label: 'Make it a pick',
            href: `/community-pick?event=${encodeURIComponent(event.id)}`,
          },
        }
      : {}),
    cells: {
      event: { text: event.title, sub: adminEventSubOf(event) },
      date: { text: eventWhen(event.startsAt) },
      registered: { text: String(event.going), of: String(event.capacity) },
      status: { text: STATUS_WORD[event.status] },
    },
  };
}
