import type { QueryParams } from './event-list-query';

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
