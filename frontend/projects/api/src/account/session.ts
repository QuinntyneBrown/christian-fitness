import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** Who is signed in (`GET /api/session`). No contact detail and no password. */
export interface SessionDto {
  memberId: string;
  name: string;
}

/** The sign-in form as the API takes it (`POST /api/session`, L2-004). */
export interface SignInRequestDto {
  email: string;
  password: string;
}

/** The signed-in member's session: who it is, signing in and signing out (ADR 0009). */
export interface SessionApi {
  /** The current session; a visitor is refused with 401. */
  current(): Observable<SessionDto>;

  /**
   * Signs the member in; the answer is their session. A refusal errors with an `ApiError`: code
   * `invalid_credentials` (401) for an unknown email or a wrong password, the same for both
   * (L2-004 AC2).
   */
  signIn(request: SignInRequestDto): Observable<SessionDto>;

  /**
   * Ends the session on the server (L2-004 AC5) and completes; a session that had already ended
   * (401) completes too. Any other failure errors with an `ApiError`.
   */
  signOut(): Observable<void>;
}

/** Binds {@link SessionApi}; the member app's `app.config.ts` provides it. */
export const SESSION_SERVICE = new InjectionToken<SessionApi>('SESSION_SERVICE');
