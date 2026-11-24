import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_EVENTS_SERVICE, type EventRegistrationsDto } from '@cf/api';
import {
  Breadcrumb,
  type BreadcrumbItem,
  Button,
  EmptyState,
  ProgressBar,
  SkeletonRegion,
  Table,
  type TableColumn,
  type TableRow,
} from '@cf/components';
import { capacityUsed, eventWhen } from '@cf/domain';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminEventsService } from '../../services/http-admin-events.service';

/** The table's columns (mock `admin-event-registrations`): who, and when they registered. */
const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Name', kind: 'primary' },
  { key: 'registered', label: 'Registered', kind: 'nowrap' },
];

/** The trail back to the Events page; the current page is last. */
const TRAIL: readonly BreadcrumbItem[] = [
  { label: 'Events', href: '/events' },
  { label: 'Registrations', href: '#' },
];

/** What the page shows: skeleton rows, the event's registrations, or the error state. */
type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; registrations: EventRegistrationsDto }
  | { kind: 'failed' };

/**
 * An event's registrations (mock docs/mocks/pages/admin-event-registrations/; L2-024 AC1; ADR 0036):
 * the capacity used and each registered member's name and registration date, oldest first. While
 * it loads, skeleton rows; with none, the empty state; when it does not load, the error state with
 * Try again. It holds one answer at a time (at most 500 rows) and nothing else about a member.
 * Every part is the design system's: breadcrumb, progress bar, table, skeleton region and empty state.
 * Its service is this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-event-registrations-page',
  imports: [Breadcrumb, Button, EmptyState, ProgressBar, SkeletonRegion, Table],
  templateUrl: './event-registrations-page.html',
  styleUrl: './event-registrations-page.scss',
  providers: [{ provide: ADMIN_EVENTS_SERVICE, useClass: HttpAdminEventsService }],
})
export default class EventRegistrationsPage {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly router = inject(Router);
  private readonly reload = new Subject<void>();

  protected readonly columns = COLUMNS;
  protected readonly trail = TRAIL;
  protected readonly state = signal<PageState>({ kind: 'loading' });

  private readonly registrations = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.registrations : null;
  });
  protected readonly title = computed(() => this.registrations()?.title ?? '');
  protected readonly capacity = computed(() => {
    const registrations = this.registrations();
    return registrations ? capacityUsed(registrations.going, registrations.capacity) : null;
  });
  protected readonly rows = computed<TableRow[]>(() =>
    (this.registrations()?.registrations ?? []).map((row, index) => ({
      id: String(index),
      name: row.name,
      cells: {
        name: { text: row.name },
        registered: { text: eventWhen(row.registeredAt) },
      },
    })),
  );

  constructor() {
    const id$ = inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? ''));
    id$
      .pipe(
        switchMap((id) =>
          this.reload.pipe(
            startWith(undefined),
            switchMap(() => {
              this.state.set({ kind: 'loading' });
              return this.events.registrations(id).pipe(
                map((registrations) => ({ registrations })),
                catchError(() => of({ registrations: null })),
              );
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ registrations }) =>
        this.state.set(registrations ? { kind: 'ready', registrations } : { kind: 'failed' }),
      );
  }

  protected navigate(href: string): void {
    if (href !== '#') void this.router.navigateByUrl(href);
  }

  protected tryAgain(): void {
    this.reload.next();
  }
}
