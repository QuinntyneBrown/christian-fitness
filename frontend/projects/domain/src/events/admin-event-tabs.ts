import type { AdminEventCountsDto, AdminEventTab, EventCategory } from '@cf/api';

/** One tab of the staff list: its label, its link, its count (none while loading), and whether it shows. */
export interface AdminEventTabView {
  label: string;
  href: string;
  count: number | null;
  current: boolean;
}

const TABS: readonly { tab: AdminEventTab; label: string; href: string }[] = [
  { tab: 'all', label: 'All', href: '/events' },
  { tab: 'published', label: 'Published', href: '/events?status=published' },
  { tab: 'draft', label: 'Draft', href: '/events?status=draft' },
];

/** The tab a URL's `status` names (L2-022 AC5): `published`, `draft`, or else All. */
export function adminEventTabOf(status: string | null): AdminEventTab {
  return status === 'published' || status === 'draft' ? status : 'all';
}

/** All, Published and Draft with their links and counts, `current` marked (mock `tabs`). */
export function adminEventTabs(
  current: AdminEventTab,
  counts: AdminEventCountsDto | null,
): AdminEventTabView[] {
  return TABS.map(({ tab, label, href }) => ({
    label,
    href,
    count: counts ? counts[tab] : null,
    current: tab === current,
  }));
}

/** The six categories in the editor's order (L2-009 AC2). */
export const EVENT_CATEGORIES: readonly EventCategory[] = [
  'run',
  'workout',
  'basketball',
  'mobility',
  'workshop',
  'retreat',
];

/** A category's label, such as "Retreat". */
export function eventCategoryLabel(category: EventCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
