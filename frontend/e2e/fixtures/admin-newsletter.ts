import type { Request } from '@playwright/test';
import type { ApiHandlers, ApiReply } from './api-handlers';

/** The mocks' "now": Wednesday 15 April 2026, 8:45 AM in Toronto. */
export const NEWSLETTER_NOW = new Date('2026-04-15T12:45:00Z');

/** Saturday 18 April 2026, 7:00 AM in Toronto: when issue #49 goes out. */
export const SEND_AT = '2026-04-18T11:00:00+00:00';

const story = (
  id: string,
  headline: string,
  section: string | null,
  publishedAt: string,
  includeInWeekly = false,
) => ({ id, headline, section, publishedAt, includeInWeekly });

/** The published stories of mock `admin-newsletter/default`, newest first. */
export const DESK_STORIES = [
  story(
    'basement-gym',
    'A West End church turned its basement into a free gym. Two hundred neighbours now train there every week',
    'community',
    '2026-04-15T10:45:00+00:00',
  ),
  story(
    'easter-5k-record',
    'Easter Sunrise 5K hits a record 142 sign-ups with ten days to go',
    'events',
    '2026-04-15T08:45:00+00:00',
  ),
  story(
    'okafor-interview',
    'Danielle Okafor on coaching strength without the shame',
    'training',
    '2026-04-15T06:45:00+00:00',
  ),
  story(
    'meal-prep-ministry',
    'Inside the Scarborough kitchen prepping 300 healthy meals a week for shift workers',
    'nutrition',
    '2026-04-15T07:45:00+00:00',
    true,
  ),
  story(
    'sabbath-rest',
    'Why your rest day might be the most spiritual part of your training plan',
    'faith-and-body',
    '2026-04-15T05:45:00+00:00',
    true,
  ),
  story(
    'half-marathon-churches',
    'Twelve GTA churches will run the Toronto Half as one team this fall',
    'events',
    '2026-04-14T15:00:00+00:00',
  ),
  story(
    'walking-seniors',
    'The Tuesday walking group that got 40 seniors off the couch and into the park',
    'community',
    '2026-04-14T13:00:00+00:00',
    true,
  ),
];

/** The next four published events, soonest first. */
export const DESK_EVENTS = [
  { id: 'e-5k', title: 'Easter Sunrise 5K', startsAt: '2026-04-18T10:45:00+00:00' },
  { id: 'e-couch', title: 'Couch to 5K: Week 3', startsAt: '2026-04-21T22:30:00+00:00' },
  { id: 'e-bootcamp', title: 'Saturday Park Bootcamp', startsAt: '2026-04-25T12:00:00+00:00' },
  { id: 'e-hoops', title: "Women's Hoops & Devotion Night", startsAt: '2026-04-30T23:00:00+00:00' },
];

/** The four sent issues the mock lists. */
export const SENT_ISSUES = [
  {
    number: 48,
    sentAt: '2026-04-11T11:04:00+00:00',
    subject: 'A church basement, 200 neighbours, and a lot of kettlebells',
    recipients: 6812,
  },
  {
    number: 47,
    sentAt: '2026-04-04T11:03:00+00:00',
    subject: 'Holy Week on the move: five runs and one quiet walk',
    recipients: 6790,
  },
];

export interface IssueFieldsFixture {
  subject: string;
  editorsNote: string;
  leadStoryId: string | null;
  alsoStoryIds: string[];
  eventIds: string[];
  verse: string;
  verseReference: string;
}

/** Issue #49 as mock `admin-newsletter/default` fills it. */
export const ISSUE_FIELDS: IssueFieldsFixture = {
  subject: 'Shame is a terrible coach (and other things we learned this week)',
  editorsNote:
    'Morning, friends. This week Danielle Okafor tells us why shame is a terrible coach, and Pastor Ruth makes the case for doing nothing on purpose. See you at the 5K.',
  leadStoryId: 'okafor-interview',
  alsoStoryIds: ['meal-prep-ministry', 'sabbath-rest', 'walking-seniors'],
  eventIds: ['e-5k', 'e-couch', 'e-bootcamp'],
  verse: 'Come to me, all who are weary, and I will give you rest.',
  verseReference: 'Matthew 11:28',
};

export const BLANK_FIELDS: IssueFieldsFixture = {
  subject: '',
  editorsNote: '',
  leadStoryId: null,
  alsoStoryIds: [],
  eventIds: [],
  verse: '',
  verseReference: '',
};

export interface IssueFixture extends IssueFieldsFixture {
  number: number;
  status: 'draft' | 'scheduled';
  sendAt: string;
  missedSend: boolean;
}

/** Issue #49, a Draft unless `over` says otherwise. */
export function issue(over: Partial<IssueFixture> = {}): IssueFixture {
  return {
    number: 49,
    status: 'draft',
    sendAt: SEND_AT,
    missedSend: false,
    ...ISSUE_FIELDS,
    ...over,
  };
}

/** `GET /api/admin/newsletter` answering the mock's desk with `nextIssue`. */
export function desk(nextIssue: IssueFixture = issue()): ApiReply {
  return {
    json: {
      name: 'The Abundant Weekly',
      confirmedSubscribers: 6800,
      sendsAt: nextIssue.sendAt,
      nextIssue,
      stories: DESK_STORIES,
      events: DESK_EVENTS,
      sent: SENT_ISSUES,
    },
  };
}

/** What the desk sent: each request's path and body, in order. */
export interface DeskCalls {
  saves: IssueFieldsFixture[];
  schedules: (IssueFieldsFixture & { sendTime?: string })[];
  unschedules: number;
  tests: IssueFieldsFixture[];
}

/**
 * Answers the desk and its actions for issue #49, as the API would: a save answers 8:42 AM, a
 * schedule the issue Scheduled with the fields sent, an unschedule the Draft, a test the Admin's
 * own address. Returns what was sent.
 */
export function answerDesk(api: ApiHandlers, nextIssue: IssueFixture = issue()): DeskCalls {
  const calls: DeskCalls = { saves: [], schedules: [], unschedules: 0, tests: [] };
  let current = nextIssue;
  const body = (request: Request) => request.postDataJSON() as IssueFieldsFixture;
  api.on('GET', '/api/admin/newsletter', () => desk(current));
  api.on('PUT', '/api/admin/newsletter/issues/49', (request) => {
    calls.saves.push(body(request));
    return { json: { savedAt: '2026-04-15T12:42:00+00:00' } };
  });
  api.on('POST', '/api/admin/newsletter/issues/49/schedule', (request) => {
    const sent = body(request) as IssueFieldsFixture & { sendTime?: string };
    calls.schedules.push(sent);
    const { sendTime, ...fields } = sent;
    current = {
      ...current,
      ...fields,
      status: 'scheduled',
      missedSend: false,
      sendAt: sendTime ? '2026-04-18T15:00:00+00:00' : current.sendAt,
    };
    return { json: current };
  });
  api.on('POST', '/api/admin/newsletter/issues/49/unschedule', () => {
    calls.unschedules++;
    current = { ...current, status: 'draft' };
    return { json: current };
  });
  api.on('POST', '/api/admin/newsletter/issues/49/test', (request) => {
    calls.tests.push(body(request));
    return { json: { sentTo: 'dana@christian.fitness' } };
  });
  return calls;
}
