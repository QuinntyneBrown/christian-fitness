import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CHAT_CONNECTION, type ChatMessageDto } from '@cf/api';
import {
  Button,
  Composer,
  EmptyState,
  Link,
  Skeleton,
  SkeletonRegion,
  Thread,
  type ThreadEntry,
} from '@cf/components';
import { chatTime, withChatMessage } from '@cf/domain';
import { SignalRChatConnection } from '../../services/signalr-chat-connection';

/**
 * An event's group chat at `/events/:id/chat` (L2-016; slice 12.1; ADR 0039): the thread and the
 * composer of the design system's messages screen, for one event. `CHAT_CONNECTION` is bound here,
 * so the one connection to the hub lives only while the screen does and stops when it is destroyed.
 * The page keeps at most 200 messages. Opening says "Opening chat" while it joins; a member who is
 * not registered (`not_a_participant`) is told so, and any other failure shows "This chat didn't
 * open" with Try again. A message that cannot be sent shows a generic line; retrying a failed send
 * waits for slice 12.2.
 */
@Component({
  selector: 'cf-event-chat-page',
  imports: [Button, Composer, EmptyState, Link, Skeleton, SkeletonRegion, Thread],
  providers: [{ provide: CHAT_CONNECTION, useClass: SignalRChatConnection }],
  templateUrl: './event-chat-page.html',
  styleUrl: './event-chat-page.scss',
})
export class EventChatPage {
  private readonly chat = inject(CHAT_CONNECTION);
  private readonly destroyRef = inject(DestroyRef);
  private id = '';

  protected readonly eventHref = signal('/events');
  protected readonly state = signal<'connecting' | 'open' | 'refused' | 'failed'>('connecting');
  protected readonly title = signal('');
  protected readonly sendFailed = signal(false);
  private readonly memberId = signal('');
  private readonly window = signal<readonly ChatMessageDto[]>([]);
  protected readonly entries = computed<ThreadEntry[]>(() =>
    this.window().map((message) => {
      const mine = message.authorId === this.memberId();
      return {
        kind: 'message',
        id: message.id,
        text: message.text,
        time: chatTime(message.sentAt),
        ...(mine ? { mine: true } : { author: message.author }),
      };
    }),
  );

  constructor() {
    this.chat.messages.pipe(takeUntilDestroyed()).subscribe((message) => {
      if (message.eventId === this.id) this.window.update((held) => withChatMessage(held, message));
    });
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = params.get('id') ?? '';
        this.eventHref.set(`/events/${this.id}`);
        void this.open();
      });
  }

  /** Joins the chat again, in place. */
  protected retry(): void {
    void this.open();
  }

  /** Sends the member's message; any refusal or failure shows one generic line. */
  protected async send(text: string): Promise<void> {
    this.sendFailed.set(false);
    try {
      const answer = await this.chat.send(this.id, text);
      if (answer.code !== null) this.sendFailed.set(true);
    } catch {
      this.sendFailed.set(true);
    }
  }

  private async open(): Promise<void> {
    this.state.set('connecting');
    this.window.set([]);
    try {
      const answer = await this.chat.join(this.id);
      if (this.destroyRef.destroyed) return;
      if (answer.code === 'not_a_participant') {
        this.state.set('refused');
      } else if (answer.code !== null) {
        this.state.set('failed');
      } else {
        this.title.set(answer.title ?? '');
        this.memberId.set(answer.memberId ?? '');
        this.state.set('open');
      }
    } catch {
      if (!this.destroyRef.destroyed) this.state.set('failed');
    }
  }
}
