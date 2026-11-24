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
  /**
   * Whether the professional publishes a contact link instead of taking messages here (L2-014;
   * ADR 0052). The link itself is served only by `getContactLink`.
   */
  hasContactLink: boolean;
}

/** The listings, in name order, at most 50, and how many match in all (ADR 0050). */
export interface ServiceListingsDto {
  total: number;
  services: ServiceListingDto[];
}

/** The member a listing's direct conversation is with: Messages opens it at `/messages/{memberId}` (ADR 0052). */
export interface ProfessionalConversationDto {
  memberId: string;
}

/** A professional's published contact link: an address the member's browser opens (ADR 0052). */
export interface ContactLinkDto {
  url: string;
}

/** The kinds of session a booking request asks for (L2-014 AC3; ADR 0053). */
export const BOOKING_KINDS = ['one-on-one', 'small-group', 'intro-call'] as const;

export type BookingKind = (typeof BOOKING_KINDS)[number];

/**
 * A booking request as the dialog sends it (`POST /api/services/{id}/booking-requests`; ADR 0053):
 * what the member would like, when it suits them and an optional message. All plain text, never
 * rendered as HTML; `message` is left out when blank.
 */
export interface RequestBookingDto {
  kind: BookingKind;
  when: string;
  message?: string;
}

/** The professional the request went to: Messages opens their conversation at `/messages/{memberId}` (ADR 0053). */
export interface BookingRequestDto {
  memberId: string;
}

/** The professionals a member browses (ADR 0050). */
export interface ServicesApi {
  /**
   * The published listings, of one category when given (L2-013 AC1, AC2). A refusal or no answer
   * errors with an `ApiError`: status 0 for none.
   */
  list(category: ServiceCategory | null): Observable<ServiceListingsDto>;
  /**
   * One published listing (L2-013 AC4; ADR 0051). An id that is not there errors with an
   * `ApiError` of status 404 and code `service_not_found`.
   */
  get(id: string): Observable<ServiceListingDto>;
  /**
   * Message: the direct conversation with the listing's professional (L2-014 AC1; ADR 0052). A
   * refusal errors with an `ApiError`: 404 `service_not_found`, 409 `professional_not_linked`
   * (the listing publishes a contact link), 403 `recipient_unavailable` (the professional is
   * suspended, or the listing is the caller's own), status 0 for no answer.
   */
  startConversation(id: string): Observable<ProfessionalConversationDto>;
  /**
   * Contact: the listing's contact link, asked for only when the member chooses it (L2-014 AC2;
   * ADR 0052). 404 `service_not_found` or `contact_link_not_found` when there is none.
   */
  getContactLink(id: string): Observable<ContactLinkDto>;
  /**
   * Request a booking: the request reaches the listing's professional as a direct message and the
   * conversation starts (L2-014 AC3 to AC5; ADR 0053). A refusal errors with an `ApiError`: 400
   * `validation_failed` or `field_too_long`, 404 `service_not_found`, 409 `professional_not_linked`,
   * 403 `recipient_unavailable` (the professional is suspended, or the listing is the caller's own),
   * status 0 for no answer.
   */
  requestBooking(id: string, request: RequestBookingDto): Observable<BookingRequestDto>;
}

/** Binds {@link ServicesApi}; the Services screen provides it on its own route component. */
export const SERVICES_SERVICE = new InjectionToken<ServicesApi>('SERVICES_SERVICE');
