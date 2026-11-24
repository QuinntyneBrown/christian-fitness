import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * One pending application as staff read it (`PendingApplicationDto`, ADR 0048): the applicant's
 * name, the role and credentials they wrote, and when it was sent as an ISO instant in UTC. Every
 * text is plain text, rendered as text (L2-032).
 */
export interface PendingApplicationDto {
  id: string;
  name: string;
  role: string;
  credentials: string;
  submittedAt: string;
}

/**
 * `GET /api/admin/services/applications`: the oldest pending applications, at most 50, and how many
 * wait in all (`total`, which can be more than are listed).
 */
export interface PendingApplicationsDto {
  total: number;
  applications: PendingApplicationDto[];
}

/** Staff review professional applications (L2-025; ADR 0048). */
export interface AdminServicesApi {
  /** The queue, oldest first. A failure errors with an `ApiError`. */
  applications(): Observable<PendingApplicationsDto>;
}

/** Binds {@link AdminServicesApi}; the Services page provides it on its routed component. */
export const ADMIN_SERVICES_SERVICE = new InjectionToken<AdminServicesApi>(
  'ADMIN_SERVICES_SERVICE',
);
