import { Component, computed, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EVENT_SERIES_SERVICE, type SeriesRowDto, type SeriesSelection } from '@cf/api';
import {
  Button,
  Checkbox,
  Chip,
  ChipBar,
  EmptyState,
  List,
  SeriesRow,
  SkeletonRegion,
} from '@cf/components';
import {
  seriesCategoryChips,
  seriesFiltered,
  seriesListHref,
  seriesQueryOf,
  type SeriesRowView,
  seriesRowViewOf,
} from '@cf/domain';
import type { Subscription } from 'rxjs';

/** How many skeleton rows stand in while the list loads (mock `events/series-loading`). */
const SKELETON_ROWS = [{ id: '1' }, { id: '2' }, { id: '3' }];

/**
 * The Series view of Events (L2-050; ADR 0093; mocks `events/series*`), created only while the
 * address says `view=series`, so the date feed and the series list never live at once. It reads
 * the category, the search and "Only series I've joined" from the address, as the date view does
 * (ADR 0081), and every new address asks again. It asks
 * for at most 100 series and replaces them on each change, so the list never grows (L2-037).
 * While they load it shows skeleton rows; with none it says so; a 4xx or no answer shows "Series
 * didn't load" with Try again (a 5xx is the server-error screen's). `EVENT_SERIES_SERVICE` is
 * bound by the Events page, and the request goes with this view.
 */
@Component({
  selector: 'cf-event-series-view',
  imports: [Button, Checkbox, Chip, ChipBar, EmptyState, List, SeriesRow, SkeletonRegion],
  templateUrl: './event-series-view.html',
  styleUrl: './event-series-view.scss',
})
export class EventSeriesView {
  private readonly series = inject(EVENT_SERIES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;
  private readonly router = inject(Router);
  /** A row was chosen: the page routes to it. */
  readonly navigate = output<string>();
  /** "Show all series" was pressed: the page clears the search field and the filters. */
  readonly cleared = output<void>();

  protected readonly skeletons = SKELETON_ROWS;
  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  private readonly found = signal<SeriesRowDto[]>([]);
  protected readonly rows = computed<SeriesRowView[]>(() => this.found().map(seriesRowViewOf));
  /** The selection the address holds: category, search and joined (ADR 0093). */
  protected readonly selection = signal<SeriesSelection>({ category: null, q: '', joined: false });
  protected readonly chips = computed(() => seriesCategoryChips(this.selection()));
  /** Whether "Show all series" would change anything (ADR 0093). */
  protected readonly filtered = computed(() => seriesFiltered(this.selection()));

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.selection.set(seriesQueryOf(params));
        this.load();
      });
  }

  /** "Only series I've joined" was ticked or cleared: a new place in history, as a chip is. */
  protected onJoined(joined: boolean): void {
    void this.router.navigateByUrl(seriesListHref({ ...this.selection(), joined }));
  }

  /** Asks for the same selection again, in place. */
  protected retry(): void {
    this.load();
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.found.set([]);
    this.request = this.series
      .list(this.selection())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.found.set(answer.series);
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; anything else shows the failed state.
        error: () => this.state.set('failed'),
      });
  }
}
