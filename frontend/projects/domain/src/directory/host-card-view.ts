import type { EventHostCardDto } from '@cf/api';
import { listingKindInfo } from './listing-kinds';
import { directoryListingHref, listingInitials } from './listing-row-view';

/** What the "Hosted by" card shows (L2-010 AC4; ADR 0088): the page passes these as they are. */
export interface HostCardView {
  /** The host's profile (L2-055). */
  href: string;
  name: string;
  /** The kind's name, "Organization" or "Instructor". */
  kind: string;
  initials: string;
  /** The photo's address, or none: the mark shows the initials. */
  photoSrc: string | null;
  /** A round mark (Person, Instructor, Ambassador) rather than a squared one. */
  person: boolean;
  verified: boolean;
}

/** An event's host as its card reads. */
export function hostCardViewOf(host: EventHostCardDto): HostCardView {
  const kind = listingKindInfo(host.kind);
  return {
    href: directoryListingHref(host.id),
    name: host.name,
    kind: kind.singular,
    initials: listingInitials(host.kind, host.name),
    photoSrc:
      host.photoKey === null ? null : `/api/directory/photos/${encodeURIComponent(host.photoKey)}`,
    person: kind.person,
    verified: host.isVerified,
  };
}
