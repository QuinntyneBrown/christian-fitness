import type { ActivityWeekDto } from '@cf/api';
import { activityRowsOf, hasActivity } from './community-activity';

const week = (start: string, m = 0, r = 0, s = 0): ActivityWeekDto => ({
  start,
  newMembers: m,
  registrations: r,
  messages: s,
});

describe('activityRowsOf', () => {
  it('lists the weeks newest first, names the last "this week" and separates thousands', () => {
    const rows = activityRowsOf([
      week('2026-04-06T00:00:00+00:00', 40, 88, 1204),
      week('2026-04-13T00:00:00+00:00', 6, 14, 187),
    ]);

    expect(rows.map((r) => [r.week, r.newMembers, r.registrations, r.messages])).toEqual([
      ['Apr 13 (this week)', '6', '14', '187'],
      ['Apr 6', '40', '88', '1,204'],
    ]);
  });

  it('reads a week start in UTC, so a Monday midnight is not the Sunday in Toronto', () => {
    expect(activityRowsOf([week('2026-04-13T00:00:00+00:00')])[0]?.week).toBe('Apr 13 (this week)');
  });

  it('gives no rows for no weeks', () => {
    expect(activityRowsOf([])).toEqual([]);
  });
});

describe('hasActivity', () => {
  it.each([
    ['all zero', [week('2026-04-06T00:00:00+00:00'), week('2026-04-13T00:00:00+00:00')], false],
    ['one message', [week('2026-04-06T00:00:00+00:00', 0, 0, 1)], true],
    ['one join', [week('2026-04-06T00:00:00+00:00', 1)], true],
    ['no weeks', [], false],
  ])('%s', (_name, weeks, expected) => {
    expect(hasActivity(weeks)).toBe(expected);
  });
});
