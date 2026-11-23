import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory } from '../admin/admin-events';

/**
 * An event as a member's list shows it (`EventSummaryDto`, ADR 0027): the start as an ISO instant
 * in UTC, which the screen words in Toronto; the price in cents (0 is free).
 */
export interface EventSummaryDto {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string;
  place: string;
  area: string;
  priceCents: number;
  capacity: number;
  /** How many are going. */
  going: number;
  /** The key of its picture (`GET /api/events/images/{key}`), or none. */
  imageKey: string | null;
}

/** One page of the member list and the cursor that asks for the next, or none on the last. */
export interface EventPageDto {
  events: EventSummaryDto[];
  nextCursor: string | null;
}

/** One event in full (`EventDetailDto`, ADR 0031): the summary's fields and its summary text. */
export interface EventDetailDto extends EventSummaryDto {
  summary: string;
  /**
   * The caller's own registration (ADR 0032): `confirmed` for a free event, `reserved` for a paid
   * one, or `null` when they are not registered.
   */
  registration: 'confirmed' | 'reserved' | null;
}

/** The events a member browses (L2-009; ADR 0027). */
export interface EventsApi {
  /**
   * One page of the published events that have not started, soonest first, 20 to a page, after
   * `cursor` (`null` for the first). A 5xx to it opens the server-error screen; any failure errors
   * with the `HttpErrorResponse`, so the screen shows its own failed state.
   */
  page(cursor: string | null, category?: EventCategory | null): Observable<EventPageDto>;

  /**
   * One published event (L2-010). An unknown or unpublished id fails with a 404 whose `code` is
   * `event_not_found`; a 5xx opens the server-error screen, and any failure errors with the
   * `HttpErrorResponse`.
   */
  get(id: string): Observable<EventDetailDto>;

  /**
   * Takes a place at the event for the signed-in member and answers the event as they now see it
   * (L2-011; ADR 0032); registering again answers the same. A refusal (`event_full`,
   * `account_suspended`, `event_not_found`) errors with the `HttpErrorResponse`; a 5xx opens the
   * server-error screen.
   */
  register(id: string): Observable<EventDetailDto>;
}

/** Binds {@link EventsApi}; the Events screen provides it on its own route component. */
export const EVENTS_SERVICE = new InjectionToken<EventsApi>('EVENTS_SERVICE');
