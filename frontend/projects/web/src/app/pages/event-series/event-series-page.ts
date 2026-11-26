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
  /** The Leave the series dialog while it shows, or `true` while its code loads: one at a time. */
  private dialog: DialogRef<LeaveSeriesResult, LeaveSeriesDialog> | true | null = null;
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
        })
      : {
          joined: false,
          payNote: null,
          progress: null,
          spots: '',
          plans: [],
          action: null,
          note: '',
        };
  });
  /** Whether the session list shows tick boxes: drop-in is the way chosen on the panel. */
  private readonly picking = computed(() =>
    this.panel().plans.some((p) => p.value === 'drop' && p.checked),
  );
  /** The session rows, with "Drop in" tick boxes while dates are picked (ADR 0102). */
  protected readonly sessionRows = computed(() => {
    const detail = this.detail();
    return detail
      ? seriesSessionsViewOf(detail.sessions, this.picking() ? { picked: this.picked() } : null)
          .rows
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
