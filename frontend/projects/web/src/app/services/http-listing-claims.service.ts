import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ClaimAnswerDto, ListingClaimDto, ListingClaimsApi } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link ListingClaimsApi} over HTTP: `GET /api/claims/{token}` and its `publish` and `decline`
 * (ADR 0091). A refusal errors with an `ApiError`. It holds no state, and each claim page provides
 * it, so it lives only while the page does.
 */
@Injectable()
export class HttpListingClaimsService implements ListingClaimsApi {
  private readonly http = inject(HttpClient);

  get(token: string): Observable<ListingClaimDto> {
    return this.http.get<ListingClaimDto>(pathOf(token)).pipe(catchError(asApiError));
  }

  publish(token: string): Observable<ClaimAnswerDto> {
    return this.http
      .post<ClaimAnswerDto>(`${pathOf(token)}/publish`, null)
      .pipe(catchError(asApiError));
  }

  decline(token: string): Observable<ClaimAnswerDto> {
    return this.http
      .post<ClaimAnswerDto>(`${pathOf(token)}/decline`, null)
      .pipe(catchError(asApiError));
  }
}

function pathOf(token: string): string {
  return `/api/claims/${encodeURIComponent(token)}`;
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
