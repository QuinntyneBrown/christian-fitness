import { describe, expect, it } from 'vitest';
import {
  conversationHref,
  conversationPreview,
  conversationTime,
  groupMemberCount,
} from './conversation-row';

// Now is Sat 18 Apr 2026, 9:00 AM in Toronto (UTC-4).
const NOW = new Date('2026-04-18T13:00:00Z');

describe('conversationTime', () => {
  it.each([
    ['2026-04-18T12:42:00Z', '8:42 AM'], // today
    ['2026-04-18T04:30:00Z', '12:30 AM'], // today, just after Toronto midnight
    ['2026-04-18T03:59:00Z', 'Yesterday'], // 11:59 PM on the 17th in Toronto
    ['2026-04-17T15:00:00Z', 'Yesterday'],
    ['2026-04-13T16:00:00Z', 'Mon'], // five days ago
    ['2026-04-12T16:00:00Z', 'Apr 12'], // six days ago is a date, so a weekday is never ambiguous
    ['2026-03-30T16:00:00Z', 'Mar 30'],
    ['2025-12-24T16:00:00Z', 'Dec 24, 2025'], // another year says so
    ['2026-04-18T14:00:00Z', '10:00 AM'], // a clock a little ahead of the server is still today
  ])('shows %s as %s', (sentAt, shown) => {
    expect(conversationTime(sentAt, NOW)).toBe(shown);
  });

  it('shows nothing for an instant it cannot read', () => {
    expect(conversationTime('not a time', NOW)).toBe('');
  });
});

describe('conversationPreview', () => {
  it('names the author before the text', () => {
    expect(
      conversationPreview({ author: 'Michael Chen', text: 'Parking fills up', sentAt: '' }),
    ).toBe('Michael Chen: Parking fills up');
  });

  it('is empty before anything has been said', () => {
    expect(conversationPreview(null)).toBe('');
  });
});

describe('groupMemberCount', () => {
  it.each([
    [18, '18 members'],
    [2, '2 members'],
    [1, '1 member'],
    [null, ''],
  ])('says %s as %j', (count, label) => {
    expect(groupMemberCount(count)).toBe(label);
  });
});

describe('conversationHref', () => {
  it('opens an event group in its chat', () => {
    expect(conversationHref('group', 'e1')).toBe('/events/e1/chat');
  });

  it("opens a series' one chat on the series (ADR 0099)", () => {
    expect(conversationHref('series', 's1')).toBe('/events/series/s1/chat');
  });

  it('opens a direct conversation with the other member', () => {
    expect(conversationHref('direct', 'm1')).toBe('/messages/m1');
  });
});
