import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminDirectoryApi,
  DirectoryListingUpdateDto,
  ListedListingDto,
  ListedListingsDto,
  ListingCheckSlug,
  ListingPhotoDto,
  SuggestionChecksDto,
  SuggestionDecisionDto,
  SuggestionDetailDto,
  SuggestionListDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

const BASE = '/api/admin/directory';

/**
 * {@link AdminDirectoryApi} over HTTP: the console's directory endpoints under
 * `/api/admin/directory` (ADR 0090). A failure errors with an `ApiError` (`apiErrorOf`), so no
 * screen handles an `HttpErrorResponse`. It holds no state.
 */
@Injectable()
export class HttpAdminDirectoryService implements AdminDirectoryApi {
  private readonly http = inject(HttpClient);

  suggestions(after?: string): Observable<SuggestionListDto> {
    const params: Record<string, string> = after ? { after } : {};
    return this.http
      .get<SuggestionListDto>(`${BASE}/suggestions`, { params })
      .pipe(catchError(asApiError));
  }

  listings(after?: string): Observable<ListedListingsDto> {
    const params: Record<string, string> = after ? { after } : {};
    return this.http
      .get<ListedListingsDto>(`${BASE}/listings`, { params })
      .pipe(catchError(asApiError));
  }

  updateListing(id: string, update: DirectoryListingUpdateDto): Observable<ListedListingDto> {
    return this.http
      .put<ListedListingDto>(`${BASE}/listings/${encodeURIComponent(id)}`, update)
      .pipe(catchError(asApiError));
  }

  uploadPhoto(file: File): Observable<ListingPhotoDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ListingPhotoDto>(`${BASE}/photos`, body).pipe(catchError(asApiError));
  }

  suggestion(id: string): Observable<SuggestionDetailDto> {
    return this.http
      .get<SuggestionDetailDto>(`${BASE}/suggestions/${encodeURIComponent(id)}`)
      .pipe(catchError(asApiError));
  }

  setCheck(id: string, check: ListingCheckSlug, passed: boolean): Observable<SuggestionChecksDto> {
    return this.http
      .put<SuggestionChecksDto>(
        `${BASE}/suggestions/${encodeURIComponent(id)}/checks/${encodeURIComponent(check)}`,
        { passed },
      )
      .pipe(catchError(asApiError));
  }

  decline(id: string, reason: string | null): Observable<SuggestionDecisionDto> {
    return this.http
      .post<SuggestionDecisionDto>(`${BASE}/suggestions/${encodeURIComponent(id)}/decline`, {
        reason,
      })
      .pipe(catchError(asApiError));
  }

  approve(id: string): Observable<SuggestionDecisionDto> {
    return this.http
      .post<SuggestionDecisionDto>(`${BASE}/suggestions/${encodeURIComponent(id)}/approve`, null)
      .pipe(catchError(asApiError));
  }

  resendClaimLink(id: string): Observable<void> {
    return this.http
      .post<void>(`${BASE}/suggestions/${encodeURIComponent(id)}/claim-link`, null)
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
