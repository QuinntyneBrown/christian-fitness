import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { InterestKey } from './interests';
import type { SessionDto } from './session';

/** The Join form as the API takes it (`POST /api/account/join`, L2-003). */
export interface JoinRequestDto {
  fullName: string;
  email: string;
  password: string;
  /** Optional faith detail: `null` when the visitor left it blank (L2-003 AC4, L2-033 AC1). */
  homeChurch: string | null;
  interests: InterestKey[];
}

/** A request for a reset link (`POST /api/account/password-reset`, L2-044). */
export interface PasswordResetRequestDto {
  email: string;
}

/** Creating a member account and asking for a reset link. */
export interface AccountApi {
  /**
   * Creates the account; the answer is the new member's session, already signed in. A refusal
   * errors with an `ApiError`: code `email_taken` (409) for an email already registered,
   * `field_too_long` or `validation_failed` (400) for an invalid body (L2-003 AC2, AC6).
   */
  join(request: JoinRequestDto): Observable<SessionDto>;

  /**
   * Asks for a reset link to the email and completes when the API has accepted the request (202),
   * whether or not an account has the email: the answer never says (L2-044 AC2, AC3). A refusal
   * errors with an `ApiError`: code `validation_failed` (400) for a malformed email (AC5).
   */
  requestPasswordReset(request: PasswordResetRequestDto): Observable<void>;
}

/** Binds {@link AccountApi}; the member app's `app.config.ts` provides it. */
export const ACCOUNT_SERVICE = new InjectionToken<AccountApi>('ACCOUNT_SERVICE');
