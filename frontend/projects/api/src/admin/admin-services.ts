import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ServiceCategory } from '../services/professional-applications';

/**
 * One pending application as staff read it (`PendingApplicationDto`, ADR 0000): the applicant's
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
 * How staff decided an application (`ApplicationDecisionDto`, ADR 0050): the application, whether it
 * is `approved` or `declined`, and the published listing's id when it was approved.
 */
export interface ApplicationDecisionDto {
  applicationId: string;
  status: 'approved' | 'declined';
  listingId: string | null;
}

/**
 * One live listing as staff read and edit it (`AdminListingDto`, ADR 0055): the fields members see on
 * Services, the contact link itself (or `null` when members message the professional here) and when
 * it was published, an ISO instant in UTC. Every text is plain text, rendered as text (L2-032).
 */
export interface AdminListingDto {
  id: string;
  name: string;
  role: string;
  category: ServiceCategory;
  where: string;
  price: string;
  credentials: string;
  about: string;
  contactUrl: string | null;
  publishedAt: string;
}

/** `GET /api/admin/services/listings`: the live listings in name order, at most 50, and how many exist in all. */
export interface AdminListingsDto {
  total: number;
  listings: AdminListingDto[];
}

/** What the listing editor saves (`PUT /api/admin/services/listings/{id}`, ADR 0055): every editable field. */
export interface UpdateListingDto {
  name: string;
  role: string;
  category: ServiceCategory;
  where: string;
  price: string;
  credentials: string;
  about: string;
  /** An http or https address, or `null` for none. */
  contactUrl: string | null;
}

/** Staff review professional applications and keep listings correct (L2-025, L2-027; ADR 0049, ADR 0050, ADR 0055). */
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

  /** The live listings, in name order. A failure errors with an `ApiError`. */
  listings(): Observable<AdminListingsDto>;

  /**
   * Replaces the editable fields of the listing `id` (`PUT .../listings/{id}`) and answers it as
   * saved. A failure errors with an `ApiError`: 400 `validation_failed` with `fieldCodes` naming each
   * refused field, or 404 `service_not_found` when the listing is gone.
   */
  updateListing(id: string, listing: UpdateListingDto): Observable<AdminListingDto>;

  /**
   * Removes the listing `id` (`DELETE .../listings/{id}`, slice 23.2; ADR 0056). A failure errors
   * with an `ApiError`: 404 `service_not_found` when the listing is gone already.
   */
  removeListing(id: string): Observable<void>;
}

/** Binds {@link AdminServicesApi}; the Services page provides it on its routed component. */
export const ADMIN_SERVICES_SERVICE = new InjectionToken<AdminServicesApi>(
  'ADMIN_SERVICES_SERVICE',
);
