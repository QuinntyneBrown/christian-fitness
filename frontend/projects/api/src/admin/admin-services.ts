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

/**
 * How staff decided an application (`ApplicationDecisionDto`, ADR 0049): the application, whether it
 * is `approved` or `declined`, and the published listing's id when it was approved.
 */
export interface ApplicationDecisionDto {
  applicationId: string;
  status: 'approved' | 'declined';
  listingId: string | null;
}

/** Staff review professional applications (L2-025; ADR 0048, ADR 0049). */
export interface AdminServicesApi {
  /** The queue, oldest first. A failure errors with an `ApiError`. */
  applications(): Observable<PendingApplicationsDto>;

  /**
   * Approves the pending application `id`, which publishes its listing (`POST .../{id}/approve`).
   * A failure errors with an `ApiError`: 404 `application_not_found` or 409 `application_decided`
   * when it is not there to decide.
   */
  approve(id: string): Observable<ApplicationDecisionDto>;

  /**
   * Declines the pending application `id` with `reason`, which publishes nothing (`POST
   * .../{id}/decline`). Refusals are those of {@link approve}, and 400 `validation_failed` with
   * `fieldCodes.reason` when the reason is empty or too long.
   */
  decline(id: string, reason: string): Observable<ApplicationDecisionDto>;
}

/** Binds {@link AdminServicesApi}; the Services page provides it on its routed component. */
export const ADMIN_SERVICES_SERVICE = new InjectionToken<AdminServicesApi>(
  'ADMIN_SERVICES_SERVICE',
);
