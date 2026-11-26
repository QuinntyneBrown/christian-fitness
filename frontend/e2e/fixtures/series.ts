import type { ApiHandlers, ApiReply } from './api-handlers';
import { type EventDetail, type EventHostCard, hostCardOf } from './events';
import { LAKESHORE, OKAFOR } from './listing-profile';

/**
 * Answers `GET /api/events/series/count` with `count` (ADR 0093), or refuses it with `fail`.
 * Returns how many times it was asked.
 */
export function answerSeriesCount(
  api: ApiHandlers,
  count: number,
  fail?: { status: number },
): { asked: number } {
  const seen = { asked: 0 };
  api.on('GET', '/api/events/series/count', () => {
    seen.asked += 1;
    return fail ? { status: fail.status, json: { code: 'error' } } : { json: { count } };
  });
  return seen;
}

/** A series as `GET /api/events/series` answers it (`SeriesRowDto`, ADR 0093). */
export interface SeriesRow {
  id: string;
  title: string;
  category: string;
  imageKey: string | null;
  host: { id: string; kind: string; name: string };
  area: string;
  cadence: { weekday: number | null; dates: number };
  startsAt: string;
  firstStartsAt: string;
  lastStartsAt: string;
  sessions: ('done' | 'live' | 'upcoming' | 'cancelled')[];
  priceCents: number;
  joined: boolean;
}

/**
 * Couch to 5K Run Club, as the mock `events/series` draws it: eight Tuesdays at 6:30 PM from
 * April 7, May 12 cancelled, two done, next April 21, joined.
 */
export const COUCH_TO_5K: SeriesRow = {
  id: '0190c0de-0000-7000-8000-0000000005e1',
  title: 'Couch to 5K Run Club',
  category: 'run',
  imageKey: null,
  host: {
    id: '0190c0de-0000-7000-8000-00000000a001',
    kind: 'organization',
    name: 'Lakeshore Runners Fellowship',
  },
  area: 'Etobicoke',
  cadence: { weekday: 2, dates: 7 },
  startsAt: '2026-04-21T22:30:00Z',
  firstStartsAt: '2026-04-07T22:30:00Z',
  lastStartsAt: '2026-05-26T22:30:00Z',
  sessions: ['done', 'done', 'live', 'upcoming', 'upcoming', 'cancelled', 'upcoming', 'upcoming'],
  priceCents: 0,
  joined: true,
};

/** Saturday Park Bootcamp: eight Saturdays at 8:00 AM from April 4, three done, $64, not joined. */
export const PARK_BOOTCAMP: SeriesRow = {
  id: '0190c0de-0000-7000-8000-0000000005e2',
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  imageKey: null,
  host: { id: '0190c0de-0000-7000-8000-00000000a002', kind: 'instructor', name: 'Danielle Okafor' },
  area: 'Waterfront',
  cadence: { weekday: 6, dates: 8 },
  startsAt: '2026-04-25T12:00:00Z',
  firstStartsAt: '2026-04-04T12:00:00Z',
  lastStartsAt: '2026-05-23T12:00:00Z',
  sessions: ['done', 'done', 'done', 'live', 'upcoming', 'upcoming', 'upcoming', 'upcoming'],
  priceCents: 6400,
  joined: false,
};

/** Women's Hoops & Devotion: six dates at 7:00 PM, January to June, three done, free. */
export const HOOPS_DEVOTION: SeriesRow = {
  id: '0190c0de-0000-7000-8000-0000000005e3',
  title: 'Women’s Hoops & Devotion',
  category: 'basketball',
  imageKey: null,
  host: {
    id: '0190c0de-0000-7000-8000-00000000a003',
    kind: 'organization',
    name: 'Faith & Footwork',
  },
  area: 'Downtown',
  cadence: { weekday: null, dates: 6 },
  startsAt: '2026-04-30T23:00:00Z',
  firstStartsAt: '2026-01-30T00:00:00Z',
  lastStartsAt: '2026-06-25T23:00:00Z',
  sessions: ['done', 'done', 'done', 'live', 'upcoming', 'upcoming'],
  priceCents: 0,
  joined: false,
};

/** What a spec sees of the list requests it answered. */
export interface SeriesAsked {
  /** The query of each request, as sent: `category`, `q` and `joined`, null when absent. */
  requests: { category: string | null; q: string | null; joined: string | null }[];
}

/**
 * Answers `GET /api/events/series` from `series`, in the order given, as the API does (ADR 0093):
 * `category` keeps one category, `q`, trimmed, keeps the titles that contain it in any case, blank
 * narrowing nothing, and `joined=true` keeps the joined ones. `reply` may answer a request, by its
 * zero-based number, otherwise (a refusal, or a reply held until a promise settles).
 */
