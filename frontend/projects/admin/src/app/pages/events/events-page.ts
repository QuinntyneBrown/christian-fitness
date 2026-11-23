import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ADMIN_EVENTS_SERVICE,
  type AdminEventCountsDto,
  type AdminEventDto,
  type AdminEventTab,
  TOASTS_SERVICE,
} from '@cf/api';
import {
  Button,
  EmptyState,
  ErrorState,
  EventTable,
  type EventTableRow,
  Tabs,
  ToastRegion,
} from '@cf/components';
import { adminEventTabOf, adminEventTabs, eventWhen, ToastStore } from '@cf/domain';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminEventsService } from '../../services/http-admin-events.service';

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
 * The Events page (mock docs/mocks/pages/admin-events/; L2-022 AC5, AC6; ADR 0017): every event
 * soonest first under All, Published and Draft, the tab named by the URL's `status`. Switching tabs
 * moves without reloading and asks for that tab again. While the list loads, skeleton rows; with
 * none, the empty state; when it does not load, the error state with Try again. New event opens
 * the event editor, imported on first use; a saved draft says so in a toast and the list reloads.
 * Its services are this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-events-page',
  imports: [Button, EmptyState, ErrorState, EventTable, Tabs, ToastRegion],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
  providers: [
    { provide: ADMIN_EVENTS_SERVICE, useClass: HttpAdminEventsService },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
})
export class AdminEventsPage {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly toasts = inject(TOASTS_SERVICE);

  private readonly reload = new Subject<void>();
  private editorOpen = false;

  protected readonly tab = signal<AdminEventTab>('all');
  /** The last counts the API gave; none until the first answer. */
  private readonly counts = signal<AdminEventCountsDto | null>(null);
  protected readonly state = signal<ListState>({ kind: 'loading' });

  protected readonly tabs = computed(() =>
    adminEventTabs(this.tab(), this.state().kind === 'loading' ? null : this.counts()),
  );
  protected readonly rows = computed<EventTableRow[]>(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.events.map(rowOf) : [];
  });
  protected readonly empty = computed(() => EMPTY[this.tab()]);

  constructor() {
    const tab$ = inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => adminEventTabOf(params.get('status'))),
    );
    combineLatest([tab$, this.reload.pipe(startWith(undefined))])
      .pipe(
        switchMap(([tab]) => {
          this.tab.set(tab);
          this.state.set({ kind: 'loading' });
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

  protected tryAgain(): void {
    this.reload.next();
  }

  protected async newEvent(): Promise<void> {
    if (this.editorOpen) return;
    this.editorOpen = true;
    // The editor and CDK Dialog load on the first New event, not with the page.
    const { openEventEditor } = await import('../../dialogs/event-editor/event-editor-dialog');
    if (this.destroyRef.destroyed) return;
    openEventEditor(this.injector)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((created) => {
        this.editorOpen = false;
        if (!created) return;
        this.toasts.show('Draft saved', `${created.title} isn't visible to members yet.`);
        this.reload.next();
      });
  }
}

function rowOf(event: AdminEventDto): EventTableRow {
  return {
    id: event.id,
    title: event.title,
    place: event.place,
    when: eventWhen(event.startsAt),
    going: event.going,
    capacity: event.capacity,
    status: event.status,
    statusLabel: event.status === 'draft' ? 'Draft' : 'Published',
  };
}
