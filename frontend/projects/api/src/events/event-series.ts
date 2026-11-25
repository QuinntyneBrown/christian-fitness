import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory, EventHostDto } from '../admin/admin-events';
import type { AdminSessionState, SeriesCadenceDto } from '../admin/admin-series';

/** `GET /api/events/series/count`: how many series the Series view lists with no filter (L2-050 AC6). */
export interface SeriesCountDto {
  count: number;
}

/**
 * One series as the member's Series view lists it (`SeriesRowDto`, L2-050 AC1; ADR 0093). Times
 * are ISO instants in UTC, which the app words in Toronto; `sessions` holds one state a session in
 * date order, as the API's clock decides it (ADR 0091).
 */
export interface SeriesRowDto {
  id: string;
  title: string;
  category: EventCategory;
  /** The key of its picture (`GET /api/events/images/{key}`), or none. */
  imageKey: string | null;
  host: EventHostDto;
  area: string;
  cadence: SeriesCadenceDto;
  /** The next session's start. */
  startsAt: string;
  /** The first and last held dates' starts. */
  firstStartsAt: string;
  lastStartsAt: string;
  sessions: AdminSessionState[];
  /** The price of the whole series in cents; 0 is free. */
  priceCents: number;
  /** The signed-in member has joined it. */
  joined: boolean;
}

/** `GET /api/events/series`: at most 100 rows, by next session. */
export interface SeriesListDto {
  series: SeriesRowDto[];
}

/**
 * Which series the list asks for (ADR 0093): a category or All, a trimmed search or none, and
 * whether only the signed-in member's (the server knows whose from the session).
 */
export interface SeriesSelection {
  category: EventCategory | null;
  /** Text the title must contain, in any case; empty for none. */
  q: string;
  /** Only series the signed-in member has joined. */
  joined: boolean;
}

/** The event series a member browses (L2-050; ADR 0093). */
export interface EventSeriesApi {
  /**
   * The listed series narrowed by `selection`. A 5xx opens the server-error screen; any failure
   * errors with the `HttpErrorResponse`, so the view shows its own failed state.
   */
  list(selection: SeriesSelection): Observable<SeriesListDto>;

  /**
   * How many series the Series view lists with no filter, for "Series (<count>)". Any failure
   * errors with the `HttpErrorResponse`; the switch then reads "Series".
   */
  count(): Observable<SeriesCountDto>;
}

/** Binds {@link EventSeriesApi}; the Events screen provides it on its own route component. */
export const EVENT_SERIES_SERVICE = new InjectionToken<EventSeriesApi>('EVENT_SERIES_SERVICE');
