import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_DASHBOARD_SERVICE, type ActivityWeekDto } from '@cf/api';
import {
  Button,
  EmptyState,
  SkeletonRegion,
  Table,
  type TableColumn,
  type TableRow,
} from '@cf/components';
import { activityRowsOf, hasActivity } from '@cf/domain';
import { catchError, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminDashboardService } from '../../services/http-admin-dashboard.service';

/** The activity table's columns (mock `admin-dashboard`, "Community"). */
const COLUMNS: readonly TableColumn[] = [
  { key: 'week', label: 'Week of', kind: 'nowrap' },
  { key: 'newMembers', label: 'New members', kind: 'num' },
  { key: 'registrations', label: 'Registrations', kind: 'num' },
  { key: 'messages', label: 'Messages', kind: 'num' },
];

/** What the activity shows: skeleton rows, the weeks, or the error state. */
type ActivityState =
  { kind: 'loading' } | { kind: 'ready'; weeks: ActivityWeekDto[] } | { kind: 'failed' };

/**
 * The Dashboard (mock docs/mocks/pages/admin-dashboard/; L2-020 AC4; ADR 0058), as far as slice
 * 28.1 builds it: the community's activity over the last eight weeks, current week first. While it
 * loads, skeleton rows; with no activity in any week, an empty state; when it does not load, the
 * error state with Try again. The work awaiting staff is slice 28.2's. The service is this
 * screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-dashboard-page',
  imports: [Button, EmptyState, SkeletonRegion, Table],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  providers: [{ provide: ADMIN_DASHBOARD_SERVICE, useClass: HttpAdminDashboardService }],
})
export class AdminDashboardPage {
  private readonly dashboard = inject(ADMIN_DASHBOARD_SERVICE);
  private readonly reload = new Subject<void>();

  protected readonly columns = COLUMNS;
  protected readonly state = signal<ActivityState>({ kind: 'loading' });
  protected readonly rows = computed<TableRow[]>(() => {
    const state = this.state();
    if (state.kind !== 'ready') return [];
    return activityRowsOf(state.weeks).map((row) => ({
      id: row.id,
      name: row.week,
      cells: {
        week: { text: row.week },
        newMembers: { text: row.newMembers },
        registrations: { text: row.registrations },
        messages: { text: row.messages },
      },
      noAction: true,
    }));
  });
  protected readonly quiet = computed(() => {
    const state = this.state();
    return state.kind === 'ready' && !hasActivity(state.weeks);
  });

  constructor() {
    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.state.set({ kind: 'loading' });
          return this.dashboard.activity().pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((activity) =>
        this.state.set(activity ? { kind: 'ready', weeks: activity.weeks } : { kind: 'failed' }),
      );
  }

  protected tryAgain(): void {
    this.reload.next();
  }
}
