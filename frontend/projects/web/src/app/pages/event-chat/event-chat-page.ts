import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CHAT_CONNECTION, CHAT_HISTORY, type ChatMessageDto } from '@cf/api';
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
import { chatTime, withChatMessage, withEarlierMessages } from '@cf/domain';
import type { Observable } from 'rxjs';
import { HttpChatHistoryService } from '../../services/http-chat-history.service';
import { SignalRChatConnection } from '../../services/signalr-chat-connection';

/** The most messages that failed to send the screen keeps for the member to try again. */
const MAX_UNSENT = 20;

/** A message of mine that could not be sent: its text is kept until it is sent or the screen closes. */
interface Unsent {
  id: string;
  text: string;
}

/**
 * An event's group chat at `/events/:id/chat` (L2-016; slice 12.1; ADR 0039): the thread and the
 * composer of the design system's messages screen, for one event. `CHAT_CONNECTION` is bound here,
 * so the one connection to the hub lives only while the screen does and stops when it is destroyed.
 * The page keeps at most 200 messages. Opening says "Opening chat" while it joins and loads the
 * latest 50 stored messages (slice 12.2; ADR 0040); a member who is not registered
 * (`not_a_participant`) is told so, and any other failure shows "This chat didn't open" with Try
 * again. Earlier messages load 50 at a time above the first, by the thread's button or by scrolling
 * up; when they push the newest off the end of the window, live messages are not added out of place
 * and "Back to the latest messages" reloads the end. A message that cannot be sent stays in the
 * thread marked "Not sent", and Try again sends it again.
 */
@Component({
  selector: 'cf-event-chat-page',
  imports: [Button, Composer, EmptyState, Link, Skeleton, SkeletonRegion, Thread],
  providers: [
    { provide: CHAT_CONNECTION, useClass: SignalRChatConnection },
    { provide: CHAT_HISTORY, useClass: HttpChatHistoryService },
  ],
  templateUrl: './event-chat-page.html',
  styleUrl: './event-chat-page.scss',
})
export class EventChatPage {
  private readonly chat = inject(CHAT_CONNECTION);
  private readonly history = inject(CHAT_HISTORY);
  private readonly destroyRef = inject(DestroyRef);
  private id = '';

  protected readonly eventHref = signal('/events');
  protected readonly state = signal<'connecting' | 'open' | 'refused' | 'failed'>('connecting');
  protected readonly title = signal('');
  protected readonly hasEarlier = signal(false);
  protected readonly loadingEarlier = signal(false);
  protected readonly earlierFailed = signal(false);
  /** False once older messages pushed the newest off the end of the window. */
  protected readonly atLatest = signal(true);
  private readonly unsent = signal<readonly Unsent[]>([]);
  private unsentCount = 0;
  private readonly memberId = signal('');
  private readonly window = signal<readonly ChatMessageDto[]>([]);
  protected readonly entries = computed<ThreadEntry[]>(() => [
    ...this.window().map((message): ThreadEntry => {
      const mine = message.authorId === this.memberId();
      return {
        kind: 'message',
        id: message.id,
        text: message.text,
        time: chatTime(message.sentAt),
        ...(mine ? { mine: true } : { author: message.author }),
      };
    }),
    ...this.unsent().map((message): ThreadEntry => ({
      kind: 'message',
      id: message.id,
      text: message.text,
      time: '',
      mine: true,
      failed: true,
    })),
  ]);

  constructor() {
    this.chat.messages.pipe(takeUntilDestroyed()).subscribe((message) => {
      if (message.eventId === this.id && this.atLatest()) {
        this.window.update((held) => withChatMessage(held, message));
      }
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

  /** Sends the member's message; a refusal or failure leaves it in the thread, marked "Not sent". */
  protected async send(text: string): Promise<void> {
    try {
      const answer = await this.chat.send(this.id, text);
      if (answer.code === null) return;
    } catch {
      // The connection is down: the message is kept below.
    }
    if (this.destroyRef.destroyed) return;
    this.unsentCount += 1;
    const kept = { id: `unsent-${this.unsentCount}`, text };
    this.unsent.update((held) => [...held, kept].slice(-MAX_UNSENT));
  }

  /** Sends a message that failed again; it leaves the thread's end until the send answers. */
  protected retrySend(id: string): void {
    const message = this.unsent().find((held) => held.id === id);
    if (!message) return;
    this.unsent.update((held) => held.filter((other) => other.id !== id));
    void this.send(message.text);
  }

  /** Loads the 50 messages before the oldest one held, above it. */
  protected async loadEarlier(): Promise<void> {
    const oldest = this.window()[0];
    if (!oldest || this.loadingEarlier()) return;
    this.loadingEarlier.set(true);
    this.earlierFailed.set(false);
    try {
      const page = await this.once(this.history.before(this.id, oldest.id));
      if (this.destroyRef.destroyed) return;
      const next = withEarlierMessages(this.window(), page.messages);
      this.window.set(next.messages);
      this.hasEarlier.set(page.hasMore);
      if (next.droppedNewest) this.atLatest.set(false);
    } catch {
      if (!this.destroyRef.destroyed) this.earlierFailed.set(true);
    } finally {
      this.loadingEarlier.set(false);
    }
  }

  /** Reloads the latest 50 after older messages pushed the newest out of the window. */
  protected async loadLatest(): Promise<void> {
    try {
      const page = await this.once(this.history.latest(this.id));
      if (this.destroyRef.destroyed) return;
      this.window.set(page.messages);
      this.hasEarlier.set(page.hasMore);
      this.atLatest.set(true);
    } catch {
      if (!this.destroyRef.destroyed) this.earlierFailed.set(true);
    }
  }

  /** The one answer of an HTTP call, left unsettled if the screen is destroyed first. */
  private once<T>(source: Observable<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      source
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: resolve, error: (error: unknown) => reject(error) });
    });
  }

  private async open(): Promise<void> {
    this.state.set('connecting');
    this.window.set([]);
    this.unsent.set([]);
    this.hasEarlier.set(false);
    this.earlierFailed.set(false);
    this.atLatest.set(true);
    try {
      const answer = await this.chat.join(this.id);
      if (this.destroyRef.destroyed) return;
      if (answer.code === 'not_a_participant') {
        this.state.set('refused');
      } else if (answer.code !== null) {
        this.state.set('failed');
      } else {
        const page = await this.once(this.history.latest(this.id));
        if (this.destroyRef.destroyed) return;
        // Messages that arrived while the history loaded are already in the window; keep them.
        let held: readonly ChatMessageDto[] = page.messages;
        for (const message of this.window()) held = withChatMessage(held, message);
        this.window.set(held);
        this.hasEarlier.set(page.hasMore);
        this.title.set(answer.title ?? '');
        this.memberId.set(answer.memberId ?? '');
        this.state.set('open');
      }
    } catch {
      if (!this.destroyRef.destroyed) this.state.set('failed');
    }
  }
}
