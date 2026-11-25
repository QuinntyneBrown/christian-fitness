import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ListingKind } from '../directory/directory';

/** Where a suggestion stands (ADR 0087). */
export type SuggestionStatus = 'waiting' | 'approved' | 'declined';

/** How the member who sent it knows the suggested party (ADR 0086). */
export type SuggestionRelationSlug = 'myself' | 'someone-i-know' | 'somewhere-ive-been';

/** The four checks, in the panel's order (L2-073 AC3). */
export type ListingCheckSlug = 'credentials' | 'insurance' | 'two-references' | 'conversation';

/**
 * One suggestion in the list (L2-073 AC2; ADR 0087): `from` is the member who sent it, none for a
 * self-submission; `submittedAt` an ISO instant in UTC. Every text is rendered as text.
 */
export interface SuggestionSummaryDto {
  id: string;
  name: string;
  kind: ListingKind;
  area: string;
  from: string | null;
  submittedAt: string;
  status: SuggestionStatus;
}

/**
 * `GET /api/admin/directory/suggestions`: how many wait, how many listings are published, the page
 * of suggestions oldest first and, when more follow, the id to ask after (ADR 0087).
 */
export interface SuggestionListDto {
  waiting: number;
  listed: number;
  suggestions: SuggestionSummaryDto[];
  next: string | null;
}

/** One check and whether it passed. */
export interface SuggestionCheckDto {
  check: ListingCheckSlug;
  passed: boolean;
}

/** The chosen suggestion as the panel shows it (L2-073 AC3; ADR 0087). */
export interface SuggestionDetailDto {
  id: string;
  kind: ListingKind;
  name: string;
  area: string;
  website: string | null;
  reason: string | null;
  relation: SuggestionRelationSlug;
  from: string | null;
  submittedAt: string;
  status: SuggestionStatus;
  checks: SuggestionCheckDto[];
}

/**
 * What a decision answers (ADR 0087): the status, the draft listing an approval made and how the
 * claim went; neither for a decline.
 */
export interface SuggestionDecisionDto {
  status: 'approved' | 'declined';
  listingId: string | null;
  claim: 'email' | 'message' | 'staff-managed' | null;
}

/** `PUT …/checks/{check}`: the four checks after the change. */
export interface SuggestionChecksDto {
  checks: SuggestionCheckDto[];
}

/** Staff review listing suggestions (L2-073; journey 18; ADR 0087). */
export interface AdminDirectoryApi {
  /** The suggestions after `after`, or from the oldest. A failure errors with an `ApiError`. */
  suggestions(after?: string): Observable<SuggestionListDto>;

  /** One suggestion; `suggestion_not_found` (404) for an unknown id. */
  suggestion(id: string): Observable<SuggestionDetailDto>;

  /**
   * Ticks or unticks `check` of the suggestion `id` and answers the four checks (L2-073 AC4).
   * Refusals: `suggestion_not_found` (404), `not_found` (404) for an unknown check,
   * `suggestion_decided` (409).
   */
  setCheck(id: string, check: ListingCheckSlug, passed: boolean): Observable<SuggestionChecksDto>;

  /**
   * Approves the suggestion `id` whose four checks passed (L2-073 AC6). Refusals:
   * `checks_incomplete` (409), `suggestion_decided` (409), `suggestion_not_found` (404).
   */
  approve(id: string): Observable<SuggestionDecisionDto>;

  /**
   * Declines the suggestion `id`, with an optional `reason` kept for staff (L2-073 AC8). Refusals:
   * `validation_failed` with `fieldCodes.reason` `reason_too_long` (400), `suggestion_decided`
   * (409), `suggestion_not_found` (404).
   */
  decline(id: string, reason: string | null): Observable<SuggestionDecisionDto>;

  /** `GET listings?after={id}`: the published listings in name order, 50 at a time (L2-073 AC10). */
  listings(after?: string): Observable<ListedListingsDto>;

  /**
   * `PUT listings/{id}`: saves the staff editor's fields (L2-073 AC13). Refusals: 400
   * `validation_failed` with `fieldCodes`, 404 `not_found`.
   */
  updateListing(id: string, update: DirectoryListingUpdateDto): Observable<ListedListingDto>;

  /** `POST photos`: keeps one photo; 400 with `fieldCodes.photo` `photo_invalid` when it is not one. */
  uploadPhoto(file: File): Observable<ListingPhotoDto>;
}

/** A published listing as Listed shows it and its editor starts from (ADR 0087). */
export interface ListedListingDto {
  id: string;
  kind: ListingKind;
  name: string;
  area: string;
  tagline: string;
  about: string;
  website: string | null;
  /** The key of its photo (`GET /api/directory/photos/{key}`), or none. */
  photoKey: string | null;
  verified: boolean;
  /** How many members follow it: 0 until members can follow (journey 8). */
  followers: number;
}

/** A page of Listed: how many are published, up to 50 in name order, and the id to read on from. */
export interface ListedListingsDto {
  total: number;
  listings: ListedListingDto[];
  next: string | null;
}

/** What the staff editor sends; never the Verified mark. */
export interface DirectoryListingUpdateDto {
  name: string;
  kind: ListingKind;
  area: string;
  tagline: string;
  about: string;
  website: string | null;
  photoKey: string | null;
}

/** `POST photos`: the key a photo is kept under. */
export interface ListingPhotoDto {
  photoKey: string;
}

/** Binds {@link AdminDirectoryApi}; the Listings page provides it on its routed component. */
export const ADMIN_DIRECTORY_SERVICE = new InjectionToken<AdminDirectoryApi>(
  'ADMIN_DIRECTORY_SERVICE',
);
