import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** `GET /api/events/series/count`: how many series the Series view lists with no filter (L2-050 AC6). */
export interface SeriesCountDto {
  count: number;
}

/** The event series a member browses (L2-050; ADR 0093). */
export interface EventSeriesApi {
  /**
   * How many series the Series view lists with no filter, for "Series (<count>)". Any failure
   * errors with the `HttpErrorResponse`; the switch then reads "Series".
   */
  count(): Observable<SeriesCountDto>;
}

/** Binds {@link EventSeriesApi}; the Events screen provides it on its own route component. */
export const EVENT_SERIES_SERVICE = new InjectionToken<EventSeriesApi>('EVENT_SERIES_SERVICE');
