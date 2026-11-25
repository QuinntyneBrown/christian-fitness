import type { SeriesSelection } from '@cf/api';
import { EVENT_CATEGORIES, eventCategoryLabel } from './admin-event-tabs';
import { eventCategoryOf } from './event-category-filter';
import { type EventCategoryChipView, eventSearchOf, type QueryParams } from './event-list-query';

/** The two views of Events (L2-009 AC11, L2-050; ADR 0093). */
export type EventsView = 'date' | 'series';

/** An address's view: Series only for exactly `view=series`, anything else By date (L2-050 AC7). */
export function eventsViewOf(params: QueryParams): EventsView {
  return params.get('view') === 'series' ? 'series' : 'date';
}

/** One option of the view switch, as the library's segmented control takes it. */
export interface EventsViewOption {
  label: string;
  href: string;
  current: boolean;
  icon?: 'repeat';
}

/**
 * "By date" and "Series (<count>)", the current one marked (L2-009 AC11). Until the count answers,
 * or when it failed (`null`), the option reads "Series" (ADR 0093). Each leads to its view with no
 * filter, since each view has filters of its own.
 */
export function eventsViewOptions(view: EventsView, count: number | null): EventsViewOption[] {
  return [
    { label: 'By date', href: '/events', current: view === 'date' },
    {
      label: count === null ? 'Series' : `Series (${count})`,
      href: '/events?view=series',
      current: view === 'series',
      icon: 'repeat',
    },
  ];
}

/** Reads the Series view's selection from the address; anything the API would refuse reads as unset. */
export function seriesQueryOf(params: QueryParams): SeriesSelection {
  return {
    category: eventCategoryOf(params.get('category')),
    q: eventSearchOf(params.get('q')),
    joined: params.get('joined') === 'true',
  };
}

/** Whether a selection narrows the list at all. */
export function seriesFiltered(query: SeriesSelection): boolean {
  return query.category !== null || query.q !== '' || query.joined;
}

/** The Series view's address: `view=series`, then `category`, `q` and `joined`, each left out when unset. */
export function seriesListHref(query: SeriesSelection): string {
  const parts = ['view=series'];
  if (query.category !== null) parts.push(`category=${query.category}`);
  if (query.q) parts.push(`q=${encodeURIComponent(query.q)}`);
  if (query.joined) parts.push('joined=true');
  return `/events?${parts.join('&')}`;
}

/** All and the six categories of the Series view, each keeping the search and the tick (ADR 0093). */
export function seriesCategoryChips(query: SeriesSelection): EventCategoryChipView[] {
  return [
    {
      label: 'All',
      href: seriesListHref({ ...query, category: null }),
      current: query.category === null,
    },
    ...EVENT_CATEGORIES.map((category) => ({
      label: eventCategoryLabel(category),
      href: seriesListHref({ ...query, category }),
      current: query.category === category,
    })),
  ];
}
