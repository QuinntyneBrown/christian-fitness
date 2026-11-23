import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory } from '../admin/admin-events';

/** An upcoming event as the landing page shows it (`GET /api/public/events/upcoming`, L2-001). */
export interface LandingEventDto {
  id: string;
  title: string;
  category: EventCategory;
  /** The start as an ISO instant in UTC, which the screen words in Toronto. */
  startsAt: string;
  place: string;
}

/** What a visitor with no session may read (L2-001; ADR 0037). */
export interface PublicEventsApi {
  /**
   * The next published events that have not started, soonest first, at most `take` (never more
   * than 3). A 5xx opens the server-error screen; any failure errors with the `HttpErrorResponse`.
   */
  upcoming(take: number): Observable<LandingEventDto[]>;
}

/** Binds {@link PublicEventsApi}; the landing page provides it on its own route component. */
export const PUBLIC_EVENTS_SERVICE = new InjectionToken<PublicEventsApi>('PUBLIC_EVENTS_SERVICE');
