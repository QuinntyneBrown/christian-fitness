import type {
  ListingCheckSlug,
  ListingKind,
  SuggestionCheckDto,
  SuggestionClaimState,
  SuggestionDetailDto,
  SuggestionSummaryDto,
} from '@cf/api';
import { applicationSent } from '../services/application-sent';
import { SUGGESTION_KINDS } from './suggestion-form';

/** One of the four checks: its slug, its name and the standard it stands for (L2-073 AC3). */
export interface ListingCheckInfo {
  check: ListingCheckSlug;
  label: string;
  standard: string;
}

/** The four checks in the panel's order (mock `admin-listings/default`). */
export const LISTING_CHECKS: readonly ListingCheckInfo[] = [
  {
    check: 'credentials',
    label: 'Credentials',
    standard: 'Certification or registration number verified with the issuing body',
  },
  {
    check: 'insurance',
    label: 'Insurance',
    standard: 'Liability coverage on file, where the work calls for it',
  },
  {
    check: 'two-references',
    label: 'Two references',
    standard: 'At least one from a church or ministry leader',
  },
  {
    check: 'conversation',
    label: 'Conversation',
    standard: 'A call with our team about faith and how they work',
  },
];

/** The hint beside a disabled Approve listing (L2-073 AC5). */
export const APPROVE_HINT = 'Approve unlocks when all four checks pass.';

/** A kind by its singular name, as the eyebrow and the card show it ("Church Ministry"). */
export function kindLabel(kind: ListingKind): string {
  return SUGGESTION_KINDS.find((option) => option.value === kind)?.label ?? kind;
}

/**
 * When a suggestion was sent, as its card shows it: "Yesterday" for one day ago, otherwise as an
 * application's ("4 hours ago", "3 days ago", "Mar 3, 2026").
 */
export function suggestionAge(submittedAt: string, now: Date): string {
  const ago = applicationSent(submittedAt, now);
  return ago === '1 day ago' ? 'Yesterday' : ago;
}

/** A card's second line: "Organization · Danforth & Pape". */
export function suggestionKindAndArea(suggestion: SuggestionSummaryDto): string {
  return `${kindLabel(suggestion.kind)} · ${suggestion.area}`;
}

/** A card's third line: "From Adaeze Kalu · 4 hours ago" or "Self-submitted · Yesterday". */
export function suggestionFromLine(suggestion: SuggestionSummaryDto, now: Date): string {
  const who = suggestion.from === null ? 'Self-submitted' : `From ${suggestion.from}`;
  return `${who} · ${suggestionAge(suggestion.submittedAt, now)}`;
}

const RELATION_WORDS: Record<SuggestionDetailDto['relation'], string> = {
  myself: '',
  'someone-i-know': 'knows them',
  'somewhere-ive-been': 'attended',
};

/**
 * Who sent it and how they know them (L2-073 AC3): "Submitted by the listing themselves", or
 * "Jordan Reid · knows them" and "Adaeze Kalu · attended". A sender no longer known reads
 * "A member".
 */
export function suggestionByLine(suggestion: SuggestionDetailDto): string {
  if (suggestion.relation === 'myself') return 'Submitted by the listing themselves';
  return `${suggestion.from ?? 'A member'} · ${RELATION_WORDS[suggestion.relation]}`;
}

/** The website as the panel names it: no scheme, no trailing slash ("delaneyperformance.ca"). */
export function websiteLabel(website: string): string {
  return website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/** How many of the four checks passed. */
export function passedCount(checks: readonly SuggestionCheckDto[]): number {
  return LISTING_CHECKS.filter((info) =>
    checks.some((check) => check.check === info.check && check.passed),
  ).length;
}

/**
 * How an approval's claim went on this visit (`email`, `message`, ADR 0090), or where it stands when
 * read (ADR 0091).
 */
export type SuggestionClaim = 'email' | 'message' | SuggestionClaimState;

/**
 * What the panel says once a suggestion is decided (L2-073 AC6, AC8; L2-078 AC7): the claim link
 * was sent, the listed party said it isn't them, or the listing is in the directory as
 * staff-managed, or the sender was told of a decline. Otherwise it says only how it was decided.
 */
export function decisionResult(
  status: 'approved' | 'declined',
  claim: SuggestionClaim | null = null,
): string {
  if (status === 'declined') return 'Declined. The person who suggested it has been told.';
  if (claim === 'staff-managed') return 'Approved. It’s in the directory now, managed by our team.';
  if (claim === 'declined')
    return 'Approved. They said this listing isn’t them, so it wasn’t published.';
  if (claimResendable(claim))
    return 'Approved. We’ve sent them a link to claim and publish their listing.';
  return 'Approved.';
}

/** Whether staff may send a new claim link: one went out and is open or expired (ADR 0091). */
export function claimResendable(claim: SuggestionClaim | null): boolean {
  return claim === 'email' || claim === 'message' || claim === 'sent' || claim === 'expired';
}

/**
 * Why a check, an approval or a decline did not go through: `decided` when another member of
 * staff decided the suggestion first (409 `suggestion_decided`) or it is gone (404
 * `suggestion_not_found`), so the list is stale; otherwise `failed`.
 */
export function reviewRefusalOf(error: unknown): 'decided' | 'failed' {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  if (status === 409 && code === 'suggestion_decided') return 'decided';
  if (status === 404 && code === 'suggestion_not_found') return 'decided';
  return 'failed';
}

/** The longest decline reason staff may keep (L2-073 AC8; ADR 0090). */
export const SUGGESTION_DECLINE_REASON_MAX = 500;

/** The decline reason's hint (mock `decline-suggestion/default`); the field adds the characters left. */
export const SUGGESTION_DECLINE_HINT =
  'Staff keep this on file. The person who suggested it is not sent it.';

/** What the decline dialog says of the optional reason, or null when it is fine. */
export function suggestionDeclineProblem(reason: string): string | null {
  return reason.trim().length > SUGGESTION_DECLINE_REASON_MAX
    ? 'Use 500 characters or fewer'
    : null;
}

/** The decline dialog's alert when a decline did not go through (mocks `failed`, `refused`). */
export function suggestionDeclineFailure(refusal: 'decided' | 'failed'): {
  heading: string;
  text: string;
} {
  return refusal === 'decided'
    ? {
        heading: 'This suggestion was already decided',
        text: 'Someone else approved or declined it. Close this to see it as it is now.',
      }
    : {
        heading: "Couldn't decline the suggestion",
        text: "The server didn't respond. Nothing was lost; try again.",
      };
}

/** A decided suggestion's tag on its card: "Approved" or "Declined"; none while it waits. */
export function decisionTag(status: 'waiting' | 'approved' | 'declined'): string | undefined {
  if (status === 'approved') return 'Approved';
  if (status === 'declined') return 'Declined';
  return undefined;
}

/** "3 of 4 passed". */
export function passedLine(checks: readonly SuggestionCheckDto[]): string {
  return `${passedCount(checks)} of ${LISTING_CHECKS.length} passed`;
}
