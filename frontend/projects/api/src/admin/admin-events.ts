import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ListingKind } from '../directory/directory';

/** The kinds of event (L2-009 AC2), by the names the API reads and writes. */
export type EventCategory = 'run' | 'workout' | 'basketball' | 'mobility' | 'workshop' | 'retreat';

/** Where an event is in its life (L2-022, L2-023). */
export type EventStatus = 'draft' | 'published' | 'cancelled';

/** A tab of the staff list of events (L2-022 AC5). */
export type AdminEventTab = 'all' | 'published' | 'draft';

/**
 * An event as staff see it (`AdminEventDto`, ADR 0021): the start as an ISO instant in UTC, shown
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
  /** The series a session belongs to, which Events tags it with (L2-071 AC6; ADR 0091); none for any other event. */
  series?: { id: string; title: string } | null;
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

/** A Listed directory listing as the editor's Host picker shows it (`EventHostDto`, ADR 0089). */
export interface EventHostDto {
  id: string;
  kind: ListingKind;
  name: string;
}

/** `GET /api/admin/events/hosts?q=`: at most 10 Listed listings whose name holds the search. */
export interface EventHostListDto {
  hosts: EventHostDto[];
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
  /** The image `uploadImage` kept, or none (ADR 0025). */
  imageKey?: string | null;
  /** The chosen host's listing, or none, which the API refuses with `host_required` (ADR 0089). */
  hostListingId: string | null;
}

/** `PUT /api/admin/events/{id}` sends the same fields as `POST` (ADR 0025). */
export type UpdateEventRequestDto = CreateEventRequestDto;

/**
 * An event as the editor opens it (`GET /api/admin/events/{id}`, ADR 0025): the start as the
 * Toronto date (`yyyy-MM-dd`) and time (`HH:mm`), the price in cents, the image key when it has one
 * and how many are going.
 */
export interface AdminEventDetailDto {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  place: string;
  area: string;
  priceCents: number;
  capacity: number;
  summary: string;
  imageKey?: string | null;
  going: number;
  status: EventStatus;
  /** The saved host (ADR 0089). */
  host: EventHostDto;
}

/** One registered member as staff see them: the name and when they registered, nothing else (ADR 0036). */
export interface RegistrationRowDto {
  name: string;
  registeredAt: string;
}

/** `GET /api/admin/events/{id}/registrations`: the capacity, how many are going and the members, oldest first, at most 500. */
export interface EventRegistrationsDto {
  eventId: string;
  title: string;
  capacity: number;
  going: number;
  registrations: RegistrationRowDto[];
}

/** `POST /api/admin/events/images`: the key the image is kept under. */
export interface EventImageDto {
  imageKey: string;
}

/** Staff list events, create drafts, edit events and upload their image (L2-022; ADR 0021, ADR 0025). */
export interface AdminEventsApi {
  /** The counts of every tab and the events of `tab`. A failure errors with an `ApiError`. */
  list(tab: AdminEventTab): Observable<AdminEventListDto>;

  /**
   * Saves the event as a draft and answers it (201). A refusal errors with an `ApiError`: code
   * `validation_failed` (400) with each failed field's own code in the body's `fieldCodes`, which
   * slice 10.2's invalid state reads.
   */
  create(request: CreateEventRequestDto): Observable<AdminEventDto>;

  /** The host a new event starts with: the Christian Fitness team listing (ADR 0089). */
  defaultHost(): Observable<EventHostDto>;

  /**
   * The Listed listings whose name holds `q`, in name order, at most 10; a search under 2
   * characters answers none. A failure errors with an `ApiError` (ADR 0089).
   */
  searchHosts(q: string): Observable<EventHostListDto>;

  /** The event as the editor opens it. An unknown id errors with code `not_found` (404). */
  get(id: string): Observable<AdminEventDetailDto>;

  /**
   * Saves the editor's fields on the event and answers it (200). A refusal errors with an
   * `ApiError`: `validation_failed` with `fieldCodes`, or 409 `capacity_below_going`.
   */
  update(id: string, request: UpdateEventRequestDto): Observable<AdminEventDto>;

  /**
   * Makes a draft visible to members and answers it (200). A refusal errors with an `ApiError`:
   * 409 `event_not_draft`, 404 `not_found`, or 400 `validation_failed` with `fieldCodes.date`
   * `start_in_past` for a draft that has begun (ADR 0026).
   */
  publish(id: string): Observable<AdminEventDto>;

  /**
   * Withdraws a published event and answers it with status `cancelled` (200). A refusal errors with
   * an `ApiError`: 409 `event_not_published`, 404 `not_found` (ADR 0035).
   */
  cancel(id: string): Observable<AdminEventDto>;

  /** The event's registrations (L2-024 AC1; ADR 0036). An unknown id errors with code `not_found` (404). */
  registrations(id: string): Observable<EventRegistrationsDto>;

  /** Keeps a JPEG, PNG or WebP of up to 5 MB and answers its key; else `validation_failed` with `fieldCodes.image`. */
  uploadImage(file: File): Observable<EventImageDto>;
}

/** Binds {@link AdminEventsApi}; the events page provides it on its routed component. */
export const ADMIN_EVENTS_SERVICE = new InjectionToken<AdminEventsApi>('ADMIN_EVENTS_SERVICE');
