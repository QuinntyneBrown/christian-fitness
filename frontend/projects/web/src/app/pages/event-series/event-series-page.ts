import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EVENT_SERIES_SERVICE } from '@cf/api';
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
  Skeleton,
  SkeletonRegion,
} from '@cf/components';
import {
  type SeriesPageView,
  seriesPageViewOf,
  type SeriesPanelView,
  seriesPanelViewOf,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpEventSeriesService } from '../../services/http-event-series.service';

/**
 * Event series at `/events/series/:id` (L2-051; ADR 0096): one series with its wide picture, kind,
 * title, cadence and time over its date range, place over area and summary, its dates in order
 * ("<done> done · <to go> to go", Next up, Cancelled, Details to each session's event page), and
 * an aside with the sign-up panel (read-only until journey 12: spots left and the ways to come, or
 * "You're in for every session") and the "Hosted by" card leading to the host's profile. From LG the aside sits beside the content and
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
  private id = '';
  private request: Subscription | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  protected readonly view = signal<SeriesPageView | null>(null);
  /** The read-only sign-up panel until joining comes (ADR 0096). */
  protected readonly panel = signal<SeriesPanelView>({
    joined: false,
    spots: '',
    plans: [],
    note: '',
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

  /** Opens an address of the app (the host's profile, a session's event page) in the app. */
  protected open(href: string): void {
    void this.router.navigateByUrl(href);
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.series
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (series) => {
          this.view.set(seriesPageViewOf(series));
          this.panel.set(seriesPanelViewOf(series));
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
