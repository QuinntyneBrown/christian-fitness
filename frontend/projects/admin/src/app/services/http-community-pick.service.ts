import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { CommunityPickApi, PickableEventListDto, RecordedPickDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link CommunityPickApi} over HTTP: `/api/admin/community-pick` (ADR 0098). A failure errors with
 * an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpCommunityPickService implements CommunityPickApi {
  private readonly http = inject(HttpClient);

  events(): Observable<PickableEventListDto> {
    return this.http
      .get<PickableEventListDto>('/api/admin/community-pick/events')
      .pipe(catchError(asApiError));
  }

  record(eventId: string, note: string): Observable<RecordedPickDto> {
    return this.http
      .post<RecordedPickDto>('/api/admin/community-pick/picks', { eventId, note })
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
