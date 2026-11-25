import type { ApiHandlers } from './api-handlers';

/** A notification as `GET /api/notifications` lists it and the hub pushes it (ADR 0083). */
export interface Notification {
  id: string;
  kind: 'event-reminder' | 'event-cancelled' | 'series-date-cancelled' | 'followed-host-dates';
  title: string;
  text: string;
  href: string;
  createdAt: string;
  read: boolean;
}

/** The inbox the fixture answers unless a spec says otherwise: nothing yet. */
export const NO_NOTIFICATIONS = { notifications: [] as Notification[], unread: 0 };

/** The instant the notification specs pin the browser's clock to: Friday, April 24, 2026, 8:45 AM in Toronto. */
export const NOTIFICATIONS_NOW = '2026-04-24T12:45:00Z';

/**
 * The mock's five notifications (`docs/mocks/pages/notifications/default.html`), newest first: two
 * unread, then three read. Times are worked from {@link NOTIFICATIONS_NOW}: two hours before, the day
 * before (twice), April 12 and April 17.
 */
export const MOCK_NOTIFICATIONS: readonly Notification[] = [
  {
    id: '0196a0de-0000-7000-8000-000000000005',
    kind: 'event-reminder',
    title: 'Tomorrow: Saturday Park Bootcamp',
    text: 'Sat, Apr 25 at 6:30 AM · Centennial Park, Etobicoke',
    href: '/events/0196a0de-0000-7000-8000-0000000000e1',
    createdAt: '2026-04-24T10:45:00Z',
    read: false,
  },
  {
    id: '0196a0de-0000-7000-8000-000000000004',
    kind: 'event-cancelled',
    title: 'Cancelled: Stretch & Pray: Mobility Morning',
    text: 'Wed, May 6. The host cancelled it; your registration is released.',
    href: '/events',
    createdAt: '2026-04-23T18:00:00Z',
    read: false,
  },
  {
    id: '0196a0de-0000-7000-8000-000000000003',
    kind: 'followed-host-dates',
    title: 'Lakeshore Runners posted a new date',
    text: 'Couch to 5K: Week 4 is Tue, Apr 28 at 6:30 PM.',
    href: '/events',
    createdAt: '2026-04-23T14:00:00Z',
    read: true,
  },
  {
    id: '0196a0de-0000-7000-8000-000000000002',
    kind: 'series-date-cancelled',
    title: 'Cancelled date: Couch to 5K Run Club',
    text: 'Tue, Apr 14 is off; the other dates in the series stand.',
    href: '/events',
    createdAt: '2026-04-12T15:00:00Z',
    read: true,
  },
  {
    id: '0196a0de-0000-7000-8000-000000000001',
    kind: 'event-reminder',
    title: 'Tomorrow: Easter Sunrise 5K',
    text: 'Sat, Apr 18 at 6:30 AM · Humber Bay Park',
    href: '/events/0196a0de-0000-7000-8000-0000000000e2',
    createdAt: '2026-04-17T14:00:00Z',
    read: true,
  },
];

/** `count` unread reminders, newest first, an hour apart before {@link NOTIFICATIONS_NOW}. */
export function unreadNotifications(count: number): Notification[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `0196a0de-0000-7000-8000-${String(100 + i).padStart(12, '0')}`,
    kind: 'event-reminder' as const,
    title: `Reminder ${i + 1}`,
    text: 'Sat, Apr 25 at 6:30 AM · Centennial Park, Etobicoke',
    href: '/events',
    createdAt: new Date(Date.parse(NOTIFICATIONS_NOW) - (i + 1) * 3_600_000).toISOString(),
    read: false,
  }));
}

/**
 * Answers `GET /api/notifications` with `notifications` and their unread count (or `unread`), and
 * records each `POST /api/notifications/read`, answering it with `markStatus`.
 */
export class FakeNotifications {
  /** How many times the page asked for the list. */
  listed = 0;
  /** How many times the page marked everything read. */
  markedRead = 0;

  private constructor(private markStatus: number) {}

  static install(
    api: ApiHandlers,
    notifications: readonly Notification[],
    options: { unread?: number; markStatus?: number } = {},
  ): FakeNotifications {
    const fake = new FakeNotifications(options.markStatus ?? 204);
    const unread = options.unread ?? notifications.filter((n) => !n.read).length;
    api.on('GET', '/api/notifications', () => {
      fake.listed += 1;
      return { json: { notifications, unread } };
    });
    api.on('POST', '/api/notifications/read', () => {
      fake.markedRead += 1;
      return { status: fake.markStatus };
    });
    return fake;
  }

  /** The next marks answer `status`. */
  answerMarksWith(status: number): void {
    this.markStatus = status;
  }
}
