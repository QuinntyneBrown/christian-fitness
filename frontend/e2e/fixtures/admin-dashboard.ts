import type { ApiHandlers, ApiReply } from './api-handlers';

/** One week as `GET /api/admin/dashboard/activity` answers it (ADR 0000). */
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

/** One pending application as `GET /api/admin/dashboard/awaiting` names it (ADR 0060). */
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

/** One listing suggestion waiting for review, as the same answer names it (ADR 0090). */
export interface AwaitingSuggestionFixture {
  id: string;
  name: string;
}

/**
 * What waits for staff; `applications` is absent in a Moderator's answer. Both roles' answers
 * carry `suggestions`; `answerAwaiting` sends none waiting when a fixture leaves it out.
 */
export interface AwaitingFixture {
  applications?: { total: number; items: AwaitingApplicationFixture[] };
  flaggedMembers: { total: number; items: AwaitingFlaggedFixture[] };
  suggestions?: { total: number; items: AwaitingSuggestionFixture[] };
}

/** No suggestion waiting. */
export const NO_SUGGESTIONS_AWAITING = { total: 0, items: [] as AwaitingSuggestionFixture[] };

/** Nothing waiting, for an Admin: the fixture's default answer. */
export const NOTHING_AWAITING: AwaitingFixture = {
  applications: { total: 0, items: [] },
  flaggedMembers: { total: 0, items: [] },
  suggestions: NO_SUGGESTIONS_AWAITING,
};

/** The mock's three suggestions, oldest first (admin-dashboard/default). */
export const THREE_SUGGESTIONS = {
  total: 3,
  items: [
    { id: '0190c0de-0000-7000-8000-0000000000c1', name: 'Eastside Ladies Who Lift' },
    { id: '0190c0de-0000-7000-8000-0000000000c2', name: 'Coach Marcus Delaney' },
    { id: '0190c0de-0000-7000-8000-0000000000c3', name: 'Rooted Physio' },
  ],
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
  suggestions: NO_SUGGESTIONS_AWAITING,
};

/** Answers every request for the waiting work with `awaiting` and counts them. */
export function answerAwaiting(
  api: ApiHandlers,
  awaiting: AwaitingFixture = SOME_AWAITING,
): { asked: number } {
  const counter = { asked: 0 };
  api.on('GET', '/api/admin/dashboard/awaiting', () => {
    counter.asked += 1;
    return { json: { suggestions: NO_SUGGESTIONS_AWAITING, ...awaiting } };
  });
  return counter;
}
