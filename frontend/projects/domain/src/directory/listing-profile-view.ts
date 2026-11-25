import type { ListingProfileDto } from '@cf/api';
import { listingHref } from '../services/service-category-filter';
import { listingKindInfo } from './listing-kinds';
import { listingInitials } from './listing-row-view';

/** A website the profile may show: its address and the host it reads as. */
export interface WebsiteLink {
  href: string;
  /** The host without "www.", such as "lakeshorerunners.ca". */
  text: string;
}

/** What the profile's head and key facts show of a listing (L2-054 AC2, L2-055 AC1). */
export interface ListingProfileView {
  /** The kind's name, such as "Organization". */
  kind: string;
  /** A round mark (Person, Instructor, Ambassador) rather than a squared one. */
  person: boolean;
  initials: string;
  photoSrc: string | null;
  website: WebsiteLink | null;
  /** The follower count with thousands separated, such as "2,140". */
  followers: string;
  /** "Since 2025". */
  since: string;
  /** Where "Also offers services" leads, or none (ADR 0061). */
  servicesHref: string | null;
}

/**
 * The link a website is shown as, or `null` when it must not be shown at all (L2-055 AC5; ADR 0077,
 * ADR 0087): only an absolute `https` address with a host and no user name or password.
 */
export function websiteLinkOf(url: string | null): WebsiteLink | null {
  if (url === null) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname === '' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    return null;
  }
  return { href: parsed.href, text: parsed.hostname.replace(/^www\./, '') };
}

// Made once on first use, not at import: the formatter is costly to create.
let thousands: Intl.NumberFormat | undefined;

/** A profile as its head and key facts show it. */
export function listingProfileViewOf(profile: ListingProfileDto): ListingProfileView {
  const kind = listingKindInfo(profile.kind);
  return {
    kind: kind.singular,
    person: kind.person,
    initials: listingInitials(profile.kind, profile.name),
    photoSrc:
      profile.photoKey === null
        ? null
        : `/api/directory/photos/${encodeURIComponent(profile.photoKey)}`,
    website: websiteLinkOf(profile.websiteUrl),
    followers: (thousands ??= new Intl.NumberFormat('en-US')).format(profile.followers),
    since: `Since ${profile.listedYear}`,
    servicesHref:
      profile.serviceListingId === null ? null : listingHref(profile.serviceListingId, null),
  };
}
