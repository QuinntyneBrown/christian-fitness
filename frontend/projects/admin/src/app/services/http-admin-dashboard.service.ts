import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AdminDashboardApi, CommunityActivityDto, WorkAwaitingStaffDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AdminDashboardApi} over HTTP: `GET /api/admin/dashboard/activity` (ADR 0058). A failure
 * errors with an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds
 * no state.
 */
@Injectable()
export class HttpAdminDashboardService implements AdminDashboardApi {
  private readonly http = inject(HttpClient);

  activity(): Observable<CommunityActivityDto> {
    return this.http
      .get<CommunityActivityDto>('/api/admin/dashboard/activity')
      .pipe(catchError(asApiError));
  }

  awaiting(): Observable<WorkAwaitingStaffDto> {
    return this.http
      .get<WorkAwaitingStaffDto>('/api/admin/dashboard/awaiting')
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
