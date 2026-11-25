import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ListingKind } from './directory';

/**
 * The listing as it will appear once published (`ClaimPreviewDto`, ADR 0091). A draft made from a
 * suggestion may have no tagline, about or focus tags yet. Words are plain text.
 */
export interface ClaimPreviewDto {
  kind: ListingKind;
  name: string;
  tagline: string;
  area: string;
  about: string;
  focus: string[];
  /** As stored; the screen shows only an https address. */
  website: string | null;
  isVerified: boolean;
  /** The key of its photo (`GET /api/directory/photos/{key}`), or none. */
  photoKey: string | null;
}

/**
 * What a claim link answers (`ListingClaimDto`, ADR 0091): the listing's name and the link's expiry
 * (an ISO instant in UTC) to anyone, and the preview only to a signed-in member (L2-078 AC4, AC5).
 */
export interface ListingClaimDto {
  name: string;
  expiresAt: string;
  listing: ClaimPreviewDto | null;
}

/** What publishing or declining answers: the listing the link was for. */
export interface ClaimAnswerDto {
  listingId: string;
}

/** Claiming a listing through its link (L2-078; ADR 0091). */
export interface ListingClaimsApi {
  /**
   * Reads the link. A refusal errors with an `ApiError`: 404 `claim_not_found`, 409
   * `claim_link_used` or 410 `claim_link_expired`.
   */
  get(token: string): Observable<ListingClaimDto>;
  /** Publishes the listing as the signed-in member's; refusals as `get`, status 0 for no answer. */
  publish(token: string): Observable<ClaimAnswerDto>;
  /** Says the listing isn't them; refusals as `get`, status 0 for no answer. */
  decline(token: string): Observable<ClaimAnswerDto>;
}

/** Binds {@link ListingClaimsApi}; each claim page provides it on its own route component. */
export const LISTING_CLAIMS_SERVICE = new InjectionToken<ListingClaimsApi>(
  'LISTING_CLAIMS_SERVICE',
);
