import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventSummaryDto } from '../events/events';

/**
 * What Home shows of events (`HomeDto`, ADR 0044): the earliest published event the member is
 * going to that has not started, or `null`; and up to three published upcoming events that suit
 * their interests and that they are not going to, soonest first.
 */
export interface HomeDto {
  nextEvent: EventSummaryDto | null;
  suggested: EventSummaryDto[];
  unreadCount: number;
}

/** The member's Home (L2-007). */
export interface HomeApi {
  /**
   * The signed-in member's home events. A 5xx opens the server-error screen; any failure errors
   * with the `HttpErrorResponse`, so the screen shows its own failed state.
   */
  home(): Observable<HomeDto>;
}

/** Binds {@link HomeApi}; the Home screen provides it on its own route component. */
export const HOME_SERVICE = new InjectionToken<HomeApi>('HOME_SERVICE');
