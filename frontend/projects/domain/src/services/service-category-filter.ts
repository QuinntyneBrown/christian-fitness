import { SERVICE_CATEGORIES, type ServiceCategory } from '@cf/api';

/** One filter chip on the member Services screen (L2-013 AC2; ADR 0000). */
export interface ServiceCategoryChipView {
  label: string;
  href: string;
  current: boolean;
}

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(SERVICE_CATEGORIES);

/**
 * The category a URL's `category` query parameter names (L2-013 AC2): one of the five exact names,
 * capitals included, or `null` (All) for none or anything unknown.
 */
export function serviceCategoryOf(raw: string | null): ServiceCategory | null {
  return raw !== null && KNOWN_CATEGORIES.has(raw) ? (raw as ServiceCategory) : null;
}

/** The address of Services for a category and a selected listing, either of which may be none. */
export function servicesHref(category: ServiceCategory | null, selectedId: string | null): string {
  const params = new URLSearchParams();
  if (category !== null) params.set('category', category);
  if (selectedId !== null) params.set('selected', selectedId);
  const query = params.toString();
  return query === '' ? '/services' : `/services?${query}`;
}

/**
 * The address of one listing's own screen (L2-013 AC4; ADR 0052), carrying the category the list was
 * filtered by so Back returns to it.
 */
export function listingHref(id: string, category: ServiceCategory | null): string {
  const base = `/services/${encodeURIComponent(id)}`;
  return category === null ? base : `${base}?${new URLSearchParams({ category }).toString()}`;
}

/** All and the five categories, with their addresses and `current` marked (mock `services/filtered`). */
export function serviceCategoryChips(current: ServiceCategory | null): ServiceCategoryChipView[] {
  return [
    { label: 'All', href: servicesHref(null, null), current: current === null },
    ...SERVICE_CATEGORIES.map((category) => ({
      label: category,
      href: servicesHref(category, null),
      current: current === category,
    })),
  ];
}

/** The no-results sentence for a category nobody is listed in yet (a stand-in, ADR 0051). */
export function noCategoryServicesText(category: ServiceCategory): string {
  return `No ${category} professionals right now. New ones are listed as the team approves them.`;
}
