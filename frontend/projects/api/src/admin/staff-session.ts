import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { SignInRequestDto } from '../account/session';

/** The staff roles of L2-019. */
export type StaffRoleName = 'Admin' | 'Moderator';

/** Who is signed in to the admin app (`GET /api/admin/session`). No contact detail, no password. */
export interface StaffSessionDto {
  memberId: string;
  name: string;
  role: StaffRoleName;
}

/** The second step of staff sign-in (`POST /api/admin/session/two-step`, L2-046). */
export interface TwoStepRequestDto {
  /** The code from the authenticator app, as typed; the API ignores spaces. */
  code: string;
}

/**
 * The staff session of the admin app: who it is, signing in with a password and a code, and
 * signing out (ADR 0011, ADR 0013).
 */
export interface StaffSessionApi {
  /** The current staff session; anyone without one is refused with 401. */
  current(): Observable<StaffSessionDto>;

  /**
   * The password step: completes when the API has started a pending sign-in (202, L2-046 AC1); no
   * session exists until {@link verify}. A refusal errors with an `ApiError`: code
   * `invalid_credentials` (401) for an unknown email or a wrong password, the same for both
   * (L2-018 AC3), `not_staff` (403) for a member without a staff role (L2-018 AC2) and
   * `two_step_not_set_up` (403) for staff without an authenticator (L2-046 AC6).
   */
  signIn(request: SignInRequestDto): Observable<void>;

  /**
   * The second step: the authenticator's code; the answer is the staff session (L2-046 AC2). A
   * refusal errors with an `ApiError`: `invalid_code` (401, AC3), `too_many_attempts` (429, AC4)
   * or `two_step_expired` (401, AC5).
   */
  verify(request: TwoStepRequestDto): Observable<StaffSessionDto>;

  /**
   * Ends the staff session on the server (L2-018 AC6) and completes; a session that had already
   * ended (401) completes too. Any other failure errors with an `ApiError`.
   */
  signOut(): Observable<void>;
}

/** Binds {@link StaffSessionApi}; the admin app's `app.config.ts` provides it. */
export const STAFF_SESSION_SERVICE = new InjectionToken<StaffSessionApi>('STAFF_SESSION_SERVICE');
