import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ServiceCategory } from './professional-applications';

/**
 * One published listing as `GET /api/services` answers it (L2-013; ADR 0050). Every text is plain
 * text, never rendered as HTML; the app words the verified line from `publishedAt`.
 */
export interface ServiceListingDto {
  id: string;
  name: string;
  role: string;
  category: ServiceCategory;
  where: string;
  price: string;
  credentials: string;
  about: string;
  /** An ISO 8601 instant: when staff approved the listing. */
  publishedAt: string;
}

/** The listings, in name order, at most 50, and how many match in all (ADR 0050). */
export interface ServiceListingsDto {
  total: number;
  services: ServiceListingDto[];
}

/** The professionals a member browses (ADR 0050). */
export interface ServicesApi {
  /**
   * The published listings, of one category when given (L2-013 AC1, AC2). A refusal or no answer
   * errors with an `ApiError`: status 0 for none.
   */
  list(category: ServiceCategory | null): Observable<ServiceListingsDto>;
}

/** Binds {@link ServicesApi}; the Services screen provides it on its own route component. */
export const SERVICES_SERVICE = new InjectionToken<ServicesApi>('SERVICES_SERVICE');
