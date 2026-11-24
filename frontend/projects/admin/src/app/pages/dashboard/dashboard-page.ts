import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_DASHBOARD_SERVICE, type ActivityWeekDto, type WorkAwaitingStaffDto } from '@cf/api';
import {
  Button,
  EmptyState,
  Link,
  List,
  Skeleton,
  SkeletonRegion,
  Table,
  type TableColumn,
  type TableRow,
} from '@cf/components';
import {
  activityRowsOf,
  awaitingMoreOf,
  awaitingRowsOf,
  awaitingTotalOf,
  hasActivity,
  seesApplications,
} from '@cf/domain';
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

/** What the waiting work shows: skeleton rows, what waits, or the error state. */
type AttentionState =
  { kind: 'loading' } | { kind: 'ready'; awaiting: WorkAwaitingStaffDto } | { kind: 'failed' };

/**
 * The Dashboard (mock docs/mocks/pages/admin-dashboard/; L2-020 AC4 to AC10; ADR 0000, ADR 0060).
 * "Needs attention" lists the oldest pending applications and flagged members, each with the link
 * that resolves it (a Moderator's answer has no applications); "Community activity" is the last
 * eight weeks, current week first. Each section loads, empties and fails on its own, with Try
 * again that asks only for itself. The service is this screen's own, provided here (AGENTS.md,
 * "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-dashboard-page',
  imports: [Button, EmptyState, Link, List, Skeleton, SkeletonRegion, Table],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  providers: [{ provide: ADMIN_DASHBOARD_SERVICE, useClass: HttpAdminDashboardService }],
})
export class AdminDashboardPage {
  private readonly dashboard = inject(ADMIN_DASHBOARD_SERVICE);
  private readonly reload = new Subject<void>();
  private readonly reloadAttention = new Subject<void>();

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
  protected readonly attention = signal<AttentionState>({ kind: 'loading' });
  protected readonly attentionRows = computed(() => {
    const state = this.attention();
    return state.kind === 'ready' ? awaitingRowsOf(state.awaiting) : [];
  });
  protected readonly attentionMore = computed(() => {
    const state = this.attention();
    return state.kind === 'ready' ? awaitingMoreOf(state.awaiting) : [];
  });
  protected readonly attentionCount = computed(() => {
    const state = this.attention();
    return state.kind === 'ready' ? awaitingTotalOf(state.awaiting) : null;
  });
  protected readonly caughtUpText = computed(() => {
    const state = this.attention();
    return state.kind === 'ready' && !seesApplications(state.awaiting)
      ? 'New member reports show up here as they come in.'
      : 'New applications and member reports show up here as they come in.';
  });
  protected readonly quiet = computed(() => {
    const state = this.state();
    return state.kind === 'ready' && !hasActivity(state.weeks);
  });

  constructor() {
    this.reloadAttention
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.attention.set({ kind: 'loading' });
          return this.dashboard.awaiting().pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((awaiting) =>
        this.attention.set(awaiting ? { kind: 'ready', awaiting } : { kind: 'failed' }),
      );
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

  protected tryAgainAttention(): void {
    this.reloadAttention.next();
  }

  protected tryAgain(): void {
    this.reload.next();
  }
}
