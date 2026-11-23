import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** An event the member is going to, as the profile's "Going to" lists it (L2-005 AC1). */
export interface UpcomingEventDto {
  eventId: string;
  title: string;
  /** When it starts: an ISO 8601 instant. */
  startsAt: string;
  /** Its picture, or none. */
  imageUrl: string | null;
}

/**
 * The signed-in member's own profile (`GET /api/profile/me`, L2-005 AC1; ADR 0015). A field the
 * member has not given is `null` or an empty list.
 */
export interface OwnProfileDto {
  name: string;
  city: string | null;
  /** When the account was created: an ISO 8601 instant. */
  joinedAt: string;
  bio: string | null;
  /** Optional and sensitive: answered only to its owner. */
  homeChurch: string | null;
  goals: string[];
  /** Interest keys, as in `INTERESTS`. */
  interests: string[];
  /** The events the member is going to, soonest first. */
  upcomingEvents: UpcomingEventDto[];
}

/** A member's profile (ADR 0015). */
export interface ProfileApi {
  /**
   * The signed-in member's own profile. A 5xx opens the server-error screen; any failure errors
   * with the `HttpErrorResponse`, so the screen shows its own failed state.
   */
  own(): Observable<OwnProfileDto>;
}

/** Binds {@link ProfileApi}; the Profile screen provides it on its own route component. */
export const PROFILE_SERVICE = new InjectionToken<ProfileApi>('PROFILE_SERVICE');
