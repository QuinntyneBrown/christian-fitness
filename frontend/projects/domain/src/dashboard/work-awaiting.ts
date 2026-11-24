import type { WorkAwaitingStaffDto } from '@cf/api';

/** One waiting item: what to read, and the admin screen that resolves it. */
export interface AwaitingRow {
  id: string;
  title: string;
  /** The line under the title: the role and when, or staff's note. */
  meta: string;
  href: string;
}

/** A "see all" link, shown only when more wait than the Dashboard names. */
export interface AwaitingMore {
  label: string;
  href: string;
}

/** Where a pending application is resolved, and the Members list a flagged member is in. */
export const APPLICATIONS_HREF = '/services';
export const FLAGGED_MEMBERS_HREF = '/members?status=flagged';

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
 * The waiting items as rows, the applications first and then the flagged members, each in the
 * order the API gave (oldest first). A flagged member with no note says so. Names and notes stay
 * the text they are; the screen renders them as text. A Moderator's answer has no applications,
 * so it has no application rows.
 */
export function awaitingRowsOf(awaiting: WorkAwaitingStaffDto): AwaitingRow[] {
  const applications = (awaiting.applications?.items ?? []).map((a) => {
    const day = dayOf(a.submittedAt);
    return {
      id: `application-${a.id}`,
      title: `${a.name} applied to list services`,
      meta: day ? `${a.role} · ${day}` : a.role,
      href: APPLICATIONS_HREF,
    };
  });
  const flagged = awaiting.flaggedMembers.items.map((m) => ({
    id: `member-${m.id}`,
    title: `${m.name} was flagged`,
    meta: m.note?.trim() || 'No note',
    href: FLAGGED_MEMBERS_HREF,
  }));
  return [...applications, ...flagged];
}

/** Everything waiting, for the heading's count. */
export function awaitingTotalOf(awaiting: WorkAwaitingStaffDto): number {
  return (awaiting.applications?.total ?? 0) + awaiting.flaggedMembers.total;
}

/** The "All N ..." links for a list that holds more than the Dashboard names. */
export function awaitingMoreOf(awaiting: WorkAwaitingStaffDto): AwaitingMore[] {
  const more: AwaitingMore[] = [];
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
