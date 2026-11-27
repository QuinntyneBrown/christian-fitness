import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { DataApi, DataExportDto, DataExportRequestedDto } from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, map, throwError, type Observable } from 'rxjs';

/**
 * {@link DataApi} over HTTP: `POST /api/data-exports`, `GET /api/data-exports/{id}` and its
 * `/archive`, and `POST /api/account/deletion` (L2-066). A failure errors with an `ApiError`. It holds no state, and is provided on
 * each screen that uses it.
 */
@Injectable()
export class HttpDataService implements DataApi {
  private readonly http = inject(HttpClient);

  requestDownload(): Observable<DataExportRequestedDto> {
    return this.http
      .post<DataExportRequestedDto>('/api/data-exports', null)
      .pipe(catchError(asApiError));
  }

  download(id: string): Observable<DataExportDto> {
    return this.http
      .get<DataExportDto>(`/api/data-exports/${encodeURIComponent(id)}`)
      .pipe(catchError(asApiError));
  }

  archive(id: string): Observable<Blob> {
    return this.http
      .get(`/api/data-exports/${encodeURIComponent(id)}/archive`, { responseType: 'blob' })
      .pipe(catchError(asApiError));
  }

  deleteAccount(confirm: string): Observable<void> {
    return this.http.post<unknown>('/api/account/deletion', { confirm }).pipe(
      map(() => undefined),
      catchError(asApiError),
    );
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
