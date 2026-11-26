import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_EVENTS_SERVICE, type EventAttendanceDto, TOASTS_SERVICE } from '@cf/api';
import {
  Breadcrumb,
  type BreadcrumbItem,
  Button,
  Checkbox,
  EmptyState,
  SkeletonRegion,
  Table,
  type TableColumn,
  type TableRow,
  Tabs,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import {
  attendanceNotStartedTextOf,
  attendanceStatusOf,
  AttendanceTracker,
  eventTabsOf,
  ToastStore,
} from '@cf/domain';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminEventsService } from '../../services/http-admin-events.service';

/** The table's columns (mock `admin-event-attendance`): who, and their Came box. */
const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Name', kind: 'primary' },
  { key: 'came', label: 'Came', kind: 'custom' },
];

/** The trail back to the Events page; the current page is last. */
const TRAIL: readonly BreadcrumbItem[] = [
  { label: 'Events', href: '/events' },
  { label: 'Attendance', href: '#' },
];

/** What the page shows: skeleton rows, the event's attendance, or the error state. */
type PageState =
  { kind: 'loading' } | { kind: 'ready'; attendance: EventAttendanceDto } | { kind: 'failed' };

/**
 * An event's attendance (mock docs/mocks/pages/admin-event-attendance/; L2-080; ADR 0106): the
 * event's tabs, then, once it has started, everyone registered by name with a Came box and "Came:
 * <n> of <registered>" in a polite status line. A tick saves at once through
 * {@link AttendanceTracker}: "Saving <name>…" and the box busy while it saves; a failure puts the
 * box back with a danger toast, focus left on it. Before the start it says when attendance opens;
 * with nobody registered, the empty state; while it loads, skeleton rows; when it does not load,
 * the error state with Try again. Admins and Moderators open it. Every part is the design
 * system's. Its services are this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-event-attendance-page',
  imports: [Breadcrumb, Button, Checkbox, EmptyState, SkeletonRegion, Table, Tabs, ToastRegion],
  templateUrl: './event-attendance-page.html',
  styleUrl: './event-attendance-page.scss',
  providers: [
    { provide: ADMIN_EVENTS_SERVICE, useClass: HttpAdminEventsService },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
    AttendanceTracker,
  ],
})
export default class EventAttendancePage {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly router = inject(Router);
  private readonly reload = new Subject<void>();
  private readonly id = signal('');
  protected readonly tracker = inject(AttendanceTracker);
  protected readonly toasts = inject(TOASTS_SERVICE);

  protected readonly columns = COLUMNS;
  protected readonly trail = TRAIL;
  protected readonly state = signal<PageState>({ kind: 'loading' });
  protected readonly tabs = computed(() => eventTabsOf(this.id()));
  protected readonly current = computed(() => this.tabs()[1].href);

  private readonly attendance = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.attendance : null;
  });
  protected readonly title = computed(() => this.attendance()?.title ?? '');
  protected readonly notStarted = computed(() => {
    const attendance = this.attendance();
    return attendance && !attendance.started
      ? attendanceNotStartedTextOf(attendance.title, attendance.startsAt, attendance.registered)
      : null;
  });
  private readonly boxes = computed(
    () => new Map(this.tracker.rows().map((row) => [row.memberId, row])),
  );
  protected readonly status = computed(() =>
    attendanceStatusOf(
      this.tracker.came(),
      this.attendance()?.registered ?? 0,
      this.tracker.saving(),
    ),
  );
  // The rows change only when the list is loaded, so a tick redraws its own box and nothing else.
  protected readonly rows = computed<TableRow[]>(() =>
    (this.attendance()?.items ?? []).map((item) => ({
      id: item.memberId,
      name: item.name,
      cells: { name: { text: item.name } },
    })),
  );
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'danger',
      heading: title,
      text,
    })),
  );

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => params.get('id') ?? ''),
        switchMap((id) => {
          this.id.set(id);
          return this.reload.pipe(
            startWith(undefined),
            switchMap(() => {
              this.state.set({ kind: 'loading' });
              return this.events.attendance(id).pipe(
                map((attendance) => ({ attendance })),
                catchError(() => of({ attendance: null })),
              );
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ attendance }) => {
        if (attendance) this.tracker.load(attendance.eventId, attendance.items);
        this.state.set(attendance ? { kind: 'ready', attendance } : { kind: 'failed' });
      });
  }

  /** Whether the box of row `id` is ticked. */
  protected cameOf(id: string): boolean {
    return this.boxes().get(id)?.came ?? false;
  }

  /** Whether the box of row `id` is saving. */
  protected busyOf(id: string): boolean {
    return this.boxes().get(id)?.busy ?? false;
  }

  protected tick(id: string, came: boolean): void {
    this.tracker.tick(id, came);
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }

  protected navigate(href: string): void {
    if (href !== '#') void this.router.navigateByUrl(href);
  }

  protected tryAgain(): void {
    this.reload.next();
  }
}
