import type { ListingConnectionDto } from '@cf/api';
import { listingKindInfo } from './listing-kinds';
import { directoryListingHref, listingInitials } from './listing-row-view';

/** What one Connected row shows (L2-055 AC4): the screen passes these to the component as they are. */
export interface ConnectionRowView {
  id: string;
  href: string;
  name: string;
  /** "Run leader · Ambassador". */
  text: string;
  /** A round mark (Person, Instructor, Ambassador) rather than a squared one. */
  person: boolean;
  initials: string;
  photoSrc: string | null;
}

/** A listing the profile is connected to, as its Connected row reads it. */
export function connectionRowViewOf(connection: ListingConnectionDto): ConnectionRowView {
  const kind = listingKindInfo(connection.kind);
  return {
    id: connection.id,
    href: directoryListingHref(connection.id),
    name: connection.name,
    text: `${connection.relation} · ${kind.singular}`,
    person: kind.person,
    initials: listingInitials(connection.kind, connection.name),
    photoSrc:
      connection.photoKey === null
        ? null
        : `/api/directory/photos/${encodeURIComponent(connection.photoKey)}`,
  };
}
