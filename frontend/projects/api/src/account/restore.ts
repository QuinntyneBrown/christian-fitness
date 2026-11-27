import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { SessionDto, SignInRequestDto } from './session';

/**
 * Restoring an account that is deleting (L2-066 AC6; ADR 0118), which a sign-in or a Google finish
 * refused `account_deleting` (409, with the `account` and `erasesAt`) offers. `password` restores
 * it with its email and password (`POST /api/account/restore`); `google` with the Google identity
 * the API's callback kept (`POST /api/account/restore/google`). Either signs the member in and
 * answers their session; a refusal errors with an `ApiError`, as signing in does.
 */
export interface AccountRestoreApi {
  password(request: SignInRequestDto): Observable<SessionDto>;
  google(): Observable<SessionDto>;
}

/** Binds {@link AccountRestoreApi}; Sign in provides it on its own route component. */
export const ACCOUNT_RESTORE_SERVICE = new InjectionToken<AccountRestoreApi>(
  'ACCOUNT_RESTORE_SERVICE',
);
