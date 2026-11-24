import type { ApiHandlers, ApiReply } from './api-handlers';

/** One week as `GET /api/admin/dashboard/activity` answers it (ADR 0058). */
export interface ActivityWeekFixture {
  start: string;
  newMembers: number;
  registrations: number;
  messages: number;
}

/** The Mondays, 00:00 UTC, of the eight weeks the mock draws, oldest first; Apr 13 is the current. */
export const WEEK_STARTS = [
  '2026-02-23T00:00:00+00:00',
  '2026-03-02T00:00:00+00:00',
  '2026-03-09T00:00:00+00:00',
  '2026-03-16T00:00:00+00:00',
  '2026-03-23T00:00:00+00:00',
  '2026-03-30T00:00:00+00:00',
  '2026-04-06T00:00:00+00:00',
  '2026-04-13T00:00:00+00:00',
];

const week = (
  start: string,
  newMembers: number,
  registrations: number,
  messages: number,
): ActivityWeekFixture => ({ start, newMembers, registrations, messages });

/** Eight weeks of a growing community, oldest first; one count passes a thousand. */
export const BUSY_WEEKS: ActivityWeekFixture[] = [
  week(WEEK_STARTS[0]!, 12, 31, 410),
  week(WEEK_STARTS[1]!, 18, 44, 523),
  week(WEEK_STARTS[2]!, 9, 38, 498),
  week(WEEK_STARTS[3]!, 22, 57, 640),
  week(WEEK_STARTS[4]!, 31, 63, 721),
  week(WEEK_STARTS[5]!, 27, 70, 902),
  week(WEEK_STARTS[6]!, 40, 88, 1204),
  week(WEEK_STARTS[7]!, 6, 14, 187),
];

/** Eight weeks with nothing in them: the fixture's default answer. */
export const QUIET_WEEKS: ActivityWeekFixture[] = WEEK_STARTS.map((start) => week(start, 0, 0, 0));

/** An activity answer. */
export function activity(weeks: ActivityWeekFixture[]): ApiReply {
  return { json: { weeks } };
}

/** Answers every activity request with `weeks` and counts them. */
export function answerActivity(
  api: ApiHandlers,
  weeks: ActivityWeekFixture[] = BUSY_WEEKS,
): { asked: number } {
  const counter = { asked: 0 };
  api.on('GET', '/api/admin/dashboard/activity', () => {
    counter.asked += 1;
    return activity(weeks);
  });
  return counter;
}

/** One pending application as `GET /api/admin/dashboard/awaiting` names it (ADR 0059). */
export interface AwaitingApplicationFixture {
  id: string;
  name: string;
  role: string;
  submittedAt: string;
}

/** One flagged member as the same answer names them. */
export interface AwaitingFlaggedFixture {
  id: string;
  name: string;
  note: string | null;
}

/** What waits for staff; `applications` is absent in a Moderator's answer. */
export interface AwaitingFixture {
  applications?: { total: number; items: AwaitingApplicationFixture[] };
  flaggedMembers: { total: number; items: AwaitingFlaggedFixture[] };
}

/** Nothing waiting, for an Admin: the fixture's default answer. */
export const NOTHING_AWAITING: AwaitingFixture = {
  applications: { total: 0, items: [] },
  flaggedMembers: { total: 0, items: [] },
};

/** The mock's default: three applications and one flagged member. */
export const SOME_AWAITING: AwaitingFixture = {
  applications: {
    total: 3,
    items: [
      {
        id: '0190c0de-0000-7000-8000-0000000000a1',
        name: 'Hannah Bergstrom',
        role: 'Registered massage therapist',
        submittedAt: '2026-04-13T09:00:00+00:00',
      },
      {
        id: '0190c0de-0000-7000-8000-0000000000a2',
        name: 'Samuel Osei',
        role: 'Strength coach',
        submittedAt: '2026-04-12T09:00:00+00:00',
      },
      {
        id: '0190c0de-0000-7000-8000-0000000000a3',
        name: 'Lena Park, RD',
        role: 'Sports dietitian',
        submittedAt: '2026-04-10T09:00:00+00:00',
      },
    ],
  },
  flaggedMembers: {
    total: 1,
    items: [
      {
        id: '0190c0de-0000-7000-8000-0000000000b1',
        name: 'Kevin Brooks',
        note: 'Promoting supplements in 3 group chats',
      },
    ],
  },
};

/** Answers every request for the waiting work with `awaiting` and counts them. */
export function answerAwaiting(
  api: ApiHandlers,
  awaiting: AwaitingFixture = SOME_AWAITING,
): { asked: number } {
  const counter = { asked: 0 };
  api.on('GET', '/api/admin/dashboard/awaiting', () => {
    counter.asked += 1;
    return { json: awaiting };
  });
  return counter;
}
