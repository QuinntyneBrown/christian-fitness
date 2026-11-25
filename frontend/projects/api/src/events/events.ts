import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory } from '../admin/admin-events';
import type { ListingKind } from '../directory/directory';

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
/**
 * The directory listing that hosts an event (`EventHostCardDto`, ADR 0088), as the "Hosted by"
 * card shows it; the app works out the initials.
 */
export interface EventHostCardDto {
  id: string;
  kind: ListingKind;
  name: string;
  isVerified: boolean;
  /** The key of its photo (`GET /api/directory/photos/{key}`), or none: the mark shows initials. */
  photoKey: string | null;
}

export interface EventDetailDto extends EventSummaryDto {
  summary: string;
  /** Who hosts it (L2-010 AC4): every event has a host. */
  host: EventHostCardDto;
  /**
   * The caller's own registration (ADR 0032): `confirmed` for a free event, `reserved` for a paid
   * one, or `null` when they are not registered.
   */
  registration: 'confirmed' | 'reserved' | null;
}

/**
 * Which events the list asks for (ADR 0030, ADR 0081): a category or All, a trimmed search or none,
 * and whether only the signed-in member's registrations (the server knows whose from the session).
 */
export interface EventSelection {
  category: EventCategory | null;
  /** Text the title must contain, in any case; empty for none. */
  q: string;
  /** Only events the signed-in member is going to (L2-076). */
  going: boolean;
}

/** The events a member browses (L2-009; ADR 0027). */
export interface EventsApi {
  /**
   * One page of the published events that have not started, soonest first, 20 to a page, after
   * `cursor` (`null` for the first), narrowed by `selection` (L2-075; ADR 0081). A 5xx to it opens
   * the server-error screen; any failure errors with the `HttpErrorResponse`, so the screen shows
   * its own failed state.
   */
  page(cursor: string | null, selection?: EventSelection): Observable<EventPageDto>;

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

  /**
   * Gives up the signed-in member's place at the event and answers the event as they now see it
   * (L2-012; ADR 0034). A refusal (`event_started`, `event_not_found`) errors with the
   * `HttpErrorResponse`; a 5xx opens the server-error screen.
   */
  cancelRegistration(id: string): Observable<EventDetailDto>;
}

/** Binds {@link EventsApi}; the Events screen provides it on its own route component. */
export const EVENTS_SERVICE = new InjectionToken<EventsApi>('EVENTS_SERVICE');
