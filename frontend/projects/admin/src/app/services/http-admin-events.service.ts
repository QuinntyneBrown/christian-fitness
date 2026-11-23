import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminEventDetailDto,
  AdminEventDto,
  AdminEventListDto,
  AdminEventsApi,
  AdminEventTab,
  CreateEventRequestDto,
  EventImageDto,
  EventRegistrationsDto,
  UpdateEventRequestDto,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link AdminEventsApi} over HTTP: `/api/admin/events` and its images (ADR 0021, ADR 0025). A failure
 * errors with an `ApiError` (`apiErrorOf`), so no screen handles an `HttpErrorResponse`. It holds
 * no state.
 */
@Injectable()
export class HttpAdminEventsService implements AdminEventsApi {
  private readonly http = inject(HttpClient);

  list(tab: AdminEventTab): Observable<AdminEventListDto> {
    return this.http
      .get<AdminEventListDto>('/api/admin/events', { params: { status: tab } })
      .pipe(catchError(asApiError));
  }

  create(request: CreateEventRequestDto): Observable<AdminEventDto> {
    return this.http.post<AdminEventDto>('/api/admin/events', request).pipe(catchError(asApiError));
  }

  get(id: string): Observable<AdminEventDetailDto> {
    return this.http
      .get<AdminEventDetailDto>(`/api/admin/events/${encodeURIComponent(id)}`)
      .pipe(catchError(asApiError));
  }

  update(id: string, request: UpdateEventRequestDto): Observable<AdminEventDto> {
    return this.http
      .put<AdminEventDto>(`/api/admin/events/${encodeURIComponent(id)}`, request)
      .pipe(catchError(asApiError));
  }

  publish(id: string): Observable<AdminEventDto> {
    return this.http
      .post<AdminEventDto>(`/api/admin/events/${encodeURIComponent(id)}/publish`, null)
      .pipe(catchError(asApiError));
  }

  cancel(id: string): Observable<AdminEventDto> {
    return this.http
      .post<AdminEventDto>(`/api/admin/events/${encodeURIComponent(id)}/cancel`, null)
      .pipe(catchError(asApiError));
  }

  registrations(id: string): Observable<EventRegistrationsDto> {
    return this.http
      .get<EventRegistrationsDto>(`/api/admin/events/${encodeURIComponent(id)}/registrations`)
      .pipe(catchError(asApiError));
  }

  uploadImage(file: File): Observable<EventImageDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<EventImageDto>('/api/admin/events/images', body)
      .pipe(catchError(asApiError));
  }
}

function asApiError(error: unknown): Observable<never> {
  return throwError(() =>
    error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
  );
}
