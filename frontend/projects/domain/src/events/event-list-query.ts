import type { EventSelection } from '@cf/api';
import { EVENT_CATEGORIES, eventCategoryLabel } from './admin-event-tabs';
import { eventCategoryOf } from './event-category-filter';

/** How long the Events search waits after the last key before it asks (ADR 0081). */
export const EVENT_SEARCH_DELAY_MS = 300;

/** What the Events "By date" list shows, as its address holds it (L2-009, L2-075; ADR 0081). */
export type EventListQuery = EventSelection;

/** A reader of an address's query parameters, such as the router's `ParamMap`. */
export interface QueryParams {
  get(name: string): string | null;
}

/** The search an address or a field holds: trimmed, and empty when blank (L2-075 AC2, AC3). */
export function eventSearchOf(raw: string | null): string {
  return (raw ?? '').trim();
}

/** Reads the list's selection from the address; anything the API would refuse reads as unset. */
export function eventListQueryOf(params: QueryParams): EventListQuery {
  return {
    category: eventCategoryOf(params.get('category')),
    q: eventSearchOf(params.get('q')),
  };
}

/** The address of a selection, `category` then `q`, each left out when unset (ADR 0081). */
export function eventListHref(query: EventListQuery): string {
  const parts: string[] = [];
  if (query.category !== null) parts.push(`category=${query.category}`);
  if (query.q) parts.push(`q=${encodeURIComponent(query.q)}`);
  return parts.length ? `/events?${parts.join('&')}` : '/events';
}

/** One filter chip on the member Events screen (L2-009 AC2; ADR 0030). */
export interface EventCategoryChipView {
  label: string;
  href: string;
  current: boolean;
}

/**
 * All and the six categories, with their addresses and `current` marked (mock `events/filtered`).
 * Each address keeps the rest of the selection, so a chip never drops the search (ADR 0081).
 */
export function eventCategoryChips(query: EventListQuery): EventCategoryChipView[] {
  return [
    {
      label: 'All',
      href: eventListHref({ ...query, category: null }),
      current: query.category === null,
    },
    ...EVENT_CATEGORIES.map((category) => ({
      label: eventCategoryLabel(category),
      href: eventListHref({ ...query, category }),
      current: query.category === category,
    })),
  ];
}
