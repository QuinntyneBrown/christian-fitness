import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminBylinesApi,
  BylineDraftDto,
  BylineDto,
  BylineListDto,
  BylinePhotoDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

const BASE = '/api/admin/stories/bylines';

/**
 * {@link AdminBylinesApi} over HTTP: `/api/admin/stories/bylines` and its photos (ADR 0094). A
 * failure errors with an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`.
 * It holds no state.
 */
@Injectable()
export class HttpAdminBylinesService implements AdminBylinesApi {
  private readonly http = inject(HttpClient);

  list(): Observable<BylineListDto> {
    return this.http.get<BylineListDto>(BASE).pipe(catchError(asApiError));
  }

  create(draft: BylineDraftDto): Observable<BylineDto> {
    return this.http.post<BylineDto>(BASE, draft).pipe(catchError(asApiError));
  }

  update(id: string, draft: BylineDraftDto): Observable<BylineDto> {
    return this.http
      .put<BylineDto>(`${BASE}/${encodeURIComponent(id)}`, draft)
      .pipe(catchError(asApiError));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${encodeURIComponent(id)}`).pipe(catchError(asApiError));
  }

  uploadPhoto(file: File): Observable<BylinePhotoDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<BylinePhotoDto>(`${BASE}/photos`, body).pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
