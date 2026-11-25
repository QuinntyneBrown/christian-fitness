import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory, EventHostDto, EventHostListDto, EventImageDto } from './admin-events';

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

/**
 * What the series editor sends to create or save a series (L2-071 AC12; ADR 0091): the prices in
 * cents (the series price 0 is free; a drop-in price of `null` is no drop-in), `null` for a number
 * that was not one, which the API refuses with the field's code.
 */
export interface SeriesDraftDto {
  title: string;
  category: EventCategory;
  summary: string;
  imageKey: string | null;
  hostListingId: string | null;
  priceCents: number | null;
  dropInPriceCents: number | null;
  capacity: number | null;
  place: string;
  area: string;
}

/** Staff list, open, create and edit event series (L2-071; ADR 0091); Moderators use it as Admins do. */
export interface AdminSeriesApi {
  /** Every series, by its next session. A failure errors with an `ApiError`. */
  list(): Observable<AdminSeriesListDto>;

  /** One series and its sessions. An unknown id errors with code `not_found` (404). */
  get(id: string): Observable<AdminSeriesDto>;

  /**
   * New series (L2-071 AC12): the series with no dates. A field the API refuses errors with code
   * `validation_failed` (400) naming it in `fieldCodes`.
   */
  create(draft: SeriesDraftDto): Observable<AdminSeriesDto>;

  /**
   * Save changes (L2-071 AC13): the series as saved, its sessions still to come following it. A
   * capacity below the members who joined errors with `capacity_below_joined` (409), a field with
   * `validation_failed` (400) and an unknown series with `not_found` (404).
   */
  update(id: string, draft: SeriesDraftDto): Observable<AdminSeriesDto>;

  /** The host a new series starts with: the Christian Fitness team listing (L2-071 AC10). */
  defaultHost(): Observable<EventHostDto>;

  /** The Listed directory listings whose name matches `q`, for the Host picker (L2-071 AC10). */
  searchHosts(q: string): Observable<EventHostListDto>;

  /** Keeps one image (JPEG, PNG or WebP, up to 5 MB) and answers its key; `image_invalid` otherwise. */
  uploadImage(file: File): Observable<EventImageDto>;
}

/** Binds {@link AdminSeriesApi}; the Event series page provides it on its routed component. */
export const ADMIN_SERIES_SERVICE = new InjectionToken<AdminSeriesApi>('ADMIN_SERIES_SERVICE');
