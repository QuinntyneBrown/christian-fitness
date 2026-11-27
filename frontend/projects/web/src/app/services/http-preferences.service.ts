import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { PreferencesApi, PreferencesDto, PreferencesValuesDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link PreferencesApi} over HTTP: `GET` and `PUT /api/preferences` (L2-064). A failure errors
 * with an `ApiError`. It holds no state, and is provided on Preferences.
 */
@Injectable()
export class HttpPreferencesService implements PreferencesApi {
  private readonly http = inject(HttpClient);

  get(): Observable<PreferencesDto> {
    return this.http.get<PreferencesDto>('/api/preferences').pipe(catchError(asApiError));
  }

  save(values: PreferencesValuesDto): Observable<PreferencesDto> {
    return this.http.put<PreferencesDto>('/api/preferences', values).pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
