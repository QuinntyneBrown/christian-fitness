import type { ConversationSummaryDto } from '@cf/api';
import { homeMessageRowsOf, totalUnreadOf } from './home-messages';

const NOW = new Date('2026-04-18T13:00:00Z');

function row(
  id: string,
  kind: 'group' | 'direct',
  name: string,
  unreadCount: number,
  lastMessage: ConversationSummaryDto['lastMessage'],
): ConversationSummaryDto {
  return {
    kind,
    id,
    name,
    memberCount: kind === 'group' ? 10 : null,
    lastMessage,
    unreadCount,
    activityAt: lastMessage?.sentAt ?? '2026-04-09T16:00:00Z',
  };
}

// L2-007 AC1, AC4 and L2-008 AC3 (ADR 0045): unread total and Home's top-three message rows.
describe('totalUnreadOf', () => {
  it.each([
    { why: 'no conversations', counts: [], expected: 0 },
    { why: 'all read', counts: [0, 0], expected: 0 },
    { why: 'several unread conversations', counts: [3, 0, 1, 2], expected: 6 },
  ])('$why -> $expected', ({ counts, expected }) => {
    const list = counts.map((count, i) => row(`id-${i}`, 'group', `Chat ${i}`, count, null));
    expect(totalUnreadOf(list)).toBe(expected);
  });
});

describe('homeMessageRowsOf', () => {
  it('takes at most three conversations in order, formatting group and direct rows in Toronto time', () => {
    const list: ConversationSummaryDto[] = [
      row('e-1', 'group', 'Sunrise 5K Crew', 3, {
        author: 'Michael',
        text: 'Parking fills at 6:30',
        sentAt: '2026-04-18T12:42:00Z',
      }),
      row('m-2', 'direct', 'Danielle Okafor', 0, {
        author: 'Danielle Okafor',
        text: 'See you Thursday!',
        sentAt: '2026-04-17T16:00:00Z',
      }),
      row('e-3', 'group', "Women's Hoops", 1, null),
      row('e-4', 'group', 'Fourth Chat', 5, null),
    ];

    expect(homeMessageRowsOf(list, NOW)).toEqual([
      {
        id: 'group:e-1',
        href: '/events/e-1/chat',
        name: 'Sunrise 5K Crew',
        group: true,
        text: 'Michael: Parking fills at 6:30',
        time: '8:42 AM',
        unread: 3,
      },
      {
        id: 'direct:m-2',
        href: '/messages/m-2',
        name: 'Danielle Okafor',
        group: false,
        text: 'Danielle Okafor: See you Thursday!',
        time: 'Yesterday',
        unread: 0,
      },
      {
        id: 'group:e-3',
        href: '/events/e-3/chat',
        name: "Women's Hoops",
        group: true,
        text: '',
        time: 'Apr 9',
        unread: 1,
      },
    ]);
  });
});
