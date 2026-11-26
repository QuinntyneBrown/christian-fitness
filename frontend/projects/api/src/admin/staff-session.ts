import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { GoogleRedirectDto } from '../account/session';

/** The staff roles of L2-019. */
export type StaffRoleName = 'Admin' | 'Moderator';

/** Who is signed in to the admin app (`GET /api/admin/session`). No contact detail, no password. */
export interface StaffSessionDto {
  memberId: string;
  name: string;
  role: StaffRoleName;
}

/** Starts staff Google sign-in (`POST /api/admin/session/google/start`, L2-018 AC1; ADR 0100). */
export interface StaffGoogleStartDto {
  /** Ask Google to show its account chooser ("Try another Google account", L2-049 AC13). */
  selectAccount: boolean;
}

/**
 * The staff session of the admin app: who it is, signing in with Google Workspace and signing out
 * (ADR 0011, ADR 0100).
 */
export interface StaffSessionApi {
  /** The current staff session; anyone without one is refused with 401. */
  current(): Observable<StaffSessionDto>;

  /**
   * Starts Google sign-in, limited to the team's domain; the answer is Google's authorization
   * address, for the page to leave for. A refusal errors with an `ApiError`: `google_unavailable`
   * (503) while sign-in isn't set up, `too_many_attempts` (429).
   */
  startGoogle(request: StaffGoogleStartDto): Observable<GoogleRedirectDto>;

  /**
   * Finishes Google sign-in with the identity Google sent back; the answer is the staff session
   * (L2-018 AC1). A refusal errors with an `ApiError`: `wrong_domain` or `not_staff` (403, with the
   * Google `account`), `account_suspended` (403), or any other code when it didn't finish.
   */
  completeGoogle(): Observable<StaffSessionDto>;

  /**
   * Ends the staff session on the server (L2-018 AC6) and completes; a session that had already
   * ended (401) completes too. Any other failure errors with an `ApiError`.
   */
  signOut(): Observable<void>;
}

/** Binds {@link StaffSessionApi}; the admin app's `app.config.ts` provides it. */
export const STAFF_SESSION_SERVICE = new InjectionToken<StaffSessionApi>('STAFF_SESSION_SERVICE');
