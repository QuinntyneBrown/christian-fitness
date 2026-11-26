import { HttpErrorResponse } from '@angular/common/http';
import type { DialogRef } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EVENT_SERIES_SERVICE, type SeriesDetailDto } from '@cf/api';
import {
  Button,
  Card,
  Container,
  type DescriptionItem,
  DescriptionList,
  EmptyState,
  ErrorPage,
  HostCard,
  Link,
  SeriesPanel,
  SessionList,
  type SessionTick,
  Skeleton,
  SkeletonRegion,
} from '@cf/components';
import {
  dropInBookedOf,
  dropInFullTextOf,
  dropInRefusalOf,
  heldToCome,
  type SeriesPageView,
  seriesPageViewOf,
  seriesCalendarNameOf,
  seriesCalendarOf,
  type SeriesPlan,
  seriesJoinRefusalOf,
  seriesKeptNoteOf,
  seriesPanelViewOf,
  seriesSessionsViewOf,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import type {
  LeaveSeriesDialog,
  LeaveSeriesResult,
} from '../../dialogs/leave-series/leave-series-dialog';
import type { StopDatesDialog, StopDatesResult } from '../../dialogs/stop-dates/stop-dates-dialog';
import { HttpEventSeriesService } from '../../services/http-event-series.service';

/**
 * Event series at `/events/series/:id` (L2-051; ADR 0096): one series with its wide picture, kind,
 * title, cadence and time over its date range, place over area and summary, its dates in order
 * ("<done> done · <to go> to go", Next up, Cancelled, Details to each session's event page), and
 * an aside with the sign-up panel and the "Hosted by" card leading to the host's profile. The
 * panel (L2-052; ADR 0101) offers the ways to come in one radio group, Every session chosen by
 * default, and "Join the series", which holds a place at every session to come and shows the
 * series as the answer has it ("You're in for every session"). From LG the aside sits beside the content and
 * stays in view; below LG it follows in one column (a stylesheet rule). `EVENT_SERIES_SERVICE` is
 * bound here, so the client lives only while the screen does. While it loads it shows skeletons;
 * a series that does not open (404) shows the not-found screen; any other failure shows "This
 * series didn't load" with Try again and All events (a 5xx is the server-error screen's).
 */
@Component({
  selector: 'cf-event-series-page',
  imports: [
    Button,
    Card,
    Container,
    DescriptionList,
    EmptyState,
    ErrorPage,
    HostCard,
    Link,
    SeriesPanel,
    SessionList,
    Skeleton,
    SkeletonRegion,
  ],
  providers: [{ provide: EVENT_SERIES_SERVICE, useClass: HttpEventSeriesService }],
  templateUrl: './event-series-page.html',
  styleUrl: './event-series-page.scss',
})
export default class EventSeriesPage {
  private readonly series = inject(EVENT_SERIES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  /** The Leave the series or Stop going dialog while it shows, or `true` while its code loads: one at a time. */
  private dialog:
    | DialogRef<LeaveSeriesResult, LeaveSeriesDialog>
    | DialogRef<StopDatesResult, StopDatesDialog>
    | true
    | null = null;
  private id = '';
  private request: Subscription | null = null;
  private joinRequest: Subscription | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  protected readonly view = signal<SeriesPageView | null>(null);
  /** The series as the API last answered it, which the sign-up panel words. */
  private readonly detail = signal<SeriesDetailDto | null>(null);
  /** The way the member chose on the panel, none until they choose. */
  private readonly plan = signal<SeriesPlan | null>(null);
  /** The ids of the dates ticked to drop in on (L2-053 AC1; ADR 0102). */
  private readonly picked = signal<ReadonlySet<string>>(new Set());
  protected readonly joining = signal(false);
  protected readonly joinFailed = signal(false);
  /** Whether the ticked dates' registration waits (ADR 0102). */
  private readonly registering = signal(false);
  /** "Sat May 9 is full. Untick it and try again." after an `event_full` refusal; else none. */
  protected readonly fullDates = signal<string | null>(null);
  /** Whether the member is changing the dates they hold ("Change dates"; ADR 0102). */
  protected readonly changing = signal(false);
  /** The ids of the dates to come the member holds. */
  private readonly held = computed(() =>
    heldToCome(this.detail()?.sessions ?? []).map((session) => session.id),
  );
  /** While changing: whether the ticks differ from the dates held. */
  private readonly changed = computed(() => {
    const held = this.held();
    const picked = this.picked();
    return held.length !== picked.size || held.some((id) => !picked.has(id));
  });
  /** The booked panel once dates are held and the series is not joined (L2-053 AC3). */
  protected readonly booked = computed(() => {
    const detail = this.detail();
    return detail && !this.changing() ? dropInBookedOf(detail) : null;
  });
  /** Right after a join, which dates already booked keep the drop-in price (AC4). */
  protected readonly keptNote = signal<string | null>(null);
  protected readonly chatHref = computed(
    () => `/events/series/${encodeURIComponent(this.id)}/chat`,
  );
  protected readonly panel = computed(() => {
    const detail = this.detail();
    return detail
      ? seriesPanelViewOf(detail, {
          plan: this.plan(),
          joining: this.joining(),
          picked: this.picked().size,
          registering: this.registering(),
          changing: this.changing(),
          changed: this.changed(),
        })
      : {
          joined: false,
          confirmed: '',
          payNote: null,
          progress: null,
          spots: '',
          plans: [],
          action: null,
          note: '',
        };
  });
  /**
   * Whether the session list shows tick boxes: drop-in is the way chosen on the panel, or a joined
   * member changes their dates.
   */
  private readonly picking = computed(
    () =>
      (this.changing() && (this.detail()?.joined ?? false)) ||
      this.panel().plans.some((p) => p.value === 'drop' && p.checked),
  );
  /** The session rows, with "Drop in" tick boxes while dates are picked (ADR 0102). */
  protected readonly sessionRows = computed(() => {
    const detail = this.detail();
    return detail
      ? seriesSessionsViewOf(
          detail.sessions,
          this.picking() ? { picked: this.picked() } : null,
          detail.joined,
        ).rows
      : [];
  });
  protected readonly facts = computed<DescriptionItem[]>(() => {
    const view = this.view();
    return view
      ? [
          { term: view.when, detail: view.range, icon: 'calendar' },
          { term: view.place, detail: view.area, icon: 'pin' },
        ]
      : [];
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.dialog && this.dialog !== true) this.dialog.close(null);
    });
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = params.get('id') ?? '';
        this.load();
      });
  }

  /** Asks for the series again, in place. */
  protected retry(): void {
    this.load();
  }

  /** The member chose a way to come. */
  protected choose(value: string): void {
    this.plan.set(value === 'drop' ? 'drop' : 'all');
  }

  /** "Change dates": the dates held ticked, drop-in chosen (L2-053 AC4; ADR 0102). */
  protected changeDates(): void {
    this.picked.set(new Set(this.held()));
    this.plan.set('drop');
    this.fullDates.set(null);
    this.joinFailed.set(false);
    this.changing.set(true);
  }

  /** "Cancel": back to the dates held, nothing changed. */
  protected cancelChange(): void {
    this.endChange();
  }

  /** The member ticked or unticked a date (L2-053 AC1). */
  protected tick(change: SessionTick): void {
    this.picked.update((picked) => {
      const next = new Set(picked);
      if (change.checked) next.add(change.value);
      else next.delete(change.value);
      return next;
    });
  }

  /**
   * Joins the series with "Every session" chosen (L2-052 AC2; ADR 0101) and shows the answer in
   * place. A `series_full` refusal shows the series as full (AC5, AC6); any other refusal or no
   * answer shows the generic failure and leaves the button usable (AC7, AC8).
   */
  protected join(): void {
    const action = this.panel().action;
    if (!action || action.disabled) return;
    if (this.picking()) {
      this.register();
      return;
    }
    this.joining.set(true);
    this.joinFailed.set(false);
    this.joinRequest?.unsubscribe();
    this.joinRequest = this.series
      .join(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (series) => {
          const before = this.detail();
          this.keptNote.set(before && seriesKeptNoteOf(before, series));
          this.endChange();
          this.show(series);
          this.joining.set(false);
        },
        error: (error: unknown) => {
          if (seriesJoinRefusalOf(error) === 'full') {
            // The last place went meanwhile (AC5, AC6): show the series as full, asking nothing more.
            this.detail.update((series) => series && { ...series, spotsLeft: 0 });
          } else {
            this.joinFailed.set(true);
          }
          this.joining.set(false);
        },
      });
  }

  /**
   * Registers the member for exactly the ticked dates, all or none (L2-053 AC2, AC3, AC4; ADR
   * 0102), and shows the answer in place: the booked panel. Held dates unticked are asked about
   * first, in the Stop going dialog. An `event_full` refusal names the dates that filled and keeps
   * the ticks; any other refusal or no answer shows the generic failure.
   */
  private register(): void {
    const detail = this.detail();
    if (!detail) return;
    const picked = this.picked();
    const stopped = heldToCome(detail.sessions)
      .filter((session) => !picked.has(session.id))
      .map((session) => session.number);
    if (stopped.length > 0) {
      void this.askToStop(detail, stopped);
      return;
    }
    this.registering.set(true);
    this.joinFailed.set(false);
    this.fullDates.set(null);
    this.joinRequest?.unsubscribe();
    this.joinRequest = this.series
      .setDropIns(this.id, [...this.picked()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (series) => {
          this.endChange();
          this.show(series);
          this.registering.set(false);
        },
        error: (error: unknown) => {
          const refusal = dropInRefusalOf(error);
          if (refusal.kind === 'full') {
            this.fullDates.set(dropInFullTextOf(detail.sessions, refusal.sessions));
          } else {
            this.joinFailed.set(true);
          }
          this.registering.set(false);
        },
      });
  }

  /**
   * Asks, in a dialog loaded on first use, whether to stop going to the held dates unticked (L2-053
   * AC4; ADR 0102). The dialog saves the dates; the page shows the answer, or names the dates that
   * filled meanwhile.
   */
  private async askToStop(series: SeriesDetailDto, stopped: number[]): Promise<void> {
    if (this.dialog) return;
    this.dialog = true;
    this.fullDates.set(null);
    this.joinFailed.set(false);
    const { openStopDatesDialog } = await import('../../dialogs/stop-dates/stop-dates-dialog');
    if (this.destroyRef.destroyed) return;
    const dialog = openStopDatesDialog(this.injector, {
      series,
      sessionIds: [...this.picked()],
      stopped,
    });
    this.dialog = dialog;
    dialog.closed.subscribe((result) => {
      this.dialog = null;
      if (result?.kind === 'saved') {
        this.endChange();
        this.show(result.series);
      } else if (result?.kind === 'full') {
        this.fullDates.set(dropInFullTextOf(series.sessions, result.sessions));
      }
    });
  }

  /** Leaves picking and changing dates: no ticks, no way chosen. */
  private endChange(): void {
    this.changing.set(false);
    this.picked.set(new Set());
    this.plan.set(null);
    this.fullDates.set(null);
  }

  /**
   * Saves one calendar file with every session still to come (L2-052 AC3; ADR 0101), through an
   * object URL revoked as soon as the download starts.
   */
  protected downloadAllDates(): void {
    const series = this.detail();
    if (!series) return;
    const file = new Blob([seriesCalendarOf(series, new Date())], { type: 'text/calendar' });
    const url = URL.createObjectURL(file);
    try {
      const link = this.document.createElement('a');
      link.href = url;
      link.download = seriesCalendarNameOf(series.title);
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Asks, in a dialog loaded on first use, whether to leave the series (L2-052 AC9; ADR 0101);
   * confirming shows the series as the answer has it, in place.
   */
  protected async leave(): Promise<void> {
    const series = this.detail();
    if (!series?.joined || this.dialog) return;
    this.dialog = true;
    const { openLeaveSeriesDialog } =
      await import('../../dialogs/leave-series/leave-series-dialog');
    if (this.destroyRef.destroyed) return;
    const dialog = openLeaveSeriesDialog(this.injector, series);
    this.dialog = dialog;
    dialog.closed.subscribe((left) => {
      this.dialog = null;
      if (left) {
        this.keptNote.set(null);
        this.plan.set(null);
        this.show(left);
      }
    });
  }

  /** Opens an address of the app (the host's profile, a session's event page) in the app. */
  protected open(href: string): void {
    void this.router.navigateByUrl(href);
  }

  private show(series: SeriesDetailDto): void {
    this.view.set(seriesPageViewOf(series));
    this.detail.set(series);
  }

  private load(): void {
    this.request?.unsubscribe();
    this.keptNote.set(null);
    this.state.set('loading');
    this.request = this.series
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (series) => {
          this.show(series);
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; a 404 is "not found", anything else "failed".
        error: (error: unknown) =>
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed',
          ),
      });
  }
}
