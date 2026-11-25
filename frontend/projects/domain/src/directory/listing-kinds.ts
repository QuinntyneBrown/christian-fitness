import type { ListingKind } from '@cf/api';

/** One listing kind as the directory names it (mock `directory/default`; L2-054 AC1). */
export interface ListingKindInfo {
  kind: ListingKind;
  /** The group heading and the chip's label. */
  plural: string;
  /** The one line under the group heading. */
  blurb: string;
  /** Whether its mark is round, as a person's (L2-054 AC2). */
  person: boolean;
}

/** The six kinds in the directory's order. */
export const LISTING_KINDS: readonly ListingKindInfo[] = [
  {
    kind: 'organization',
    plural: 'Organizations',
    blurb: 'Clubs and groups that run events',
    person: false,
  },
  {
    kind: 'person',
    plural: 'People',
    blurb: 'Speakers, pastors and community voices',
    person: true,
  },
  {
    kind: 'instructor',
    plural: 'Instructors',
    blurb: 'Certified coaches who lead sessions',
    person: true,
  },
  {
    kind: 'ambassador',
    plural: 'Ambassadors',
    blurb: 'Members who welcome newcomers',
    person: true,
  },
  { kind: 'company', plural: 'Companies', blurb: 'Sponsors and local businesses', person: false },
  {
    kind: 'church-ministry',
    plural: 'Church Ministries',
    blurb: 'Fitness and health ministries of local churches',
    person: false,
  },
];

const BY_KIND = new Map(LISTING_KINDS.map((info) => [info.kind as string, info]));

/** The kind an address's `kind` names exactly, or `null` (All) for none or anything unknown (ADR 0071). */
export function listingKindOf(raw: string | null): ListingKind | null {
  return raw !== null && BY_KIND.has(raw) ? (raw as ListingKind) : null;
}

/** What the directory says about one kind. */
export function listingKindInfo(kind: ListingKind): ListingKindInfo {
  const info = BY_KIND.get(kind);
  if (!info) throw new Error(`Unknown listing kind: ${kind}`);
  return info;
}
