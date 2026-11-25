import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CHAT_CONNECTION, CHAT_HISTORY, type ChatMessageDto, REPORTS_SERVICE } from '@cf/api';
import {
  Alert,
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
import { HttpReportsService } from '../../services/http-reports.service';

/** The most messages that failed to send the screen keeps for the member to try again. */
const MAX_UNSENT = 20;

/** A message of mine that could not be sent: its text is kept until it is sent or the screen closes. */
interface Unsent {
  id: string;
  text: string;
}

/**
 * An event's group chat at `/events/:id/chat` (L2-016; slice 12.1; ADR 0039): the thread and the
 * composer of the design system's messages screen, for one event. `CHAT_CONNECTION` is the member
 * shell's one connection (ADR 0083), which stays open when the screen closes; the screen's own
 * subscriptions end with it.
 * The page keeps at most 200 messages. Opening says "Opening chat" while it joins and loads the
 * latest 50 stored messages (slice 12.2; ADR 0040); a member who is not registered
 * (`not_a_participant`) is told so, and any other failure shows "This chat didn't open" with Try
 * again. Earlier messages load 50 at a time above the first, by the thread's button or by scrolling
 * up; when they push the newest off the end of the window, live messages are not added out of place
 * and "Back to the latest messages" reloads the end. A message that cannot be sent stays in the
 * thread marked "Not sent", and Try again sends it again. When staff cancel the event, from the
 * stored history or live (slice 12.3; ADR 0041), a notice replaces the composer. At
 * `/messages/:id` it is a private conversation with that member (slice 14.1; ADR 0043): the same
 * thread and composer, joined and sent through the direct hub methods, and a member who cannot be
 * messaged (`recipient_unavailable`) is told so. A message from another member can be reported
 * (slice 25.1; ADR 0000) from its Report button, which opens the dialog.
 */
@Component({
  selector: 'cf-event-chat-page',
  imports: [Alert, Button, Composer, EmptyState, Link, Skeleton, SkeletonRegion, Thread],
  providers: [
    { provide: CHAT_HISTORY, useClass: HttpChatHistoryService },
    { provide: REPORTS_SERVICE, useClass: HttpReportsService },
  ],
  templateUrl: './event-chat-page.html',
  styleUrl: './event-chat-page.scss',
})
export default class EventChatPage {
  private readonly chat = inject(CHAT_CONNECTION);
  private readonly history = inject(CHAT_HISTORY);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private id = '';
  /** A private conversation with the member `id` (slice 14.1; ADR 0043), not an event's group chat. */
  protected readonly direct = inject(ActivatedRoute).snapshot.data['direct'] === true;

  protected readonly eventHref = signal('/events');
  protected readonly state = signal<'connecting' | 'open' | 'refused' | 'failed'>('connecting');
  protected readonly title = signal('');
  /** True once staff cancelled the event: a notice replaces the composer (ADR 0041). */
  protected readonly cancelled = signal(false);
  protected readonly hasEarlier = signal(false);
  protected readonly loadingEarlier = signal(false);
  protected readonly earlierFailed = signal(false);
  /** False once older messages pushed the newest off the end of the window. */
  protected readonly atLatest = signal(true);
  private readonly unsent = signal<readonly Unsent[]>([]);
  private unsentCount = 0;
  /** A read marker is on its way; one that is asked for meanwhile is sent after it. */
  private marking = false;
  private markAgain = false;
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
        // The member is looking at it: it is read as it arrives (ADR 0042).
        if (message.authorId !== this.memberId()) this.markRead();
      }
    });
    this.chat.cancelled.pipe(takeUntilDestroyed()).subscribe((eventId) => {
      if (eventId === this.id) this.cancelled.set(true);
    });
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = params.get('id') ?? '';
        this.eventHref.set(this.direct ? '/messages' : `/events/${this.id}`);
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
      const answer = await this.chat.send(this.id, text, this.direct);
      if (answer.code === null) return;
    } catch {
      // The connection is down: the message is kept below.
    }
    if (this.destroyRef.destroyed) return;
    this.unsentCount += 1;
    const kept = { id: `unsent-${this.unsentCount}`, text };
    this.unsent.update((held) => [...held, kept].slice(-MAX_UNSENT));
  }

  /**
   * Opens the Report a message dialog for a message from another member (L2-017; slice 25.1; ADR
   * 0058). The dialog's code loads the first time it is wanted; it uses this screen's
   * `REPORTS_SERVICE`, and focus returns to the Report button when it closes.
   */
  protected async report(id: string): Promise<void> {
    const message = this.window().find((held) => held.id === id);
    if (!message) return;
    const { openReportMessageDialog } =
      await import('../../dialogs/report-message/report-message-dialog');
    if (this.destroyRef.destroyed) return;
    openReportMessageDialog(this.injector, {
      id: message.id,
      author: message.author,
      time: chatTime(message.sentAt),
    });
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
      const page = await this.once(this.history.before(this.id, oldest.id, this.direct));
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
      const page = await this.once(this.history.latest(this.id, this.direct));
      if (this.destroyRef.destroyed) return;
      this.window.set(page.messages);
      this.hasEarlier.set(page.hasMore);
      this.atLatest.set(true);
    } catch {
      if (!this.destroyRef.destroyed) this.earlierFailed.set(true);
    }
  }

  /**
   * Tells the server the chat was read, so its unread count on Messages is zero (L2-016 AC7). One
   * request is in flight at a time; a message that arrives meanwhile asks for another after it. It is
   * not tied to the screen, which may be going; a failure is left, and the next one sets it.
   */
  private markRead(): void {
    if (this.marking) {
      this.markAgain = true;
      return;
    }
    this.marking = true;
    this.markAgain = false;
    const done = (): void => {
      this.marking = false;
      if (this.markAgain) this.markRead();
    };
    this.history.markRead(this.id, this.direct).subscribe({ complete: done, error: done });
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
    this.cancelled.set(false);
    try {
      const answer = await this.chat.join(this.id, this.direct);
      if (this.destroyRef.destroyed) return;
      if (answer.code === 'not_a_participant' || answer.code === 'recipient_unavailable') {
        this.state.set('refused');
      } else if (answer.code !== null) {
        this.state.set('failed');
      } else {
        const page = await this.once(this.history.latest(this.id, this.direct));
        if (this.destroyRef.destroyed) return;
        // Messages that arrived while the history loaded are already in the window; keep them.
        let held: readonly ChatMessageDto[] = page.messages;
        for (const message of this.window()) held = withChatMessage(held, message);
        this.window.set(held);
        this.hasEarlier.set(page.hasMore);
        this.cancelled.update((live) => live || page.cancelled);
        this.title.set(answer.title ?? '');
        this.memberId.set(answer.memberId ?? '');
        this.state.set('open');
        this.markRead();
      }
    } catch {
      if (!this.destroyRef.destroyed) this.state.set('failed');
    }
  }
}
