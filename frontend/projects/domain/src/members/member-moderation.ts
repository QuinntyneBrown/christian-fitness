import type { MemberStatus, ModerationAction } from '@cf/api';

/** The longest note the API keeps (L2-029 AC5). */
export const MODERATION_NOTE_MAX = 500;

/** One thing to fix before a moderation is sent: its sentence and the field it belongs to. */
export interface ModerationProblem {
  field: 'note' | 'confirmed';
  text: string;
}

/**
 * What the dialog says when the API refuses (ADR 0025): `self` for staff's own account, `role`
 * for a Moderator moderating staff, `changed` when the member's status moved or the member is
 * gone, and `failed` for anything else.
 */
export type ModerationRefusal = 'self' | 'role' | 'changed' | 'failed';

/**
 * What a member's status lets staff do, the milder first (L2-029 AC1, AC2; ADR 0025): an Active
 * member can be flagged or suspended, a Flagged one suspended, a Suspended one neither (reinstate
 * is slice 27.2).
 */
export function moderationActionsOf(status: MemberStatus): readonly ModerationAction[] {
  if (status === 'active') return ['flag', 'suspend'];
  return status === 'flagged' ? ['suspend'] : [];
}

/** The dialog's title: "Moderate" when there is a choice to make, the one action when there is not. */
export function moderationTitle(name: string, status: MemberStatus): string {
  return moderationActionsOf(status).length > 1 ? `Moderate ${name}` : `Suspend ${name}`;
}

/** The button that sends the change. */
export function moderationSubmitLabel(action: ModerationAction): string {
  return action === 'flag' ? 'Flag member' : 'Suspend member';
}

/**
 * What is missing before `action` can be sent (L2-029 AC5), in the order of the fields: a note
 * (blank counts as none, and it is measured trimmed, as the API keeps it) and, for a suspension,
 * the confirmation, which names the member.
 */
export function moderationProblems(
  action: ModerationAction,
  note: string,
  confirmed: boolean,
  name: string,
): ModerationProblem[] {
  const problems: ModerationProblem[] = [];
  const length = note.trim().length;
  if (length === 0) {
    problems.push({ field: 'note', text: 'Write a note so other staff know why' });
  } else if (length > MODERATION_NOTE_MAX) {
    problems.push({ field: 'note', text: 'Use 500 characters or fewer' });
  }
  if (action === 'suspend' && !confirmed) {
    problems.push({ field: 'confirmed', text: `Confirm that ${name} should be suspended` });
  }
  return problems;
}

/** The error summary's heading: "1 thing to fix" or "2 things to fix". */
export function moderationProblemsHeading(count: number): string {
  return `${count} ${count === 1 ? 'thing' : 'things'} to fix`;
}

/** Each refusal is its status and its code together; anything else is a failure. */
export function moderationRefusalOf(error: unknown): ModerationRefusal {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  if (status === 403 && code === 'cannot_moderate_self') return 'self';
  if (status === 403 && code === 'forbidden_role') return 'role';
  if (status === 409 && code === 'status_conflict') return 'changed';
  if (status === 404 && code === 'member_not_found') return 'changed';
  return 'failed';
}

/** The alert the dialog shows for a refusal: its heading and its sentence of next steps. */
export function moderationRefusalMessage(refusal: ModerationRefusal): {
  heading: string;
  text: string;
} {
  switch (refusal) {
    case 'self':
      return {
        heading: "You can't flag or suspend your own account",
        text: 'Ask another Admin if your own account needs attention.',
      };
    case 'role':
      return {
        heading: 'Only an Admin can flag or suspend staff',
        text: 'Ask an Admin to look at this account.',
      };
    case 'changed':
      return {
        heading: 'This member has changed',
        text: 'Someone else may have moderated them. Close this and look at the list again.',
      };
    default:
      return {
        heading: "Couldn't save the change",
        text: "The server didn't respond. Your note is still here; try again.",
      };
  }
}

/** The toast after a change (mocks `admin-toast/member-flagged`, `member-suspended`). */
export function moderationToast(
  action: ModerationAction,
  name: string,
): { title: string; text: string } {
  return action === 'flag'
    ? { title: `${name} flagged`, text: 'They can still use the app. Your note is on their row.' }
    : { title: `${name} suspended`, text: 'They are signed out everywhere and cannot sign in.' };
}
