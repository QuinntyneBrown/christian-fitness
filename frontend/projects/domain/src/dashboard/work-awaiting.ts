import type { WorkAwaitingStaffDto } from '@cf/api';
import { storyWhen } from '../news/story-list';

/** One waiting item: what to read, and the admin screen that resolves it. */
export interface AwaitingRow {
  id: string;
  title: string;
  /** The line under the title: the role and when, or staff's note. */
  meta: string;
  href: string;
  /** The action's word: Check for the suggestions, Review otherwise (mock admin-dashboard). */
  action: 'Check' | 'Review';
}

/** A "see all" link, shown only when more wait than the Dashboard names. */
export interface AwaitingMore {
  label: string;
  href: string;
}

/** Where a pending application is resolved, and the Members list a flagged member is in. */
export const APPLICATIONS_HREF = '/services';
export const FLAGGED_MEMBERS_HREF = '/members?status=flagged';
/** Where the listing suggestions are checked (ADR 0090). */
export const SUGGESTIONS_HREF = '/listings';
/** Where all the stories In review are listed (ADR 0097). */
export const STORIES_IN_REVIEW_HREF = '/stories?status=review';

const dayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

function dayOf(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '' : dayFormat.format(at);
}

/**
 * The waiting items as rows: each story In review, opened in the editor (ADR 0097), the
 * suggestions' one line (ADR 0090), the applications and then the flagged members, each in the
 * order the API gave (oldest first). A story says who wrote it and when it was submitted, from `now`. A flagged member with no note says so. Names and notes stay
 * the text they are; the screen renders them as text. A Moderator's answer has no applications,
 * so it has no application rows.
 */
export function awaitingRowsOf(awaiting: WorkAwaitingStaffDto, now: Date): AwaitingRow[] {
  const stories = (awaiting.stories?.items ?? []).map((s) => {
    const when = storyWhen('review', s.submittedAt, now);
    return {
      id: `story-${s.id}`,
      title: `“${s.headline}” is ready for review`,
      meta: [s.author, when].filter(Boolean).join(' · '),
      href: `/stories/${encodeURIComponent(s.id)}`,
      action: 'Review' as const,
    };
  });
  const applications = (awaiting.applications?.items ?? []).map((a) => {
    const day = dayOf(a.submittedAt);
    return {
      id: `application-${a.id}`,
      title: `${a.name} applied to list services`,
      meta: day ? `${a.role} · ${day}` : a.role,
      href: APPLICATIONS_HREF,
      action: 'Review' as const,
    };
  });
  const flagged = awaiting.flaggedMembers.items.map((m) => ({
    id: `member-${m.id}`,
    title: `${m.name} was flagged`,
    meta: m.note?.trim() || 'No note',
    href: FLAGGED_MEMBERS_HREF,
    action: 'Review' as const,
  }));
  return [...stories, ...suggestionsRowOf(awaiting), ...applications, ...flagged];
}

/** The suggestions as one line naming the oldest few, or none when none waits (L2-020 AC11). */
function suggestionsRowOf(awaiting: WorkAwaitingStaffDto): AwaitingRow[] {
  const { total, items } = awaiting.suggestions;
  if (total <= 0) return [];
  return [
    {
      id: 'suggestions',
      title:
        total === 1 ? '1 listing suggested by a member' : `${total} listings suggested by members`,
      meta: items.map((s) => s.name).join(', '),
      href: SUGGESTIONS_HREF,
      action: 'Check',
    },
  ];
}

/** Everything waiting, for the heading's count. */
export function awaitingTotalOf(awaiting: WorkAwaitingStaffDto): number {
  return (
    (awaiting.stories?.total ?? 0) +
    awaiting.suggestions.total +
    (awaiting.applications?.total ?? 0) +
    awaiting.flaggedMembers.total
  );
}

/** The "All N ..." links for a list that holds more than the Dashboard names. */
export function awaitingMoreOf(awaiting: WorkAwaitingStaffDto): AwaitingMore[] {
  const more: AwaitingMore[] = [];
  const stories = awaiting.stories;
  if (stories && stories.total > stories.items.length) {
    more.push({ label: `All ${stories.total} stories in review`, href: STORIES_IN_REVIEW_HREF });
  }
  const applications = awaiting.applications;
  if (applications && applications.total > applications.items.length) {
    more.push({ label: `All ${applications.total} pending applications`, href: APPLICATIONS_HREF });
  }
  const flagged = awaiting.flaggedMembers;
  if (flagged.total > flagged.items.length) {
    more.push({ label: `All ${flagged.total} flagged members`, href: FLAGGED_MEMBERS_HREF });
  }
  return more;
}

/** Whether the answer carries applications: a Moderator's does not. */
export function seesApplications(awaiting: WorkAwaitingStaffDto): boolean {
  return awaiting.applications !== undefined;
}
