import type { ApiHandlers, ApiReply } from './api-handlers';

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
