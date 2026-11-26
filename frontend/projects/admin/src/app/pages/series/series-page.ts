import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ADMIN_SERIES_SERVICE,
  type AdminSeriesDto,
  type AdminSeriesRowDto,
  TOASTS_SERVICE,
} from '@cf/api';
import {
  AdminSessions,
  Button,
  EmptyState,
  type PickCardItem,
  PickCards,
  SeriesSummaryCard,
  Skeleton,
  SkeletonRegion,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import {
  adminSeriesViewOf,
  sessionAddedTitleOf,
  sessionChangeTitleOf,
  seriesPickCardOf,
  seriesRowOf,
  toldTextOf,
  ToastStore,
} from '@cf/domain';
import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { HttpAdminSeriesService } from '../../services/http-admin-series.service';

/** What the list shows: skeletons, the series, or the error state. */
type ListState =
  { kind: 'loading' } | { kind: 'ready'; rows: readonly AdminSeriesRowDto[] } | { kind: 'failed' };

/** What the chosen series shows: skeletons, the series, or the error state. */
type SeriesState =
  { kind: 'loading' } | { kind: 'ready'; series: AdminSeriesDto } | { kind: 'failed' };

/**
 * The Event series page (mock docs/mocks/pages/admin-series/; L2-071 AC1 to AC3, AC8; ADR 0091):
 * every series as a pick card by its next session, the one the URL's `id` names chosen (the first
 * when it names none, or one not listed), and the chosen series' summary card and sessions.
 * Choosing a card moves to its link without reloading the page. While the series load,
 * skeletons; with none, the empty state that says what a series is; when they do not load, the
 * error state with Try again, which asks for them again. A Moderator uses it as an Admin does.
 * Its services are this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-series-page',
  imports: [
    AdminSessions,
    Button,
    EmptyState,
    NgTemplateOutlet,
    PickCards,
    SeriesSummaryCard,
    Skeleton,
    SkeletonRegion,
    ToastRegion,
  ],
  templateUrl: './series-page.html',
  styleUrl: './series-page.scss',
  providers: [
    { provide: ADMIN_SERIES_SERVICE, useClass: HttpAdminSeriesService },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
})
export default class AdminSeriesPage {
  private readonly api = inject(ADMIN_SERIES_SERVICE);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly toasts = inject(TOASTS_SERVICE);
  /** True while an editor or Add a date is open, so a second press opens no other. */
  private editorOpen = false;

  /** Asks for the list, and so the chosen series, again. */
  private readonly reload = new Subject<void>();

  protected readonly list = signal<ListState>({ kind: 'loading' });
  protected readonly chosen = signal<SeriesState>({ kind: 'loading' });
  /** The id of the series shown, which its card marks current. */
  protected readonly currentId = signal<string | null>(null);

  protected readonly cards = computed<PickCardItem[]>(() => {
    const list = this.list();
    return list.kind === 'ready' ? list.rows.map(seriesPickCardOf) : [];
  });
  protected readonly view = computed(() => {
    const chosen = this.chosen();
    return chosen.kind === 'ready' ? adminSeriesViewOf(chosen.series) : null;
  });
  protected readonly skeletonCards = [0, 1, 2];
  protected readonly skeletonSessions = [0, 1, 2, 3, 4, 5, 6];
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'success',
      heading: title,
      text,
    })),
  );

  constructor() {
    const id$ = inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('id')));

    // One chain, so no operator that shares a source joins the initial bundle (shareReplay did).
    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() =>
          this.api.list().pipe(
            map((answer): ListState => ({ kind: 'ready', rows: answer.series })),
            catchError(() => of<ListState>({ kind: 'failed' })),
            startWith<ListState>({ kind: 'loading' }),
          ),
        ),
        tap((list) => this.list.set(list)),
        switchMap((list) =>
          list.kind === 'ready'
            ? id$.pipe(
                map((id) => (list.rows.find((row) => row.id === id) ?? list.rows[0])?.id ?? null),
              )
            : of(null),
        ),
        distinctUntilChanged(),
        tap((id) => this.currentId.set(id)),
        switchMap((id) =>
          id === null
            ? of<SeriesState>({ kind: 'loading' })
            : this.api.get(id).pipe(
                map((series): SeriesState => ({ kind: 'ready', series })),
                catchError(() => of<SeriesState>({ kind: 'failed' })),
                startWith<SeriesState>({ kind: 'loading' }),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.chosen.set(state));
  }

  protected choose(id: string): void {
    void this.router.navigate(['/series'], { queryParams: { id } });
  }

  /**
   * New series (L2-071 AC12): opens the series editor; a created series is chosen, the list asked
   * for again and a toast says so.
   */
  protected async newSeries(): Promise<void> {
    if (this.editorOpen) return;
    this.editorOpen = true;
    // The editor and CDK Dialog load on the first New series, not with the page.
    const { openSeriesEditor } = await import('../../dialogs/series-editor/series-editor-dialog');
    if (this.destroyRef.destroyed) return;
    openSeriesEditor(this.injector)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((created) => {
        this.editorOpen = false;
        if (!created) return;
        this.toasts.show(`${created.title} created`, 'Add its first date so members can join.');
        this.choose(created.id);
        this.reload.next();
      });
  }

  /**
   * Edit details (L2-071 AC13): opens the series editor on the series shown; a saved series is
   * shown as saved and a toast says so.
   */
  protected async editDetails(): Promise<void> {
    const chosen = this.chosen();
    if (this.editorOpen || chosen.kind !== 'ready') return;
    this.editorOpen = true;
    const { openSeriesEditorFor } =
      await import('../../dialogs/series-editor/series-editor-dialog');
    if (this.destroyRef.destroyed) return;
    openSeriesEditorFor(this.injector, chosen.series)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.editorOpen = false;
        if (!saved) return;
        this.toasts.show(`${saved.title} updated`, 'Members see the changes now.');
        this.showSaved(saved);
      });
  }

  /** Shows `saved` in place, so its card and the button pressed stay and focus returns to it. */
  private showSaved(saved: AdminSeriesDto): void {
    this.list.update((list) =>
      list.kind === 'ready'
        ? {
            kind: 'ready',
            rows: list.rows.map((row) => (row.id === saved.id ? seriesRowOf(saved) : row)),
          }
        : list,
    );
    this.chosen.set({ kind: 'ready', series: saved });
  }

  /**
   * Add a date (L2-071 AC14): opens the dialog on the series shown; the series is shown as it now
   * is, the new date among its sessions, and a toast says so.
   */
  protected async addDate(): Promise<void> {
    const chosen = this.chosen();
    if (this.editorOpen || chosen.kind !== 'ready') return;
    this.editorOpen = true;
    const { openAddSession } = await import('../../dialogs/add-session/add-session-dialog');
    if (this.destroyRef.destroyed) return;
    openAddSession(this.injector, chosen.series)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((added) => {
        this.editorOpen = false;
        if (!added) return;
        this.toasts.show(sessionAddedTitleOf(added.date), 'It is now listed under Events.');
        this.showSaved(added.series);
      });
  }

  /**
   * Cancel date (L2-071 AC4; ADR 0103): asks in a dialog; a cancelled date is shown as answered,
   * and a toast says how many were told.
   */
  protected async cancelDate(sessionId: string): Promise<void> {
    const chosen = this.chosen();
    if (this.editorOpen || chosen.kind !== 'ready') return;
    const session = chosen.series.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    this.editorOpen = true;
    // The dialog and CDK Dialog load on the first Cancel date, not with the page.
    const { openCancelSession } =
      await import('../../dialogs/cancel-session/cancel-session-dialog');
    if (this.destroyRef.destroyed) return;
    openCancelSession(this.injector, { series: chosen.series, session })
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((change) => {
        this.editorOpen = false;
        if (!change) return;
        this.toasts.show(
          sessionChangeTitleOf(session.startsAt, 'cancelled'),
          toldTextOf(change.told),
        );
        this.showSaved(change.series);
      });
  }

  protected tryAgain(): void {
    this.reload.next();
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }
}
