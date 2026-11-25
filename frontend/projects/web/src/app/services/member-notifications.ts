import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NOTIFICATION_STREAM, type NotificationDto, NOTIFICATIONS_SERVICE } from '@cf/api';
import { allRead, withArrived } from '@cf/domain';
import type { Subscription } from 'rxjs';

/**
 * The signed-in member's notifications for the member shell's bell and the Notifications screen
 * (ADR 0068, ADR 0083). Provided on `MemberShell`, so the two share one list: the latest 50, newest
 * first, and the unread count of the last 30 days. It loads when the shell opens and again when the
 * screen opens; a notification the hub pushes goes first and raises the count once. A failed load
 * leaves the count unknown, so the bell shows no pill (mock `notifications/error`).
 */
@Injectable()
export class MemberNotifications {
  private readonly api = inject(NOTIFICATIONS_SERVICE);
  private readonly stream = inject(NOTIFICATION_STREAM);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  readonly notifications = signal<readonly NotificationDto[]>([]);
  readonly unread = signal(0);
  /** True while "Mark all as read" waits for the server. */
  readonly marking = signal(false);

  /** Asks for the member's notifications from scratch; the bell keeps its count meanwhile. */
  load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.notifications.set(list.notifications);
          this.unread.set(list.unread);
          this.state.set('loaded');
        },
        error: () => {
          this.unread.set(0);
          this.state.set('failed');
        },
      });
  }

  /**
   * Takes each notification the hub pushes, over the member's one connection, which this opens if
   * it is not open. If it cannot be opened the list still loads on each visit to the screen.
   */
  listen(): void {
    this.stream.received
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.arrive(notification));
    this.stream.connect().catch(() => undefined);
  }

  /** A notification has just arrived: it goes first and, if new, raises the count. */
  arrive(notification: NotificationDto): void {
    const { list, added } = withArrived(this.notifications(), notification);
    if (!added) return;
    this.notifications.set(list);
    if (!notification.read) this.unread.update((count) => count + 1);
  }

  /**
   * Marks everything read once the server agrees; `failed` runs when it does not, and the list
   * stays as it was (mock `notifications/mark-failed`).
   */
  markAllRead(failed: () => void): void {
    if (this.marking()) return;
    this.marking.set(true);
    this.api
      .markAllRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.set(allRead(this.notifications()));
          this.unread.set(0);
          this.marking.set(false);
        },
        error: () => {
          this.marking.set(false);
          failed();
        },
      });
  }
}
