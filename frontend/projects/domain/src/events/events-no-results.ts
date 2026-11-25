import type { EventSelection } from '@cf/api';
import { noCategoryEventsText } from './event-category-filter';

/** What the Events list says when nothing matches, and the words of the action that clears it. */
export interface EventsNoResultsView {
  heading: string;
  text: string;
  /** "Clear filter" for a category alone (ADR 0030), otherwise "Clear search and filters". */
  action: 'Clear filter' | 'Clear search and filters';
}

/**
 * The no-results state for a selection (L2-009 AC3, L2-075 AC3, L2-076 AC2; ADR 0081; mocks
 * `events/no-results`, `events/search-no-results`, `events/going-empty`): "Only events I'm going
 * to" is named first, then the search, then a category alone. With nothing chosen there is none:
 * an empty list is the empty state, not a no-results one.
 */
export function eventsNoResults(query: EventSelection): EventsNoResultsView | null {
  if (query.going) {
    return {
      heading: 'No events you’re going to',
      text: 'You have no upcoming registrations matching these filters.',
      action: 'Clear search and filters',
    };
  }
  if (query.q) {
    return {
      heading: 'No events match your search',
      text: 'Try another search or clear the search and filters.',
      action: 'Clear search and filters',
    };
  }
  if (query.category !== null) {
    return {
      heading: 'Nothing here yet',
      text: noCategoryEventsText(query.category),
      action: 'Clear filter',
    };
  }
  return null;
}
