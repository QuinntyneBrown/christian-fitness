import type { ConversationSummaryDto } from '@cf/api';
import { conversationHref, conversationPreview, conversationTime } from '../chat/conversation-row';

/** The most conversations Home's Messages aside shows (mock `home/default`; ADR 0045). */
export const HOME_MESSAGES_LIMIT = 3;

/** One conversation row in Home's Messages aside. */
export interface HomeMessageRowView {
  id: string;
  href: string;
  name: string;
  group: boolean;
  text: string;
  time: string;
  unread: number;
}

/** Total unread messages across the caller's conversations, for the navigation badge (L2-008 AC3). */
export function totalUnreadOf(conversations: readonly ConversationSummaryDto[]): number {
  let total = 0;
  for (const conversation of conversations) {
    total += Math.max(conversation.unreadCount, 0);
  }
  return total;
}

/** Up to three newest conversations formatted for Home's Messages aside (L2-007 AC4; ADR 0045). */
export function homeMessageRowsOf(
  conversations: readonly ConversationSummaryDto[],
  now: Date,
): HomeMessageRowView[] {
  return conversations.slice(0, HOME_MESSAGES_LIMIT).map((c) => ({
    id: `${c.kind}:${c.id}`,
    href: conversationHref(c.kind, c.id),
    name: c.name,
    group: c.kind === 'group',
    text: conversationPreview(c.lastMessage),
    time: conversationTime(c.lastMessage?.sentAt ?? c.activityAt, now),
    unread: c.unreadCount,
  }));
}
