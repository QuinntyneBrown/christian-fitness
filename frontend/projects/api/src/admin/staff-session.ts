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

/** The staff session of the admin app: who it is, signing in and signing out (ADR 0011). */
export interface StaffSessionApi {
  /** The current staff session; anyone without one is refused with 401. */
  current(): Observable<StaffSessionDto>;

  /**
   * Signs staff in; the answer is their session. A refusal errors with an `ApiError`: code
   * `invalid_credentials` (401) for an unknown email or a wrong password, the same for both
   * (L2-018 AC3), and `not_staff` (403) for a member without a staff role (L2-018 AC2).
   */
  signIn(request: SignInRequestDto): Observable<StaffSessionDto>;

  /**
   * Ends the staff session on the server (L2-018 AC6) and completes; a session that had already
   * ended (401) completes too. Any other failure errors with an `ApiError`.
   */
  signOut(): Observable<void>;
}

/** Binds {@link StaffSessionApi}; the admin app's `app.config.ts` provides it. */
export const STAFF_SESSION_SERVICE = new InjectionToken<StaffSessionApi>('STAFF_SESSION_SERVICE');
