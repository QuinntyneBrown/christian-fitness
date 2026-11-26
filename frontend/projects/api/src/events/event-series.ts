import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory, EventHostDto } from '../admin/admin-events';
import type { AdminSessionState, SeriesCadenceDto } from '../admin/admin-series';
import type { EventHostCardDto } from './events';

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

/**
 * One series as its page shows it (`SeriesDetailDto`, L2-051; ADR 0096). Times are ISO instants in
 * UTC, which the app words in Toronto.
 */
export interface SeriesDetailDto {
  id: string;
  title: string;
  category: EventCategory;
  summary: string;
  /** The key of its picture (`GET /api/events/images/{key}`), or none. */
  imageKey: string | null;
  /** Who hosts it, as the event page's "Hosted by" card has it. */
  host: EventHostCardDto;
  cadence: SeriesCadenceDto;
  /** The next held session's start, else the last held one's. */
  startsAt: string;
  /** The first and last held dates' starts. */
  firstStartsAt: string;
  lastStartsAt: string;
  place: string;
  area: string;
  /** The whole series' price in cents; 0 is free. */
  priceCents: number;
  /** One date's price in cents, or none when members cannot drop in. */
  dropInPriceCents: number | null;
  capacity: number;
  /**
   * The fewest places left among the sessions still to come (ADR 0080), or none when no session
   * is to come.
   */
  spotsLeft: number | null;
  /** How many sessions are still to come (neither cancelled nor started). */
  sessionsLeft: number;
  /** The signed-in member has joined it. */
  joined: boolean;
  /** Every date in date order. */
  sessions: SeriesSessionDto[];
}

/** One date of a series (`SeriesSessionDto`, L2-051 AC2 to AC5; ADR 0096). */
export interface SeriesSessionDto {
  id: string;
  /** Its position among all the dates in date order, cancelled ones included (ADR 0080). */
  number: number;
  startsAt: string;
  /** Its end, or none when it has none (ADR 0101), for the calendar file "All dates" writes. */
  endsAt: string | null;
  topic: string | null;
  /** By the API's clock (ADR 0091); `live` is the next one. */
  state: AdminSessionState;
  /** The signed-in member holds a place at it. */
  held: boolean;
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

  /**
   * One series (L2-051; ADR 0096). A 5xx opens the server-error screen; any failure errors with
   * the `HttpErrorResponse` (404 `series_not_found` for one that does not open), so the page shows
   * its own not-found or failed state.
   */
  get(id: string): Observable<SeriesDetailDto>;

  /**
   * The signed-in member joins the series (`POST /api/events/series/{id}/enrolment`, L2-052 AC2;
   * ADR 0101) and gets it back as they now see it; joining again changes nothing. Any failure
   * errors with an `ApiError`: 409 `series_full`, 403 `account_suspended`, 404
   * `series_not_found`, or `network` (status 0).
   */
  join(id: string): Observable<SeriesDetailDto>;

  /**
   * The signed-in member leaves the series (`DELETE /api/events/series/{id}/enrolment/me`, L2-052
   * AC9; ADR 0101) and gets it back as they now see it; leaving one not joined changes nothing.
   * Any failure errors, and nothing changed.
   */
  leave(id: string): Observable<SeriesDetailDto>;
}

/** Binds {@link EventSeriesApi}; the Events and Event series screens provide it on their own route components. */
export const EVENT_SERIES_SERVICE = new InjectionToken<EventSeriesApi>('EVENT_SERIES_SERVICE');
