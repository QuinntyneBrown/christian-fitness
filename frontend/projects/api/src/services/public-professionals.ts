import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * A professional as the public landing page shows one (`GET /api/public/services/featured`,
 * L2-001 AC5; ADR 0000): public fields only, with no id, member, contact link or credentials.
 */
export interface LandingProfessionalDto {
  name: string;
  role: string;
  category: string;
  where: string;
  price: string;
}

/** What a visitor with no session may read about professionals (ADR 0057). */
export interface PublicProfessionalsApi {
  /**
   * The first published listings by name, at most 3. Any failure errors with the
   * `HttpErrorResponse`; the landing page shows it inline and the events beside it are unaffected.
   */
  featured(): Observable<LandingProfessionalDto[]>;
}

/** Binds {@link PublicProfessionalsApi}; the landing page provides it on its own route component. */
export const PUBLIC_PROFESSIONALS_SERVICE = new InjectionToken<PublicProfessionalsApi>(
  'PUBLIC_PROFESSIONALS_SERVICE',
);
