import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CONVERSATIONS } from '@cf/api';
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
import type { Subscription } from 'rxjs';
import { HttpConversationsService } from '../../services/http-conversations.service';

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
 * Messages at `/messages` (L2-015 AC1, AC2; ADR 0042): the member's conversations from
 * `CONVERSATIONS`, bound here so the client lives only while the screen does, newest first as the
 * API gives them (at most 50). Each row is the design system's conversation row (the avatar, the
 * name, an event group's member count, the last message, its time and the unread count) and opens
 * the conversation as its own screen. A member in none sees "No messages yet" with a link to
 * Events. While it loads it shows skeletons; a failure shows "Messages didn't load" with Try
 * again, which asks again in place (a 5xx is the server-error screen's).
 */
@Component({
  selector: 'cf-messages-page',
  imports: [Avatar, Button, Container, EmptyState, List, MiniRow, Skeleton, SkeletonRegion],
  providers: [{ provide: CONVERSATIONS, useClass: HttpConversationsService }],
  templateUrl: './messages-page.html',
  styleUrl: './messages-page.scss',
})
export class MessagesPage {
  private readonly conversations = inject(CONVERSATIONS);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly rows = signal<readonly ConversationRow[]>([]);
  protected readonly skeletons = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  constructor() {
    this.load();
  }

  /** Asks for the list again, in place. */
  protected retry(): void {
    this.load();
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.conversations
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          const now = new Date();
          this.rows.set(
            list.map((c) => ({
              id: `${c.kind}:${c.id}`,
              href: conversationHref(c.kind, c.id),
              name: c.name,
              group: c.kind === 'group',
              meta: groupMemberCount(c.memberCount),
              text: conversationPreview(c.lastMessage),
              time: conversationTime(c.lastMessage?.sentAt ?? c.activityAt, now),
              unread: c.unreadCount,
            })),
          );
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; anything else shows the failed state.
        error: () => this.state.set('failed'),
      });
  }
}
