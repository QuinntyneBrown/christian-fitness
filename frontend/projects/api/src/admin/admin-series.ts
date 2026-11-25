import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory, EventHostDto } from './admin-events';

/**
 * How often a series meets, as numbers (ADR 0091): the Toronto weekday (0 Sunday to 6 Saturday)
 * when its held dates meet weekly, else none, and how many dates are held. The app words it.
 */
export interface SeriesCadenceDto {
  weekday: number | null;
  dates: number;
}

/**
 * One series in Event series (`GET /api/admin/series`, L2-071 AC1): the time is the next held
 * session's start, else the last held one's, else none, as an ISO instant in UTC.
 */
export interface AdminSeriesRowDto {
  id: string;
  title: string;
  cadence: SeriesCadenceDto;
  startsAt: string | null;
  joined: number;
  capacity: number;
}

/** `GET /api/admin/series`: every series by its next session, at most 100. */
export interface AdminSeriesListDto {
  series: AdminSeriesRowDto[];
}

/** Where a session stands, decided by the API's clock (ADR 0091). */
export type AdminSessionState = 'done' | 'live' | 'upcoming' | 'cancelled';

/** One dated session: its number among all the series' dates in date order, cancelled ones included. */
export interface AdminSessionDto {
  id: string;
  number: number;
  startsAt: string;
  endsAt: string | null;
  topic: string | null;
  state: AdminSessionState;
}

/** `GET /api/admin/series/{id}` (L2-071 AC2, AC3): the series, its facts and its sessions in date order. */
export interface AdminSeriesDto extends AdminSeriesRowDto {
  category: EventCategory;
  summary: string;
  imageKey: string | null;
  host: EventHostDto;
  firstStartsAt: string | null;
  lastStartsAt: string | null;
  place: string;
  area: string;
  priceCents: number;
  /** The price of one date, or none when members cannot drop in. */
  dropInPriceCents: number | null;
  /** Sessions neither started nor cancelled. */
  sessionsLeft: number;
  /** Sessions not cancelled. */
  sessionsHeld: number;
  sessions: AdminSessionDto[];
}

/** Staff list and open event series (L2-071; ADR 0091); Moderators use it as Admins do. */
export interface AdminSeriesApi {
  /** Every series, by its next session. A failure errors with an `ApiError`. */
  list(): Observable<AdminSeriesListDto>;

  /** One series and its sessions. An unknown id errors with code `not_found` (404). */
  get(id: string): Observable<AdminSeriesDto>;
}

/** Binds {@link AdminSeriesApi}; the Event series page provides it on its routed component. */
export const ADMIN_SERIES_SERVICE = new InjectionToken<AdminSeriesApi>('ADMIN_SERIES_SERVICE');
