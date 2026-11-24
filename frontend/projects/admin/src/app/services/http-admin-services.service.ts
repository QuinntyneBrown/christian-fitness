import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminListingDto,
  AdminListingsDto,
  AdminServicesApi,
  ApplicationDecisionDto,
  PendingApplicationsDto,
  UpdateListingDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

const QUEUE = '/api/admin/services/applications';
const LISTINGS = '/api/admin/services/listings';

/**
 * {@link AdminServicesApi} over HTTP: `GET /api/admin/services/applications` (ADR 0048) and
 * `POST .../{id}/approve` and `.../{id}/decline` (ADR 0049), and `GET` and `PUT
 * /api/admin/services/listings` (ADR 0054). A failure
 * errors with an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds
 * no state.
 */
@Injectable()
export class HttpAdminServicesService implements AdminServicesApi {
  private readonly http = inject(HttpClient);

  applications(): Observable<PendingApplicationsDto> {
    return this.http.get<PendingApplicationsDto>(QUEUE).pipe(catchError(asApiError));
  }

  approve(id: string): Observable<ApplicationDecisionDto> {
    return this.http
      .post<ApplicationDecisionDto>(`${QUEUE}/${encodeURIComponent(id)}/approve`, null)
      .pipe(catchError(asApiError));
  }

  decline(id: string, reason: string): Observable<ApplicationDecisionDto> {
    return this.http
      .post<ApplicationDecisionDto>(`${QUEUE}/${encodeURIComponent(id)}/decline`, { reason })
      .pipe(catchError(asApiError));
  }

  listings(): Observable<AdminListingsDto> {
    return this.http.get<AdminListingsDto>(LISTINGS).pipe(catchError(asApiError));
  }

  updateListing(id: string, listing: UpdateListingDto): Observable<AdminListingDto> {
    return this.http
      .put<AdminListingDto>(`${LISTINGS}/${encodeURIComponent(id)}`, listing)
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