export function answerSeries(
  api: ApiHandlers,
  series: SeriesRow[],
  reply: (requestNumber: number) => ApiReply | Promise<ApiReply> | null = () => null,
): SeriesAsked {
  const asked: SeriesAsked = { requests: [] };
  api.on('GET', '/api/events/series', async (request) => {
    const number = asked.requests.length;
    const params = new URL(request.url()).searchParams;
    const category = params.get('category');
    const q = params.get('q');
    const joined = params.get('joined');
    asked.requests.push({ category, q, joined });
    const own = await reply(number);
    if (own) return own;
    const term = (q ?? '').trim().toLowerCase();
    return {
      json: {
        series: series.filter(
          (row) =>
            (category === null || row.category === category) &&
            row.title.toLowerCase().includes(term) &&
            (joined !== 'true' || row.joined),
        ),
      },
    };
  });
  return asked;
}

/** A series as `GET /api/events/series/{id}` answers it (`SeriesDetailDto`, ADR 0096). */
export interface SeriesDetail {
  id: string;
  title: string;
  category: string;
  summary: string;
  imageKey: string | null;
  host: EventHostCard;
  cadence: { weekday: number | null; dates: number };
  /** The next held session's start, else the last held one's. */
  startsAt: string;
  firstStartsAt: string;
  lastStartsAt: string;
  place: string;
  area: string;
  priceCents: number;
  dropInPriceCents: number | null;
  capacity: number;
  /** The fewest places left among the sessions to come, or none when none is to come. */
  spotsLeft: number | null;
  sessionsLeft: number;
  joined: boolean;
  /** Every date in date order (ADR 0096). */
  sessions: SeriesSession[];
}

/** One date of a series (`SeriesSessionDto`, ADR 0096). */
export interface SeriesSession {
  id: string;
  /** Its position among all the dates, cancelled ones included. */
  number: number;
  startsAt: string;
  topic: string | null;
  state: 'done' | 'live' | 'upcoming' | 'cancelled';
  /** The member holds a place at it. */
  held: boolean;
}

const COUCH_DATES: [string, string][] = [
  ['2026-04-07', 'Walk, run 60 seconds, repeat. Meet your pace group'],
  ['2026-04-14', 'Run 90 seconds, walk 2 minutes'],
  ['2026-04-21', 'Same intervals, six times through'],
  ['2026-04-28', 'First 5-minute run'],
  ['2026-05-05', 'Two 8-minute runs'],
  ['2026-05-12', 'No class: Victoria Day week'],
  ['2026-05-19', 'Twenty minutes without stopping'],
  ['2026-05-26', 'Graduation 5K and potluck'],
];

/** Couch to 5K's eight Tuesdays at 6:30 PM: two done (the member held a place at the first), April 21 next, May 12 cancelled. */
export const COUCH_SESSIONS: SeriesSession[] = COUCH_DATES.map(([date, topic], n) => ({
  id: `0190c0de-0000-7000-8000-00000000c50${n + 1}`,
  number: n + 1,
  startsAt: `${date}T22:30:00Z`,
  topic,
  state: n < 2 ? 'done' : n === 2 ? 'live' : n === 5 ? 'cancelled' : 'upcoming',
  held: n === 0,
}));

/**
 * Couch to 5K Run Club as the mock `event-series/default` draws it: eight Tuesdays at 6:30 PM from
 * April 7 at Humber Bay Park East, hosted by Lakeshore Runners Fellowship (verified), next April 21,
 * joined.
 */
export const COUCH_TO_5K_DETAIL: SeriesDetail = {
  id: COUCH_TO_5K.id,
  title: 'Couch to 5K Run Club',
  category: 'run',
  summary:
    'Eight weeks from walking to running a full 5K, together. Each week builds on the last, so the group stays together from week one to race day.',
  imageKey: null,
  host: hostCardOf(LAKESHORE),
  cadence: { weekday: 2, dates: 7 },
  startsAt: '2026-04-21T22:30:00Z',
  firstStartsAt: '2026-04-07T22:30:00Z',
  lastStartsAt: '2026-05-26T22:30:00Z',
  place: 'Humber Bay Park East',
  area: 'Etobicoke, Toronto',
  priceCents: 0,
  dropInPriceCents: 0,
  capacity: 40,
  spotsLeft: 9,
  sessionsLeft: 5,
  joined: true,
  sessions: COUCH_SESSIONS,
};

/**
 * Couch to 5K's third date (April 21, 6:30 PM) as its event page answers it, with its series card as
 * the mock `event-detail/session` draws it: "Session 3 of 8 · Every Tuesday" and the next three
 * dates, May 12 cancelled; not joined (L2-010 AC5; ADR 0096).
 */
