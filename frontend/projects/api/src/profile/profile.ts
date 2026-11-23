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
  /** The member's id: the profile to write (ADR 0024). */
  memberId: string;
  name: string;
  city: string | null;
  /** When the account was created: an ISO 8601 instant. */
  joinedAt: string;
  bio: string | null;
  /** Optional and sensitive: answered only to its owner. */
  homeChurch: string | null;
  /** Whether other members may see the home church; false until the member shows it (L2-006 AC4). */
  showHomeChurch: boolean;
  goals: string[];
  /** Interest keys, as in `INTERESTS`. */
  interests: string[];
  /** The events the member is going to, soonest first. */
  upcomingEvents: UpcomingEventDto[];
}

/**
 * A member's profile as the Edit profile dialog saves it (`PUT /api/members/{memberId}/profile`,
 * L2-006; ADR 0024): every value trimmed, a blank optional one `null`, goals without blank lines.
 */
export interface UpdateProfileDto {
  name: string;
  city: string | null;
  homeChurch: string | null;
  showHomeChurch: boolean;
  bio: string | null;
  goals: string[];
  /** Interest keys, as in `INTERESTS`. */
  interests: string[];
}

/** A member's profile (ADR 0015, ADR 0024). */
export interface ProfileApi {
  /**
   * The signed-in member's own profile. A 5xx opens the server-error screen; any failure errors
   * with the `HttpErrorResponse`, so the screen shows its own failed state.
   */
  own(): Observable<OwnProfileDto>;

  /**
   * Saves the member's own profile and answers it as saved (L2-006 AC2). A refusal or no answer
   * errors with an `ApiError`: 400 `field_too_long`, `too_many_goals` or `validation_failed` for a
   * value over its limit (AC3), 403 `forbidden` for another member's id (AC5), status 0 for none.
   */
  update(memberId: string, profile: UpdateProfileDto): Observable<OwnProfileDto>;
}

/**
 * Binds {@link ProfileApi}; the Profile screen provides it on its own route component, and the Edit
 * profile dialog it opens uses the same one.
 */
export const PROFILE_SERVICE = new InjectionToken<ProfileApi>('PROFILE_SERVICE');
