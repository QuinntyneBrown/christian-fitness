import { memberSinceOf } from './member-since';

// L2-005 AC1: the profile's join date, read in Toronto time (ADR 0015). "Today" is the day the
// member joined on Toronto's calendar, whatever the date in UTC.
describe('memberSinceOf', () => {
  it.each([
    {
      why: 'joined in an earlier month',
      joinedAt: '2026-01-14T15:30:00Z',
      now: '2026-11-23T14:15:00Z',
      expected: 'Member since January 2026',
    },
    {
      why: 'joined earlier the same day',
      joinedAt: '2026-11-23T05:30:00Z',
      now: '2026-11-23T14:15:00Z',
      expected: 'Member since today',
    },
    {
      why: 'joined yesterday, in the same month',
      joinedAt: '2026-11-22T14:15:00Z',
      now: '2026-11-23T14:15:00Z',
      expected: 'Member since November 2026',
    },
    {
      // 11:30 PM on November 22 in Toronto is November 23 in UTC.
      why: 'joined late yesterday evening in Toronto, already today in UTC',
      joinedAt: '2026-11-23T04:30:00Z',
      now: '2026-11-23T14:15:00Z',
      expected: 'Member since November 2026',
    },
    {
      // 6:00 PM on November 22 in Toronto; at 8:00 PM it is November 23 in UTC but not there.
      why: 'joined two hours ago, and it is tomorrow in UTC but not in Toronto',
      joinedAt: '2026-11-22T23:00:00Z',
      now: '2026-11-23T01:00:00Z',
      expected: 'Member since today',
    },
    {
      // The last day of 2025 in Toronto is already 2026 in UTC.
      why: 'joined on New Year’s Eve in Toronto, after midnight in UTC',
      joinedAt: '2026-01-01T03:00:00Z',
      now: '2026-11-23T14:15:00Z',
      expected: 'Member since December 2025',
    },
    {
      why: 'the same day of the month a year before',
      joinedAt: '2025-11-23T14:15:00Z',
      now: '2026-11-23T14:15:00Z',
      expected: 'Member since November 2025',
    },
  ])('$why: "$expected"', ({ joinedAt, now, expected }) => {
    expect(memberSinceOf(joinedAt, new Date(now))).toBe(expected);
  });
});