export const COUCH_SESSION_3: EventDetail = {
  id: COUCH_SESSIONS[2]!.id,
  title: 'Couch to 5K Run Club',
  category: 'run',
  startsAt: COUCH_SESSIONS[2]!.startsAt,
  place: 'Humber Bay Park East',
  area: 'Etobicoke, Toronto',
  priceCents: 0,
  capacity: 40,
  going: 31,
  imageKey: null,
  summary: 'Run 90 seconds, walk two minutes, six times through.',
  registration: null,
  host: hostCardOf(LAKESHORE),
  series: {
    id: COUCH_TO_5K.id,
    title: 'Couch to 5K Run Club',
    number: 3,
    total: 8,
    cadence: { weekday: 2, dates: 7 },
    joined: false,
    next: COUCH_SESSIONS.slice(3, 6).map((session) => ({
      id: session.id,
      startsAt: session.startsAt,
      topic: session.topic,
      cancelled: session.state === 'cancelled',
    })),
  },
};

/**
 * Saturday Park Bootcamp as the mock `event-series/not-joined` draws it: eight Saturdays at
 * 8:00 AM from April 4, three done, next April 25, $64 for all or $10 a date, 12 of 50 spots left,
 * hosted by Danielle Okafor, not joined.
 */
export const PARK_BOOTCAMP_DETAIL: SeriesDetail = {
  id: PARK_BOOTCAMP.id,
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  summary: 'Forty-five minutes of full-body circuits in the park, every Saturday morning.',
  imageKey: null,
  host: hostCardOf(OKAFOR),
  cadence: { weekday: 6, dates: 8 },
  startsAt: '2026-04-25T12:00:00Z',
  firstStartsAt: '2026-04-04T12:00:00Z',
  lastStartsAt: '2026-05-23T12:00:00Z',
  place: 'Trillium Park, Ontario Place',
  area: 'Waterfront',
  priceCents: 6400,
  dropInPriceCents: 1000,
  capacity: 50,
  spotsLeft: 12,
  sessionsLeft: 5,
  joined: false,
  sessions: ['04', '11', '18', '25', '02', '09', '16', '23'].map((day, n) => ({
    id: `0190c0de-0000-7000-8000-00000000c60${n + 1}`,
    number: n + 1,
    startsAt: `2026-0${n < 4 ? 4 : 5}-${day}T12:00:00Z`,
    topic: null,
    state: n < 3 ? 'done' : n === 3 ? 'live' : 'upcoming',
    held: false,
  })),
};

/**
 * Answers `GET /api/events/series/{id}` for each of `series`, and 404 `series_not_found` for any
 * other id, as the API does (ADR 0096); `reply` may answer a request, by its zero-based number,
 * otherwise (a refusal, or a reply held until a promise settles). Returns the ids asked for, in order.
 */
export function answerSeriesDetail(
  api: ApiHandlers,
  series: SeriesDetail[],
  reply: (requestNumber: number) => ApiReply | Promise<ApiReply> | null = () => null,
): string[] {
  const asked: string[] = [];
  api.on('GET', /^\/api\/events\/series\/[0-9a-f-]{36}$/, async (request) => {
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';
    const number = asked.length;
    asked.push(id);
    const own = await reply(number);
    if (own) return own;
    const found = series.find((row) => row.id === id);
    return found ? { json: found } : { status: 404, json: { code: 'series_not_found' } };
  });
  return asked;
}

/**
 * `detail` as the member sees it once they joined (L2-052 AC2; ADR 0099): joined, a place held at
 * every session to come (the next one and those after it, not cancelled), and one place fewer left.
 */
export function joinedOf(detail: SeriesDetail): SeriesDetail {
  return {
    ...detail,
    joined: true,
    spotsLeft: detail.spotsLeft === null ? null : detail.spotsLeft - 1,
    sessions: detail.sessions.map((session) => ({
      ...session,
      held: session.held || session.state === 'live' || session.state === 'upcoming',
    })),
  };
}

/**
 * Answers `POST /api/events/series/{id}/enrolment` (ADR 0099) with `joinedOf` the series of that id
 * among `series`, or 404 `series_not_found`; `reply` may answer a request, by its zero-based number,
 * otherwise (a refusal such as 409 `series_full`, or a reply held until a promise settles). Returns
 * the ids joined, in order.
 */
export function answerSeriesJoin(
  api: ApiHandlers,
  series: SeriesDetail[],
  reply: (requestNumber: number) => ApiReply | Promise<ApiReply> | null = () => null,
): string[] {
  const asked: string[] = [];
  api.on('POST', /^\/api\/events\/series\/[0-9a-f-]{36}\/enrolment$/, async (request) => {
    const id = new URL(request.url()).pathname.split('/').at(-2) ?? '';
    const number = asked.length;
    asked.push(id);
    const own = await reply(number);
    if (own) return own;
    const found = series.find((row) => row.id === id);
    return found ? { json: joinedOf(found) } : { status: 404, json: { code: 'series_not_found' } };
  });
  return asked;
}
