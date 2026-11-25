import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminDirectoryApi,
  ListingCheckSlug,
  SuggestionChecksDto,
  SuggestionDetailDto,
  SuggestionListDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

const BASE = '/api/admin/directory';

/**
 * {@link AdminDirectoryApi} over HTTP: the console's directory endpoints under
 * `/api/admin/directory` (ADR 0087). A failure errors with an `ApiError` (`apiErrorOf`), so no
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
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
