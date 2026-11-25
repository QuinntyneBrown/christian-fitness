import type { DirectoryKindCountDto, DirectoryListingRowDto, DirectoryPageDto } from '@cf/api';
import { LISTING_KINDS, type ListingKindInfo } from './listing-kinds';

/** The most listings a session keeps in memory and asks for (L2-054 AC7, L2-009 AC7; ADR 0082). */
export const DIRECTORY_FEED_LIMIT = 200;

/** The listings loaded so far, every kind's count, and what to ask for next. */
export interface DirectoryFeed {
  listings: readonly DirectoryListingRowDto[];
  /** Each kind's count of published listings, from the latest page; none before the first. */
  counts: readonly DirectoryKindCountDto[] | null;
  /** The cursor of the next page, or none when the last has loaded or the list is capped. */
  nextCursor: string | null;
  /** The list stopped at {@link DIRECTORY_FEED_LIMIT} while more remain. */
  capped: boolean;
}

export const EMPTY_DIRECTORY_FEED: DirectoryFeed = {
  listings: [],
  counts: null,
  nextCursor: null,
  capped: false,
};

/**
 * The feed with `page` after it: listings already in it are dropped, so a page that repeats one
 * shows it once, and the list stops at the limit, so a long session does not grow without bound.
 */
export function appendDirectoryPage(feed: DirectoryFeed, page: DirectoryPageDto): DirectoryFeed {
  const seen = new Set(feed.listings.map((listing) => listing.id));
  const fresh = page.listings.filter((listing) => !seen.has(listing.id));
  const room = DIRECTORY_FEED_LIMIT - feed.listings.length;
  const listings = [...feed.listings, ...fresh.slice(0, room)];
  const more = page.nextCursor !== null || fresh.length > room;
  const capped = listings.length >= DIRECTORY_FEED_LIMIT && more;
  return { listings, counts: page.counts, nextCursor: capped ? null : page.nextCursor, capped };
}

/** One kind's group: its heading and blurb and its rows, in the order they came. */
export interface DirectoryGroup<T> {
  info: ListingKindInfo;
  rows: T[];
}

/**
 * The rows grouped by kind in the directory's order (L2-054 AC1); a kind with no row has no group.
 * `view` turns each row into what the screen shows.
 */
export function directoryGroups<T>(
  listings: readonly DirectoryListingRowDto[],
  view: (row: DirectoryListingRowDto) => T,
): DirectoryGroup<T>[] {
  return LISTING_KINDS.map((info) => ({
    info,
    rows: listings.filter((listing) => listing.kind === info.kind).map(view),
  })).filter((group) => group.rows.length > 0);
}
