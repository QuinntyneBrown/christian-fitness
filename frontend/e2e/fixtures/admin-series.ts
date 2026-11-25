import type { ApiReply } from './api-handlers';
import { DANIELLE_HOST, LAKESHORE_HOST, TEAM_HOST, type EventHostFixture } from './admin-events';

/** A series' cadence as the API answers it: numbers, never words (ADR 0091). */
export interface SeriesCadenceFixture {
  weekday: number | null;
  dates: number;
}

/** One row of `GET /api/admin/series`. */
export interface AdminSeriesRowFixture {
  id: string;
  title: string;
  cadence: SeriesCadenceFixture;
  startsAt: string | null;
  joined: number;
  capacity: number;
}

/** One session of `GET /api/admin/series/{id}`. */
export interface AdminSessionFixture {
  id: string;
  number: number;
  startsAt: string;
  endsAt: string | null;
  topic: string | null;
  state: 'done' | 'live' | 'upcoming' | 'cancelled';
}

/** `GET /api/admin/series/{id}` (ADR 0091). */
export interface AdminSeriesFixture extends AdminSeriesRowFixture {
  category: string;
  summary: string;
  imageKey: string | null;
  host: EventHostFixture;
  firstStartsAt: string | null;
  lastStartsAt: string | null;
  place: string;
  area: string;
  priceCents: number;
  dropInPriceCents: number | null;
  sessionsLeft: number;
  sessionsHeld: number;
  sessions: AdminSessionFixture[];
}

/** A 6:30 PM Toronto start in daylight time (UTC-4) on `date`, as the API answers it. */
function at(date: string, time = '22:30'): string {
  return `${date}T${time}:00+00:00`;
}

/** Session `n` of Couch to 5K: a Tuesday from 6:30 to 7:30 PM. */
function couch(
  n: number,
  date: string,
  topic: string,
  state: AdminSessionFixture['state'],
): AdminSessionFixture {
  const id = `0190c0de-0000-7000-8000-0000000c5${String(n).padStart(3, '0')}`;
  return { id, number: n, startsAt: at(date), endsAt: at(date, '23:30'), topic, state };
}

/** Session `n` of the Bootcamp: a Saturday at 8:00 AM, with no end and perhaps no topic. */
function bootcamp(
  n: number,
  date: string,
  topic: string | null,
  state: AdminSessionFixture['state'],
): AdminSessionFixture {
  const id = `0190c0de-0000-7000-8000-0000000b0${String(n).padStart(3, '0')}`;
  return { id, number: n, startsAt: at(date, '12:00'), endsAt: null, topic, state };
}

/**
 * Couch to 5K Run Club as mock `admin-series/default` draws it, at the mocks' today (Wednesday
 * April 15, 2026): eight Tuesdays from April 7, two done, April 21 live, May 12 cancelled.
 */
export const COUCH_TO_5K: AdminSeriesFixture = {
  id: '0190c0de-0000-7000-8000-00000000c501',
  title: 'Couch to 5K Run Club',
  category: 'run',
  summary: 'Eight weeks from walking to running a full 5K, together.',
  imageKey: null,
  host: LAKESHORE_HOST,
  cadence: { weekday: 2, dates: 7 },
  startsAt: at('2026-04-21'),
  firstStartsAt: at('2026-04-07'),
  lastStartsAt: at('2026-05-26'),
  place: 'Humber Bay Park East',
  area: 'Etobicoke, Toronto',
  priceCents: 0,
  dropInPriceCents: 0,
  capacity: 40,
  joined: 31,
  sessionsLeft: 5,
  sessionsHeld: 7,
  sessions: [
    couch(1, '2026-04-07', 'Walk, run 60 seconds, repeat. Meet your pace group', 'done'),
    couch(2, '2026-04-14', 'Run 90 seconds, walk 2 minutes', 'done'),
    couch(3, '2026-04-21', 'Same intervals, six times through', 'live'),
    couch(4, '2026-04-28', 'First 5-minute run', 'upcoming'),
    couch(5, '2026-05-05', 'Two 8-minute runs', 'upcoming'),
    couch(6, '2026-05-12', 'No class: Victoria Day week', 'cancelled'),
    couch(7, '2026-05-19', 'Twenty minutes without stopping', 'upcoming'),
    couch(8, '2026-05-26', 'Graduation 5K and potluck', 'upcoming'),
  ],
};

/**
 * Saturday Park Bootcamp as mock `admin-series/selected` draws it: paid, with a drop-in price,
 * eight Saturdays from April 4, three done and April 25 live by the API's clock in that mock.
 */
export const BOOTCAMP_SERIES: AdminSeriesFixture = {
  id: '0190c0de-0000-7000-8000-00000000c502',
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  summary: 'Strength and conditioning in the park, every Saturday morning.',
  imageKey: null,
  host: DANIELLE_HOST,
  cadence: { weekday: 6, dates: 8 },
  // Saturdays at 8:00 AM in Toronto.
  startsAt: at('2026-04-25', '12:00'),
  firstStartsAt: at('2026-04-04', '12:00'),
  lastStartsAt: at('2026-05-23', '12:00'),
  place: 'Trillium Park, Ontario Place',
  area: 'Waterfront, Toronto',
  priceCents: 6400,
  dropInPriceCents: 1000,
  capacity: 50,
  joined: 38,
  sessionsLeft: 5,
  sessionsHeld: 8,
  sessions: [
    bootcamp(1, '2026-04-04', 'Baseline: push-ups, squats, 1K walk-run', 'done'),
    bootcamp(2, '2026-04-11', 'Lower body and core', 'done'),
    bootcamp(3, '2026-04-18', 'Upper body and carries', 'done'),
    bootcamp(4, '2026-04-25', 'Partner circuits', 'live'),
    bootcamp(5, '2026-05-02', 'Hills and sprints', 'upcoming'),
    bootcamp(6, '2026-05-09', 'Mother’s Day mobility', 'upcoming'),
    bootcamp(7, '2026-05-16', 'Full-body ladder', 'upcoming'),
    bootcamp(8, '2026-05-23', null, 'upcoming'),
  ],
};

/** Women's Hoops & Devotion: monthly dates, so its cadence is a count (ADR 0091). */
export const HOOPS_SERIES: AdminSeriesRowFixture = {
  id: '0190c0de-0000-7000-8000-00000000c503',
  title: 'Women’s Hoops & Devotion',
  cadence: { weekday: null, dates: 6 },
  // Thursday, April 30, 7:00 PM in Toronto.
  startsAt: at('2026-04-30', '23:00'),
  joined: 24,
  capacity: 30,
};

/** A series as its row in the list. */
export function rowOf(series: AdminSeriesRowFixture): AdminSeriesRowFixture {
  const { id, title, cadence, startsAt, joined, capacity } = series;
  return { id, title, cadence, startsAt, joined, capacity };
}

/** The mocks' list, soonest next session first. */
export const SERIES_ROWS: AdminSeriesRowFixture[] = [
  rowOf(COUCH_TO_5K),
  rowOf(BOOTCAMP_SERIES),
  HOOPS_SERIES,
];

/** `GET /api/admin/series` answering `rows`. */
export function seriesList(rows: AdminSeriesRowFixture[] = SERIES_ROWS): ApiReply {
  return { json: { series: rows } };
}

export { TEAM_HOST };
