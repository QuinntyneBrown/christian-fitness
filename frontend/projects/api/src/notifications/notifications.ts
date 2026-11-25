import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** What a notification is about (ADR 0068): the four kinds that notify. */
export type NotificationKind =
  'event-reminder' | 'event-cancelled' | 'series-date-cancelled' | 'followed-host-dates';

/**
 * One notification of the member's inbox, listed or pushed (ADR 0083). The title and text are plain
 * text, never markup; `href` is a path inside the app.
 */
export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  text: string;
  href: string;
  /** An ISO instant in UTC. */
  createdAt: string;
  read: boolean;
}

/** The member's newest 50 notifications of the last 30 days, newest first, and how many are unread. */
export interface NotificationListDto {
  notifications: NotificationDto[];
  /** Unread over the last 30 days; it can be more than the 50 listed. */
  unread: number;
}

/**
 * The member's inbox over HTTP (ADR 0083): `list` answers `GET /api/notifications`; `markAllRead`
 * marks every notification read. Any failure errors with the `HttpErrorResponse`.
 */
export interface NotificationsApi {
  list(): Observable<NotificationListDto>;
  markAllRead(): Observable<void>;
}

/** Binds {@link NotificationsApi}; the member shell's providers provide it. */
export const NOTIFICATIONS_SERVICE = new InjectionToken<NotificationsApi>('NOTIFICATIONS_SERVICE');

/**
 * Notifications as they arrive over the member's one real-time connection (ADR 0083): the shared
 * real-time client implements it, so no component opens a connection of its own.
 */
export interface NotificationStream {
  readonly received: Observable<NotificationDto>;
}

/** Binds {@link NotificationStream}; the member shell's providers provide it. */
export const NOTIFICATION_STREAM = new InjectionToken<NotificationStream>('NOTIFICATION_STREAM');
