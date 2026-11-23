import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { OwnProfileDto, ProfileApi, UpdateProfileDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link ProfileApi} over HTTP: `GET /api/profile/me` (ADR 0015) and
 * `PUT /api/members/{memberId}/profile` (ADR 0024). A 5xx to the GET opens the server-error screen
 * through the interceptor; every failure passes on to the screen, and a failed save errors with an
 * `ApiError`. It holds no state, and is provided on the Profile screen, so it lives only while the
 * screen does.
 */
@Injectable()
export class HttpProfileService implements ProfileApi {
  private readonly http = inject(HttpClient);

  own(): Observable<OwnProfileDto> {
    return this.http.get<OwnProfileDto>('/api/profile/me');
  }

  update(memberId: string, profile: UpdateProfileDto): Observable<OwnProfileDto> {
    return this.http
      .put<OwnProfileDto>(`/api/members/${encodeURIComponent(memberId)}/profile`, profile)
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
          ),
        ),
      );
  }
}
