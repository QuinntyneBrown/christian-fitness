import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { InterestKey } from './interests';
import type { SessionDto } from './session';

/** The Join form as the API takes it (`POST /api/account/join`, L2-003). */
export interface JoinRequestDto {
  ageConfirmed: boolean;
  fullName: string;
  email: string;
  password: string;
  /** Optional faith detail: `null` when the visitor left it blank (L2-003 AC4, L2-033 AC1). */
  homeChurch: string | null;
  interests: InterestKey[];
}

/**
 * "Finish your profile" as the API takes it (`POST /api/account/join/google`, L2-003 AC9): the
 * email is the Google account's, kept by the server, and there is no password.
 */
export interface GoogleJoinRequestDto {
  ageConfirmed: boolean;
  fullName: string;
  /** Optional faith detail: `null` when the visitor left it blank (L2-003 AC4, L2-033 AC1). */
  homeChurch: string | null;
  interests: InterestKey[];
}

/** The Google account "Finish your profile" shows (`GET /api/account/google`, L2-003 AC8). */
export interface GoogleAccountDto {
  email: string;
  name: string | null;
}

/** A request for a reset link (`POST /api/account/password-reset`, L2-044). */
export interface PasswordResetRequestDto {
  email: string;
}

/** A reset link's token, as the screen read it from the link's fragment (L2-045 AC1). */
export interface PasswordResetTokenDto {
  token: string;
}

/** The account a usable reset link belongs to (`POST /api/account/password-reset/check`). */
export interface PasswordResetCheckDto {
  email: string;
}

/** A new password set through a reset link (`POST /api/account/password-reset/complete`, L2-045). */
export interface NewPasswordDto {
  token: string;
  password: string;
}

/** Creating a member account, asking for a reset link and choosing a new password through it. */
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

  /**
   * Answers the email of the account a usable link belongs to (L2-045 AC1). A refusal errors with
   * an `ApiError`: code `reset_link_expired` (410) for an unknown, used or expired link (AC4).
   */
  checkPasswordReset(request: PasswordResetTokenDto): Observable<PasswordResetCheckDto>;

  /**
   * Sets the new password and completes on 204; every session of the member has then ended and
   * nobody is signed in (L2-045 AC2, AC3). A refusal errors with an `ApiError`: code
   * `reset_link_expired` (410) for a link that cannot be used, `validation_failed` (400) for a
   * password shorter than 8 characters (AC4, AC5).
   */
  completePasswordReset(request: NewPasswordDto): Observable<void>;

  /**
   * The Google account the visitor came back with, to finish their profile (L2-003 AC8). A refusal
   * errors with an `ApiError`: code `google_email_unverified` (401) when there is none, or its
   * email is not verified (L2-049 AC3).
   */
  pendingGoogle(): Observable<GoogleAccountDto>;

  /** "Change": forgets the Google account at once and completes on 204 (L2-049 AC12). */
  forgetGoogle(): Observable<void>;

  /**
   * Creates the account from the Google account and signs the new member in (L2-003 AC9). A
   * refusal errors with an `ApiError` as {@link join} does, plus `age_not_confirmed` (400) and
   * `google_email_unverified` (401).
   */
  joinWithGoogle(request: GoogleJoinRequestDto): Observable<SessionDto>;
}

/** Binds {@link AccountApi}; the member app's `app.config.ts` provides it. */
export const ACCOUNT_SERVICE = new InjectionToken<AccountApi>('ACCOUNT_SERVICE');
