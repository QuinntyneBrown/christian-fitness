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

/** What a member's Google sign-in is started for: the screen it returns to (ADR 0099). */
export type GoogleIntent = 'sign-in' | 'join';

/** Starting a Google sign-in (`POST /api/session/google/start`, L2-049 AC1). */
export interface StartGoogleRequestDto {
  intent: GoogleIntent;
  /** The member route to land on after signing in, kept by the guard (L2-049 AC6). */
  returnUrl?: string | null;
  /** Ask Google to show its account chooser ("Use another account", L2-049 AC13). */
  selectAccount?: boolean;
}

/** Google's authorization address for one attempt; the screen leaves for it (L2-049 AC9). */
export interface GoogleRedirectDto {
  location: string;
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

  /**
   * Starts a Google sign-in and answers Google's address, which the screen leaves for in a
   * full-page redirect. A refusal errors with an `ApiError`: `too_many_attempts` (429) or
   * `google_unavailable` (503) (L2-049 AC7, AC11).
   */
  startGoogle(request: StartGoogleRequestDto): Observable<GoogleRedirectDto>;

  /**
   * Finishes the Google sign-in the API's callback kept, signing the member in. A refusal errors
   * with an `ApiError`: `google_email_unverified` (401), `no_account` (404, with the `account`),
   * `account_suspended` (403) (L2-004 AC8 to AC10, L2-049 AC11).
   */
  completeGoogle(): Observable<SessionDto>;
}

/** Binds {@link SessionApi}; the member app's `app.config.ts` provides it. */
export const SESSION_SERVICE = new InjectionToken<SessionApi>('SESSION_SERVICE');
