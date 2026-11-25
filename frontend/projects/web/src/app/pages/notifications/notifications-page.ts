import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TOASTS_SERVICE } from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  List,
  NotificationRow,
  Skeleton,
  SkeletonRegion,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import { notificationIcon, notificationTime, ToastStore } from '@cf/domain';
import { MemberNotifications } from '../../services/member-notifications';

/** One notification as its row shows it. */
interface NoteRow {
  id: string;
  href: string;
  icon: ReturnType<typeof notificationIcon>;
  title: string;
  text: string;
  time: string;
  unread: boolean;
}

/**
 * Notifications at `/notifications` (ADR 0068, ADR 0083; mocks `pages/notifications/*`): the
 * member's notifications from the shell's `MemberNotifications`, newest first as the API gives them
 * (at most 50, with a pushed one put first). Each row is the design system's notification row and
 * opens what it is about. "Mark all as read" shows while there is a list; a failure says so in a
 * toast and leaves the rows as they were. "Notification settings" links to the Notifications section
 * of Preferences. Opening the screen asks for the list again: skeleton rows while it loads, "No
 * notifications yet" with Browse events when there are none, and "Notifications didn't load" with
 * Try again when it fails.
 */
@Component({
  selector: 'cf-notifications-page',
  imports: [
    Button,
    Container,
    EmptyState,
    List,
    NotificationRow,
    Skeleton,
    SkeletonRegion,
    ToastRegion,
  ],
  providers: [{ provide: TOASTS_SERVICE, useClass: ToastStore }],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
})
export default class NotificationsPage {
  private readonly router = inject(Router);
  private readonly store = inject(MemberNotifications);
  protected readonly toasts = inject(TOASTS_SERVICE);

  protected readonly state = this.store.state;
  protected readonly marking = this.store.marking;
  protected readonly skeletons = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  protected readonly rows = computed<readonly NoteRow[]>(() => {
    const now = new Date();
    return this.store.notifications().map((n) => ({
      id: n.id,
      href: n.href,
      icon: notificationIcon(n.kind),
      title: n.title,
      text: n.text,
      time: notificationTime(n.createdAt, now),
      unread: !n.read,
    }));
  });
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'danger',
      heading: title,
      text,
    })),
  );

  constructor() {
    this.store.load();
  }

  protected retry(): void {
    this.store.load();
  }

  protected markAllRead(): void {
    this.store.markAllRead(() =>
      this.toasts.show("We couldn't mark them as read", 'Check your connection and try again.'),
    );
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }
}
