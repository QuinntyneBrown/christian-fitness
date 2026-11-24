import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  BookingRequestDto,
  ContactLinkDto,
  ProfessionalConversationDto,
  RequestBookingDto,
  ServiceCategory,
  ServiceListingDto,
  ServiceListingsDto,
  ServicesApi,
} from '@cf/api';
import { apiErrorOf } from '@cf/domain';
import { catchError, throwError, type Observable } from 'rxjs';

/**
 * {@link ServicesApi} over HTTP: `GET /api/services?category=` (ADR 0050) `GET /api/services/{id}` (ADR 0051), `POST /api/services/{id}/conversation` `GET /api/services/{id}/contact-link` (ADR 0052) and `POST /api/services/{id}/booking-requests` (ADR 0053). A 5xx opens the
 * server-error screen through the interceptor; every failure passes on to the screen. It holds no
 * state, and is provided on the Services screen, so it lives only while the screen does.
 */
@Injectable()
export class HttpServicesService implements ServicesApi {
  private readonly http = inject(HttpClient);

  list(category: ServiceCategory | null): Observable<ServiceListingsDto> {
    const params =
      category === null ? new HttpParams() : new HttpParams().set('category', category);
    return this.http.get<ServiceListingsDto>('/api/services', { params });
  }

  get(id: string): Observable<ServiceListingDto> {
    return this.http.get<ServiceListingDto>(`/api/services/${encodeURIComponent(id)}`);
  }

  startConversation(id: string): Observable<ProfessionalConversationDto> {
    return this.http.post<ProfessionalConversationDto>(
      `/api/services/${encodeURIComponent(id)}/conversation`,
      null,
    );
  }

  getContactLink(id: string): Observable<ContactLinkDto> {
    return this.http.get<ContactLinkDto>(`/api/services/${encodeURIComponent(id)}/contact-link`);
  }

  requestBooking(id: string, request: RequestBookingDto): Observable<BookingRequestDto> {
    return this.http
      .post<BookingRequestDto>(`/api/services/${encodeURIComponent(id)}/booking-requests`, request)
      .pipe(
        // The dialog branches on the `ApiError`'s code (ADR 0053).
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof HttpErrorResponse ? apiErrorOf(error.status, error.error) : error,
          ),
        ),
      );
  }
}
