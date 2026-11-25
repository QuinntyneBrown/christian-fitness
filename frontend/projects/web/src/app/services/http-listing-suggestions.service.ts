import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ListingSuggestionDto, ListingSuggestionsApi, SuggestListingDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link ListingSuggestionsApi} over HTTP: `POST /api/directory/suggestions` (ADR 0086). A failed
 * send errors with an `ApiError`. It holds no state, and is provided on the Suggest a listing
 * screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpListingSuggestionsService implements ListingSuggestionsApi {
  private readonly http = inject(HttpClient);

  suggest(suggestion: SuggestListingDto): Observable<ListingSuggestionDto> {
    return this.http
      .post<ListingSuggestionDto>('/api/directory/suggestions', suggestion)
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
          ),
        ),
      );
  }
}
