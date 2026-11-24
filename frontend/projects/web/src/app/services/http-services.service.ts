import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ServiceCategory, ServiceListingDto, ServiceListingsDto, ServicesApi } from '@cf/api';
import type { Observable } from 'rxjs';

/**
 * {@link ServicesApi} over HTTP: `GET /api/services?category=` (ADR 0050) and `GET /api/services/{id}` (ADR 0051). A 5xx opens the
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
}
