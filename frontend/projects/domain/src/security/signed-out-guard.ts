import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import type { CanMatchFn } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import { catchError, map, of } from 'rxjs';

/**
 * Matches a route only for a visitor (ADR 0091): `GET /api/session` answers 401. With a session, or
 * any other failure, it does not match, so the router goes on to the member route of the same
 * address, whose own guard decides. The claim link uses it to show a visitor the signed-out page and
 * a member the claim screen in the member shell.
 */
export const signedOutGuard: CanMatchFn = () =>
  inject(SESSION_SERVICE)
    .current()
    .pipe(
      map(() => false),
      catchError((error: unknown) =>
        of(error instanceof HttpErrorResponse && error.status === 401),
      ),
    );
