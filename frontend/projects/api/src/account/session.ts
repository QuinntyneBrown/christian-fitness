import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** Who is signed in (`GET /api/session`). No contact detail and no password. */
export interface SessionDto {
  memberId: string;
  name: string;
}

/** The signed-in member's session. Sign-in and sign-out join it in slice 3.1. */
export interface SessionApi {
  /** The current session; a visitor is refused with 401. */
  current(): Observable<SessionDto>;
}

/** Binds {@link SessionApi}; the member app's `app.config.ts` provides it. */
export const SESSION_SERVICE = new InjectionToken<SessionApi>('SESSION_SERVICE');
