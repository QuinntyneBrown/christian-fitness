import type {
  FeedbackCountsDto,
  FeedbackKind,
  FeedbackNoteDto,
  FeedbackRowDto,
  FeedbackStatusName,
} from '@cf/api';
import { storyAge } from '../news/story-list';
import { FEEDBACK_KINDS } from './feedback-form';

/** The longest reply (L2-074 AC5). */
export const FEEDBACK_REPLY_MAX = 2000;

/** A kind's name, the same as the form's (L2-074 AC1). */
export function feedbackKindLabel(kind: FeedbackKind): string {
  return FEEDBACK_KINDS.find((option) => option.value === kind)?.label ?? '';
}

const STATUS_LABELS: Record<FeedbackStatusName, string> = {
  new: 'New',
  replied: 'Replied',
  resolved: 'Resolved',
};

export function feedbackStatusLabel(status: FeedbackStatusName): string {
  return STATUS_LABELS[status];
}

/** The status a `?status=` names, or none for All and anything else. */
export function feedbackStatusOf(param: string | null): FeedbackStatusName | null {
  return param === 'new' || param === 'replied' || param === 'resolved' ? param : null;
}

/** The inbox's address for a tab and a chosen note. */
export function feedbackHref(status: FeedbackStatusName | null, note?: string): string {
  const query = [
    status ? `status=${status}` : '',
    note ? `note=${encodeURIComponent(note)}` : '',
  ].filter((part) => part);
  return query.length > 0 ? `/feedback?${query.join('&')}` : '/feedback';
}

/** The tabs All, New, Replied and Resolved, each with its count once known (L2-074 AC2). */
export function feedbackTabs(
  counts: FeedbackCountsDto | null,
): { label: string; href: string; count?: number }[] {
  return [
    { label: 'All', href: feedbackHref(null), count: counts?.all },
    { label: 'New', href: feedbackHref('new'), count: counts?.new },
    { label: 'Replied', href: feedbackHref('replied'), count: counts?.replied },
    { label: 'Resolved', href: feedbackHref('resolved'), count: counts?.resolved },
  ];
}

/** One row of the inbox, in words. */
export interface FeedbackRowView {
  id: string;
  href: string;
  kind: FeedbackKind;
  from: string;
  /** "35 min ago", "Yesterday" or "Apr 8". */
  when: string;
  text: string;
  /** The kind and status for assistive technology: "Something’s off, New". */
  label: string;
  /** New notes show their sender in bold (L2-074 AC1). */
  isNew: boolean;
}

export function feedbackRowOf(
  row: FeedbackRowDto,
  tab: FeedbackStatusName | null,
  now: Date,
): FeedbackRowView {
  return {
    id: row.id,
    href: feedbackHref(tab, row.id),
    kind: row.kind,
    from: row.sender,
    when: storyAge(row.sentAt, now),
    text: row.excerpt,
    label: `${feedbackKindLabel(row.kind)}, ${feedbackStatusLabel(row.status)}`,
    isNew: row.status === 'new',
  };
}

/** Who "Reply to <first name>" names: the first word of the sender's name, or "the member". */
export function feedbackFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'the member';
}

const REPLY_HINTS: Record<FeedbackKind, string> = {
  idea: 'Tell them what happens next with the idea',
  problem: 'Let them know we can reproduce it and when to expect a fix',
  correction: 'Thank them and say when the correction is live',
  thanks: 'Say thanks, and let them know who you passed it on to',
};

/** A hint for the reply that suits the kind (L2-074 AC3). */
export function feedbackReplyHint(kind: FeedbackKind): string {
  return REPLY_HINTS[kind];
}

/** What is wrong with a reply, or nothing: an empty one is not sent (L2-074 AC5). */
export function checkFeedbackReply(text: string): string | null {
  const reply = text.trim();
  if (!reply) return 'Write a reply before sending.';
  return reply.length > FEEDBACK_REPLY_MAX ? 'Use 2,000 characters or fewer.' : null;
}

/**
 * Where a note was sent from (L2-074 AC3): the area its route is in and the page's title, such as
 * "Events › Easter Sunrise 5K"; "Story › <headline>" for a note about a story.
 */
export function feedbackSentFrom(page: FeedbackNoteDto['page'], storyId: string | null): string {
  const segment = page.routeTemplate?.split('/').find((part) => part && !part.startsWith(':'));
  const area = storyId
    ? 'Story'
    : segment
      ? `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
      : '';
  const title = page.title?.trim() ?? '';
  return [area, title].filter((part) => part).join(' › ') || 'Not recorded';
}

/** The toast after a reply (L2-074 AC5): an email reply says so; a message does not claim one. */
export function feedbackReplyToast(
  deliveredBy: 'email' | 'message',
  name: string,
): { title: string; text: string } {
  return {
    title: 'Reply sent',
    text:
      deliveredBy === 'email'
        ? `Reply sent. ${name} gets it by email.`
        : `${name} gets it as a message from Christian Fitness.`,
  };
}
