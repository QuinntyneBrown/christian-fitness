import type { AdminSessionState } from '@cf/api';
import {
  adminSessionActionOf,
  cancelSessionSubtitleOf,
  cancelSessionTextOf,
  isRestoreFailedTitle,
  restoreFailedTitleOf,
  sessionChangeTitleOf,
  toldTextOf,
} from './session-change';

// ADR 0103: Cancel date on a date neither started nor cancelled, Restore on a cancelled date not
// started, nothing else; the API's clock decides `started`.
describe('adminSessionActionOf', () => {
  it.each<{ state: AdminSessionState; started: boolean; action: 'cancel' | 'restore' | null }>([
    { state: 'upcoming', started: false, action: 'cancel' },
    { state: 'live', started: false, action: 'cancel' },
    { state: 'live', started: true, action: null },
    { state: 'done', started: true, action: null },
    { state: 'cancelled', started: false, action: 'restore' },
    { state: 'cancelled', started: true, action: null },
  ])('$state, started $started: $action', ({ state, started, action }) => {
    expect(adminSessionActionOf({ state, started })).toBe(action);
  });
});

// L2-071 AC4 (mock cancel-session/default): how many are going, who is told, refunds with the host.
describe('cancelSessionTextOf', () => {
  const told =
    'Everyone going is told in the series chat and in their notifications. If anyone paid for it, the host will sort out refunds with them directly.';
  it.each<{ joined: number; droppedIn: number; text: string }>([
    {
      joined: 31,
      droppedIn: 3,
      text: `34 people are going to this date (31 joined, 3 dropped in). ${told}`,
    },
    {
      joined: 1,
      droppedIn: 0,
      text: `1 person is going to this date (1 joined, 0 dropped in). ${told}`,
    },
    {
      joined: 0,
      droppedIn: 2,
      text: `2 people are going to this date (0 joined, 2 dropped in). ${told}`,
    },
    { joined: 0, droppedIn: 0, text: 'Nobody is going to this date yet.' },
  ])('$joined joined and $droppedIn dropped in', ({ joined, droppedIn, text }) => {
    expect(cancelSessionTextOf(joined, droppedIn)).toBe(text);
  });
});

describe('cancelSessionSubtitleOf', () => {
  it.each<{ why: string; startsAt: string; subtitle: string }>([
    {
      why: 'in daylight time',
      startsAt: '2026-05-05T22:30:00Z',
      subtitle: 'Couch to 5K Run Club · Session 5 · Tue May 5, 6:30 PM',
    },
    {
      why: 'in standard time, in the morning',
      startsAt: '2026-01-06T13:00:00Z',
      subtitle: 'Couch to 5K Run Club · Session 5 · Tue Jan 6, 8:00 AM',
    },
  ])('$why', ({ startsAt, subtitle }) => {
    expect(cancelSessionSubtitleOf('Couch to 5K Run Club', 5, startsAt)).toBe(subtitle);
  });
});

describe('sessionChangeTitleOf', () => {
  it.each<{ change: 'cancelled' | 'restored'; startsAt: string; title: string }>([
    { change: 'cancelled', startsAt: '2026-05-05T22:30:00Z', title: 'Tue May 5 cancelled' },
    { change: 'restored', startsAt: '2026-05-12T22:30:00Z', title: 'Tue May 12 restored' },
    // 11:30 PM in Toronto is the next day in UTC.
    { change: 'cancelled', startsAt: '2026-05-06T03:30:00Z', title: 'Tue May 5 cancelled' },
  ])('$title', ({ change, startsAt, title }) => {
    expect(sessionChangeTitleOf(startsAt, change)).toBe(title);
  });
});

describe('restoreFailedTitleOf and isRestoreFailedTitle', () => {
  it('words a failed restore and knows it again', () => {
    const title = restoreFailedTitleOf('2026-05-12T22:30:00Z');
    expect(title).toBe("We couldn't restore Tue May 12");
    expect(isRestoreFailedTitle(title)).toBe(true);
  });

  it.each(['Tue May 12 restored', 'Tue May 5 cancelled', "We couldn't restore"])(
    '"%s" is not a failed restore',
    (title) => {
      expect(isRestoreFailedTitle(title)).toBe(false);
    },
  );
});

describe('toldTextOf', () => {
  it.each<{ told: number; text: string }>([
    { told: 34, text: '34 members were told.' },
    { told: 2, text: '2 members were told.' },
    { told: 1, text: '1 member was told.' },
    { told: 0, text: 'Nobody held a place, so nobody was told.' },
  ])('$told', ({ told, text }) => {
    expect(toldTextOf(told)).toBe(text);
  });
});
