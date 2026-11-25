import { InjectionToken, type Signal } from '@angular/core';
import type { Observable } from 'rxjs';
import type { EventCategory } from '../admin/admin-events';

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
  /** Whether the signed-in member follows it (ADR 0088). */
  following: boolean;
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

/**
 * One event a listing hosts that is still to come (`HostedEventDto`, ADR 0087): the start as an
 * ISO instant in UTC, which the screen words in Toronto.
 */
export interface HostedEventDto {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string;
  place: string;
  /** The key of its picture (`GET /api/events/images/{key}`), or none. */
  imageKey: string | null;
}

/**
 * A published listing a profile is connected to (`ListingConnectionDto`, ADR 0087), with the
 * relation worded from the profile's side, such as "Run leader".
 */
export interface ListingConnectionDto {
  id: string;
  kind: ListingKind;
  name: string;
  photoKey: string | null;
  relation: string;
}

/**
 * A published listing's profile (`ListingProfileDto`, ADR 0087): what it publishes, how many follow
 * it and the year it was listed. The website is as stored: the app shows only an https address
 * (L2-055 AC5). It carries no member id or contact detail.
 */
export interface ListingProfileDto {
  id: string;
  kind: ListingKind;
  name: string;
  tagline: string;
  area: string;
  description: string;
  focus: string[];
  websiteUrl: string | null;
  isVerified: boolean;
  photoKey: string | null;
  followers: number;
  listedYear: number;
  /** Whether a member owns it, so Message can reach someone (L2-055 AC6). */
  hasOwner: boolean;
  /** How many published one-off events it hosts that have not started. */
  hostingCount: number;
  /** The first 20 of them, in start order. */
  hosting: HostedEventDto[];
  /** The published listings it is connected to, in kind then name order. */
  connections: ListingConnectionDto[];
  /** The Services listing of the same owner, or that staff linked, for "Also offers services" (ADR 0061). */
  serviceListingId: string | null;
  /** Whether the signed-in member follows it (ADR 0088). */
  following: boolean;
  /** Whether the signed-in member owns it: the profile shows Edit listing (ADR 0093). */
  isOwner: boolean;
  /** What only the owner reads, or none for anyone else (ADR 0093). */
  owner: OwnListingDto | null;
}

/**
 * What only the owner reads of their listing (`OwnListingDto`, ADR 0093): the contact email shown
 * to members who message it, and a new name or kind waiting for staff.
 */
export interface OwnListingDto {
  contactEmail: string | null;
  pendingName: string | null;
  pendingKind: ListingKind | null;
}

/**
 * The member's follow of a listing after a follow or unfollow, and its follower count
 * (`ListingFollowDto`, ADR 0088): never who follows it (L2-056 AC6).
 */
export interface ListingFollowDto {
  following: boolean;
  followers: number;
}

/** Who receives a listing's messages: the member whose direct conversation Message opens. */
export interface ListingConversationDto {
  memberId: string;
}

/** The directory a member browses (L2-054, L2-055; ADR 0082, ADR 0087). */
export interface DirectoryApi {
  /**
   * One page of the published listings in kind and name order, 50 to a page. A refusal
   * (`query_too_long`, `validation_failed`, `too_many_requests`) errors with the
   * `HttpErrorResponse`; a 5xx opens the server-error screen.
   */
  list(query: DirectoryQuery): Observable<DirectoryPageDto>;

  /**
   * One published listing's profile. An unknown or unpublished id errors with a 404
   * (`listing_not_found`); a 5xx opens the server-error screen.
   */
  get(id: string): Observable<ListingProfileDto>;

  /**
   * The member to open the direct conversation with when messaging a listing: its owner. A listing
   * with no owner errors with a 409 (`listing_unreachable`), a suspended owner or the caller's own
   * listing with a 403 (`recipient_unavailable`), and an unpublished one with a 404
   * (`listing_not_found`).
   */
  startConversation(id: string): Observable<ListingConversationDto>;

  /**
   * Follows a published listing; a repeat changes nothing (L2-056 AC1, AC4). A refusal
   * (`listing_not_found`, `account_suspended`, `too_many_attempts`) or no answer errors.
   */
  follow(id: string): Observable<ListingFollowDto>;

  /** Stops following a published listing; a repeat changes nothing (L2-056 AC2, AC4). Errors as {@link follow}. */
  unfollow(id: string): Observable<ListingFollowDto>;
}

/** One listing's follow as a screen shows it: the member's state, the count where known, and whether a change is in flight. */
export interface ListingFollowState {
  following: boolean;
  /** The follower count, or none where the screen does not show it (a directory row). */
  followers: number | null;
  /** A follow or unfollow is on its way (L2-056 AC8). */
  busy: boolean;
}

/** A listing a screen shows, as it was loaded: the member's state and, on a profile, the count. */
export interface FollowableListing {
  id: string;
  following: boolean;
  followers?: number;
}

/**
 * The follows of the listings one screen shows (L2-056; ADR 0088): `track` takes them as loaded,
 * `toggle` follows or unfollows one at once and settles it by the server's answer, or puts it back
 * and shows a toast naming it.
 */
export interface ListingFollowsApi {
  readonly follows: Signal<ReadonlyMap<string, ListingFollowState>>;
  /** Takes the listings now shown, keeping any whose change is in flight. */
  track(listings: readonly FollowableListing[]): void;
  /** Follows or unfollows the listing `id`, named `name`; nothing while its change is in flight. */
  toggle(id: string, name: string): void;
}

/** Binds {@link ListingFollowsApi}; the Directory and listing profile screens provide it. */
export const LISTING_FOLLOWS = new InjectionToken<ListingFollowsApi>('LISTING_FOLLOWS');

/** Binds {@link DirectoryApi}; the Directory screen provides it on its own route component. */
export const DIRECTORY_SERVICE = new InjectionToken<DirectoryApi>('DIRECTORY_SERVICE');
