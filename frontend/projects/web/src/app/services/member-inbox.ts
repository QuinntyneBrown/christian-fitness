import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CONVERSATIONS, type ConversationSummaryDto } from '@cf/api';
import { totalUnreadOf } from '@cf/domain';
import type { Subscription } from 'rxjs';

/**
 * The signed-in member's conversation list for the member shell and the screens under it (L2-007
 * AC4, AC5; L2-008 AC3; L2-015 AC1; ADR 0045). Provided on `MemberShell`, so one `GET /api/conversations`
 * per member navigation feeds the top bar's and tab bar's unread counts, Home's Messages aside and
 * the Messages screen without opening duplicate requests.
 */
@Injectable()
export class MemberInbox {
  private readonly conversationsApi = inject(CONVERSATIONS);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  readonly retrying = signal(false);
  readonly conversations = signal<readonly ConversationSummaryDto[]>([]);
  readonly unread = computed(() => totalUnreadOf(this.conversations()));

  /** Asks for the member's conversations from scratch, showing skeletons while it loads. */
  refresh(): void {
    this.request?.unsubscribe();
    this.retrying.set(false);
    this.state.set('loading');
    this.request = this.conversationsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.conversations.set(list);
          this.state.set('loaded');
        },
        error: () => this.state.set('failed'),
      });
  }

  /** Asks again in place after a section failure, keeping `inline-error` busy until it answers. */
  retryInline(): void {
    if (this.retrying()) return;
    this.request?.unsubscribe();
    this.retrying.set(true);
    this.request = this.conversationsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.conversations.set(list);
          this.retrying.set(false);
          this.state.set('loaded');
        },
        error: () => {
          this.retrying.set(false);
          this.state.set('failed');
        },
      });
  }
}
