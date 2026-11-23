import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** The kinds of event (L2-009 AC2), by the names the API reads and writes. */
export type EventCategory = 'run' | 'workout' | 'basketball' | 'mobility' | 'workshop' | 'retreat';

/** Where an event is in its life (L2-022, L2-023). */
export type EventStatus = 'draft' | 'published';

/** A tab of the staff list of events (L2-022 AC5). */
export type AdminEventTab = 'all' | 'published' | 'draft';

/**
 * An event as staff see it (`AdminEventDto`, ADR 0015): the start as an ISO instant in UTC, shown
 * in Toronto; the price in cents (0 is free).
 */
export interface AdminEventDto {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string;
  place: string;
  area: string;
  priceCents: number;
  capacity: number;
  going: number;
  status: EventStatus;
}

/** How many events each tab holds. */
export interface AdminEventCountsDto {
  all: number;
  published: number;
  draft: number;
}

/** `GET /api/admin/events`: every tab's count and the asked tab's events, soonest first, at most 100. */
export interface AdminEventListDto {
  counts: AdminEventCountsDto;
  events: AdminEventDto[];
}

/**
 * `POST /api/admin/events`: the event editor's fields (L2-022 AC1). The start is the Toronto date
 * (`yyyy-MM-dd`) and time (`HH:mm`) staff typed; a price or capacity that is not a number is sent as
 * `null`, for the API to refuse.
 */
export interface CreateEventRequestDto {
  title: string;
  category: EventCategory | '';
  date: string;
  startTime: string;
  place: string;
  area: string;
  priceCents: number | null;
  capacity: number | null;
  summary: string;
}

/** Staff list events and create drafts (L2-022; ADR 0015). */
export interface AdminEventsApi {
  /** The counts of every tab and the events of `tab`. A failure errors with an `ApiError`. */
  list(tab: AdminEventTab): Observable<AdminEventListDto>;

  /**
   * Saves the event as a draft and answers it (201). A refusal errors with an `ApiError`: code
   * `validation_failed` (400) with each failed field's own code in the body's `fieldCodes`, which
   * slice 10.2's invalid state reads.
   */
  create(request: CreateEventRequestDto): Observable<AdminEventDto>;
}

/** Binds {@link AdminEventsApi}; the events page provides it on its routed component. */
export const ADMIN_EVENTS_SERVICE = new InjectionToken<AdminEventsApi>('ADMIN_EVENTS_SERVICE');
