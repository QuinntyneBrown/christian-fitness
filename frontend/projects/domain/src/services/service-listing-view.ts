import type { ServiceCategory, ServiceListingDto } from '@cf/api';
import { EVENT_TIME_ZONE } from '../events/event-when';
import { servicesHref } from './service-category-filter';

/** One row of the Services list as the member reads it (mock `services/default`). */
export interface ServiceRowView {
  id: string;
  /** Where choosing the row goes: the same category with this listing selected. */
  href: string;
  name: string;
  /** The role and where, such as "Registered dietitian · Virtual · Ontario-wide". */
  text: string;
  price: string;
}

export function serviceRowViewOf(
  listing: ServiceListingDto,
  category: ServiceCategory | null,
): ServiceRowView {
  return {
    id: listing.id,
    href: servicesHref(category, listing.id),
    name: listing.name,
    text: `${listing.role} · ${listing.where}`,
    price: listing.price,
  };
}

/**
 * The listing the card shows (L2-013 AC3): the one the address names, or the first when it names
 * none or one that is not in the list; `null` for an empty list.
 */
export function selectedListing(
  listings: readonly ServiceListingDto[],
  selectedId: string | null,
): ServiceListingDto | null {
  return listings.find((listing) => listing.id === selectedId) ?? listings[0] ?? null;
}

let monthFormat: Intl.DateTimeFormat | undefined;

/**
 * The verified line under a card (mock `services/selected`): when staff approved the listing, by
 * month and year in Toronto. Empty for a value that is not an instant.
 */
export function verifiedText(publishedAt: string): string {
  const instant = new Date(publishedAt);
  if (Number.isNaN(instant.getTime())) return '';
  monthFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    month: 'long',
    year: 'numeric',
  });
  return `Verified by Christian Fitness, ${monthFormat.format(instant)}`;
}
