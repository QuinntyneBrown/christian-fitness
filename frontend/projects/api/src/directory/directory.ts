import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * A listing's kind as the API and the address name it (ADR 0071, ADR 0082), in the directory's
 * order.
 */
export type ListingKind =
  'organization' | 'person' | 'instructor' | 'ambassador' | 'company' | 'church-ministry';

/**
 * One directory row (`DirectoryListingRowDto`, ADR 0082): what a published listing publishes and
 * how many events it hosts that are still to come. It carries no contact detail.
 */
export interface DirectoryListingRowDto {
  id: string;
  kind: ListingKind;
  name: string;
  tagline: string;
  area: string;
  isVerified: boolean;
  /** The key of its photo (`GET /api/directory/photos/{key}`), or none: the mark shows initials. */
  photoKey: string | null;
  /** Its published series and one-off events still to come. */
  hosting: number;
}

/** How many published listings a kind has, whatever the search. */
export interface DirectoryKindCountDto {
  kind: ListingKind;
  count: number;
}

/** One page of the directory, every kind's count in order, and the cursor of the next page or none. */
export interface DirectoryPageDto {
  listings: DirectoryListingRowDto[];
  counts: DirectoryKindCountDto[];
  nextCursor: string | null;
}

/** What one request asks for: a kind or all, a search or none, and a page after a cursor or the first. */
export interface DirectoryQuery {
  kind: ListingKind | null;
  q: string | null;
  cursor: string | null;
}

/** The directory a member browses (L2-054; ADR 0082). */
export interface DirectoryApi {
  /**
   * One page of the published listings in kind and name order, 50 to a page. A refusal
   * (`query_too_long`, `validation_failed`, `too_many_requests`) errors with the
   * `HttpErrorResponse`; a 5xx opens the server-error screen.
   */
  list(query: DirectoryQuery): Observable<DirectoryPageDto>;
}

/** Binds {@link DirectoryApi}; the Directory screen provides it on its own route component. */
export const DIRECTORY_SERVICE = new InjectionToken<DirectoryApi>('DIRECTORY_SERVICE');
