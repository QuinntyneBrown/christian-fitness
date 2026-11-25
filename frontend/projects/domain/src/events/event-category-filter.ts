import type { EventCategory } from '@cf/api';
import { EVENT_CATEGORIES } from './admin-event-tabs';

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(EVENT_CATEGORIES);

/**
 * The category a URL's `category` query parameter names (L2-009 AC2, AC9): one of the six exact
 * category names, or `null` (All) for none or anything unknown.
 */
export function eventCategoryOf(raw: string | null): EventCategory | null {
  return raw !== null && KNOWN_CATEGORIES.has(raw) ? (raw as EventCategory) : null;
}

/** The no-results sentence for a category with no matching events (L2-009 AC3; mock `events/no-results`). */
export function noCategoryEventsText(category: EventCategory): string {
  return `No ${category} events right now. New ones are posted every week.`;
}
