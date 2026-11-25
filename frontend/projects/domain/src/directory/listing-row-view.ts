import type { DirectoryListingRowDto, ListingKind } from '@cf/api';
import { listingKindInfo } from './listing-kinds';

/** What a `listing-row` shows (L2-054 AC2): the screen passes these to the component as they are. */
export interface ListingRowView {
  id: string;
  /** The listing's profile (L2-055). */
  href: string;
  name: string;
  tagline: string;
  area: string;
  verified: boolean;
  /** A round mark (Person, Instructor, Ambassador) rather than a squared one. */
  person: boolean;
  initials: string;
  /** The photo's address, or none: the mark shows the initials. */
  photoSrc: string | null;
  /** "<n> hosting" or "No events yet". */
  hosting: string;
  /** Whether it hosts anything, which the row accents. */
  hostingSome: boolean;
}

const firstLetter = (word: string): string => Array.from(word)[0] ?? '';
const isWord = (word: string): boolean => /\p{L}/u.test(firstLetter(word));

/** A listing's profile address (ADR 0085). */
export function directoryListingHref(id: string): string {
  return `/directory/${encodeURIComponent(id)}`;
}

/**
 * The initials a listing's mark shows (mock `directory/default`): for a group, the first letters
 * of its first two words ("Lakeshore Runners Fellowship" is "LR", "Faith & Footwork" "FF"); for a
 * person, those of the first and last names after a title such as "Rev." ("JW").
 */
export function listingInitials(kind: ListingKind, name: string): string {
  const words = name.trim().split(/\s+/).filter(isWord);
  if (listingKindInfo(kind).person) {
    const names =
      words.length > 1 ? words.filter((word, i) => i > 0 || !word.endsWith('.')) : words;
    const letters = names.length > 1 ? [names[0], names[names.length - 1]] : names;
    return letters.map(firstLetter).join('').toLocaleUpperCase();
  }
  return words.slice(0, 2).map(firstLetter).join('').toLocaleUpperCase();
}

/** A row as the directory shows it (L2-054 AC2). */
export function listingRowViewOf(row: DirectoryListingRowDto): ListingRowView {
  return {
    id: row.id,
    href: directoryListingHref(row.id),
    name: row.name,
    tagline: row.tagline,
    area: row.area,
    verified: row.isVerified,
    person: listingKindInfo(row.kind).person,
    initials: listingInitials(row.kind, row.name),
    photoSrc:
      row.photoKey === null ? null : `/api/directory/photos/${encodeURIComponent(row.photoKey)}`,
    hosting: row.hosting > 0 ? `${row.hosting} hosting` : 'No events yet',
    hostingSome: row.hosting > 0,
  };
}
