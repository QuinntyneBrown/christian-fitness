import type { ApiError, ClaimPreviewDto } from '@cf/api';
import { listingKindInfo } from './listing-kinds';
import { websiteLinkOf } from './listing-profile-view';
import { listingInitials } from './listing-row-view';

/**
 * Where a claim link ends when it cannot be answered (L2-078 AC8, AC9; ADR 0091): already used,
 * expired or voided, unknown, or anything else, which is a failure the screen offers to retry.
 */
export type ClaimOutcome = 'claimed' | 'expired' | 'not-found' | 'failed';

/** What a refused read, publish or decline means for the screen; the code is never shown. */
export function claimOutcomeOf(error: unknown): ClaimOutcome {
  const api = typeof error === 'object' && error !== null ? (error as Partial<ApiError>) : {};
  if (api.code === 'claim_link_used') return 'claimed';
  if (api.code === 'claim_link_expired') return 'expired';
  if (api.code === 'claim_not_found') return 'not-found';
  return 'failed';
}

// Made once on first use, not at import: the formatter is costly to create.
let dayInToronto: Intl.DateTimeFormat | undefined;

/** The day a link expires, in Toronto, as the screen words it: "December 9". */
export function claimExpiryText(expiresAt: string): string {
  return (dayInToronto ??= new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Toronto',
  })).format(new Date(expiresAt));
}

/** The line under the preview (ADR 0091): who is signed in, what publishing does, and the link's life. */
export function claimHintOf(member: string, expiresAt: string): string {
  return `Signed in as ${member}. Publishing makes you the owner, so you can edit it later. This link works once and expires on ${claimExpiryText(expiresAt)}.`;
}

/** One key fact of the preview: its label and what it says. */
export interface ClaimFact {
  term: string;
  description: string;
}

/** What the preview shows of a listing (L2-078 AC5): the head, and what it has of the rest. */
export interface ClaimPreviewView {
  kind: string;
  person: boolean;
  initials: string;
  photoSrc: string | null;
  /** Area, and Website when it is an https address; in that order. */
  facts: ClaimFact[];
}

/** A preview as the claim screen shows it; an empty field is left for the template to omit. */
export function claimPreviewViewOf(listing: ClaimPreviewDto): ClaimPreviewView {
  const kind = listingKindInfo(listing.kind);
  const website = websiteLinkOf(listing.website);
  const facts: ClaimFact[] = [];
  if (listing.area.trim() !== '') facts.push({ term: 'Area', description: listing.area });
  if (website !== null) facts.push({ term: 'Website', description: website.text });
  return {
    kind: kind.singular,
    person: kind.person,
    initials: listingInitials(listing.kind, listing.name),
    photoSrc:
      listing.photoKey === null
        ? null
        : `/api/directory/photos/${encodeURIComponent(listing.photoKey)}`,
    facts,
  };
}
