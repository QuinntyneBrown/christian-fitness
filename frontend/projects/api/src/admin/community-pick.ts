import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory } from './admin-events';

/**
 * One event Community Pick offers (`GET /api/admin/community-pick/events`; L2-072 AC1, AC13; ADR
 * 0098): a published event still to come, with what its graphics and captions need. Times are
 * instants; prices are cents; `spotsLeft` is never below 0.
 */
export interface PickableEventDto {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string;
  place: string;
  /** The neighbourhood and city, such as "Waterfront, Toronto". */
  area: string;
  priceCents: number;
  spotsLeft: number;
  /** The key of its picture (`GET /api/events/images/{key}`), or none. */
  imageKey: string | null;
  /** When it was last picked, or none. */
  lastPickedAt: string | null;
}

/** The events, soonest first, and the member app's public address the captions link to. */
export interface PickableEventListDto {
  siteOrigin: string;
  events: PickableEventDto[];
}

/** What `POST /api/admin/community-pick/picks` answers: the pick recorded (L2-072 AC13). */
export interface RecordedPickDto {
  eventId: string;
  pickedAt: string;
}

/**
 * Community Pick's API (ADR 0098). A failure errors with an `ApiError`; `record` is refused with
 * `event_not_found`, `event_not_published` or `field_too_long`.
 */
export interface CommunityPickApi {
  events(): Observable<PickableEventListDto>;
  record(eventId: string, note: string): Observable<RecordedPickDto>;
}

export const COMMUNITY_PICK_SERVICE = new InjectionToken<CommunityPickApi>(
  'COMMUNITY_PICK_SERVICE',
);
