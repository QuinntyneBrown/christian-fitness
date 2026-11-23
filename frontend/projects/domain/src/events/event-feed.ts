import type { EventPageDto, EventSummaryDto } from '@cf/api';

/** The most events a session keeps in memory and asks for (ADR 0027, L2-009 AC7). */
export const EVENT_FEED_LIMIT = 200;

/** The events loaded so far, and what to ask for next. */
export interface EventFeed {
  events: readonly EventSummaryDto[];
  /** The cursor of the next page, or none when the last has loaded or the list is capped. */
  nextCursor: string | null;
  /** The list stopped at {@link EVENT_FEED_LIMIT} while more remain. */
  capped: boolean;
}

export const EMPTY_FEED: EventFeed = { events: [], nextCursor: null, capped: false };

/**
 * The feed with `page` after it: events already in it are dropped, so a page that repeats one
 * shows it once, and the list stops at the limit. Nothing is removed from the top, so a card the
 * member scrolled past stays.
 */
export function appendPage(feed: EventFeed, page: EventPageDto): EventFeed {
  const seen = new Set(feed.events.map((event) => event.id));
  const fresh = page.events.filter((event) => !seen.has(event.id));
  const room = EVENT_FEED_LIMIT - feed.events.length;
  const events = [...feed.events, ...fresh.slice(0, room)];
  const more = page.nextCursor !== null || fresh.length > room;
  const capped = events.length >= EVENT_FEED_LIMIT && more;
  return { events, nextCursor: capped ? null : page.nextCursor, capped };
}

/** Whether the next page should be asked for. */
export function hasMore(feed: EventFeed): boolean {
  return feed.nextCursor !== null;
}
