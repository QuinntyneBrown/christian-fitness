import type { ApiHandlers } from './api-handlers';

/** A row of the Messages list as `GET /api/conversations` answers it (ADR 0042). */
export interface ConversationRow {
  kind: 'group' | 'direct';
  id: string;
  name: string;
  memberCount: number | null;
  lastMessage: { author: string; text: string; sentAt: string } | null;
  unreadCount: number;
  activityAt: string;
}

/**
 * Answers `GET /api/conversations` with `rows`, as the API does: newest first, as given. `fail`
 * answers a request with a status instead, or `abort` as when the network drops, for the n-th ask.
 * Returns how many times it was asked.
 */
export function answerConversations(
  api: ApiHandlers,
  rows: ConversationRow[],
  fail: (requestNumber: number) => { status?: number; abort?: boolean } | null = () => null,
): { asked: number } {
  const record = { asked: 0 };
  api.on('GET', '/api/conversations', () => {
    const refusal = fail(record.asked);
    record.asked += 1;
    if (refusal?.abort) return { abort: true };
    if (refusal) return { status: refusal.status ?? 500, json: { code: 'server_error' } };
    return { json: { conversations: rows } };
  });
  return record;
}

/** Event ids for the rows below. */
export const SUNRISE_ID = '0190c0de-0000-7000-8000-0000000000a1';
export const HOOPS_ID = '0190c0de-0000-7000-8000-0000000000a2';
export const QUIET_ID = '0190c0de-0000-7000-8000-0000000000a3';

/** The clock the Messages specs pin: Sat 18 Apr 2026, 9:00 AM in Toronto. */
export const MESSAGES_NOW = new Date('2026-04-18T13:00:00Z');

/** Three chats, newest first: unread and busy, read, and one nobody has spoken in yet. */
export const THREE_CONVERSATIONS: ConversationRow[] = [
  {
    kind: 'group',
    id: SUNRISE_ID,
    name: 'Easter Sunrise 5K',
    memberCount: 18,
    lastMessage: {
      author: 'Michael Chen',
      text: 'Parking at <b>Marilyn Bell</b> fills up by 6:30',
      sentAt: '2026-04-18T12:42:00Z',
    },
    unreadCount: 3,
    activityAt: '2026-04-18T12:42:00Z',
  },
  {
    kind: 'group',
    id: HOOPS_ID,
    name: "Women's Hoops",
    memberCount: 12,
    lastMessage: {
      author: 'Priya Nair',
      text: 'Who has the pinnies?',
      sentAt: '2026-04-13T16:00:00Z',
    },
    unreadCount: 0,
    activityAt: '2026-04-13T16:00:00Z',
  },
  {
    kind: 'group',
    id: QUIET_ID,
    name: 'Mobility Monday',
    memberCount: 1,
    lastMessage: null,
    unreadCount: 0,
    activityAt: '2026-04-09T16:00:00Z',
  },
];
