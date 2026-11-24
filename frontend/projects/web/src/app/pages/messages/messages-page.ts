import { Component, computed, inject } from '@angular/core';
import {
  Avatar,
  Button,
  Container,
  EmptyState,
  List,
  MiniRow,
  Skeleton,
  SkeletonRegion,
} from '@cf/components';
import {
  conversationHref,
  conversationPreview,
  conversationTime,
  groupMemberCount,
} from '@cf/domain';
import { MemberInbox } from '../../services/member-inbox';

/** One conversation as its row shows it. */
interface ConversationRow {
  id: string;
  href: string;
  name: string;
  group: boolean;
  meta: string;
  text: string;
  time: string;
  unread: number;
}

/**
 * Messages at `/messages` (L2-015 AC1, AC2; ADR 0042, 0045): the member's conversations from
 * `MemberInbox`, newest first as the API gives them (at most 50). Each row is the design system's
 * conversation row (the avatar, the name, an event group's member count, the last message, its time
 * and the unread count) and opens the conversation as its own screen. A member in none sees "No
 * messages yet" with a link to Events. While it loads it shows skeletons; a failure shows "Messages
 * didn't load" with Try again, which asks again in place (a 5xx is the server-error screen's).
 */
@Component({
  selector: 'cf-messages-page',
  imports: [Avatar, Button, Container, EmptyState, List, MiniRow, Skeleton, SkeletonRegion],
  templateUrl: './messages-page.html',
  styleUrl: './messages-page.scss',
})
export class MessagesPage {
  private readonly inbox = inject(MemberInbox);

  protected readonly state = this.inbox.state;
  protected readonly skeletons = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  protected readonly rows = computed<readonly ConversationRow[]>(() => {
    const now = new Date();
    return this.inbox.conversations().map((c) => ({
      id: `${c.kind}:${c.id}`,
      href: conversationHref(c.kind, c.id),
      name: c.name,
      group: c.kind === 'group',
      meta: groupMemberCount(c.memberCount),
      text: conversationPreview(c.lastMessage),
      time: conversationTime(c.lastMessage?.sentAt ?? c.activityAt, now),
      unread: c.unreadCount,
    }));
  });

  /** Asks for the list again, in place. */
  protected retry(): void {
    this.inbox.refresh();
  }
}
