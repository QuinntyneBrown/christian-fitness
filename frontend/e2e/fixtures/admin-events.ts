import type { ApiHandlers, ApiReply } from './api-handlers';

/** An event as `GET /api/admin/events` answers it. */
export interface AdminEventFixture {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  place: string;
  area: string;
  priceCents: number;
  capacity: number;
  going: number;
  status: 'draft' | 'published' | 'cancelled';
  /** The series a session belongs to (ADR 0091); none for any other event. */
  series?: { id: string; title: string } | null;
}

/** The four published events of the mocks' cast (docs/mocks/README.md), soonest first, in UTC. */
export const PUBLISHED_EVENTS: AdminEventFixture[] = [
  {
    id: '0190c0de-0000-7000-8000-00000000e001',
    title: 'Easter Sunrise 5K',
    category: 'run',
    // Saturday, April 18, 2026, 6:45 AM in Toronto (daylight time, UTC-4).
    startsAt: '2026-04-18T10:45:00+00:00',
    place: 'Martin Goodman Trail, Marilyn Bell Park',
    area: 'Waterfront, Toronto',
    priceCents: 0,
    capacity: 200,
    going: 142,
    status: 'published',
  },
  {
    id: '0190c0de-0000-7000-8000-00000000e002',
    title: 'Saturday Park Bootcamp',
    category: 'workout',
    startsAt: '2026-04-25T12:00:00+00:00',
    place: 'Trillium Park, Ontario Place',
    area: 'Waterfront, Toronto',
    priceCents: 1000,
    capacity: 50,
    going: 38,
    status: 'published',
  },
  {
    id: '0190c0de-0000-7000-8000-00000000e003',
    title: "Women's Hoops & Devotion Night",
    category: 'basketball',
    startsAt: '2026-04-30T23:00:00+00:00',
    place: 'St. Lawrence Community Rec Centre',
    area: 'St. Lawrence, Toronto',
    priceCents: 0,
    capacity: 30,
    going: 24,
    status: 'published',
  },
  {
    id: '0190c0de-0000-7000-8000-00000000e004',
    title: 'Stretch & Pray: Mobility Morning',
    category: 'mobility',
    startsAt: '2026-05-06T13:30:00+00:00',
    place: 'Grace Fellowship Hall',
    area: 'Scarborough, Toronto',
    priceCents: 0,
    capacity: 25,
    going: 17,
    status: 'published',
  },
];

/** The draft of the mocks' cast: Whole Life Retreat, May 22, 4:00 PM in Toronto. */
export const RETREAT_DRAFT: AdminEventFixture = {
  id: '0190c0de-0000-7000-8000-00000000e005',
  title: 'Whole Life Retreat',
  category: 'retreat',
  startsAt: '2026-05-22T20:00:00+00:00',
  place: 'Muskoka Woods, Rosseau',
  area: 'Muskoka Lakes',
  priceCents: 34000,
  capacity: 60,
  going: 0,
  status: 'draft',
};

/** Every event of the cast, soonest first: the four published ones, then the draft. */
export const CAST_EVENTS: AdminEventFixture[] = [...PUBLISHED_EVENTS, RETREAT_DRAFT];

/** A list answer holding `events`, with every tab's count worked out from `all`. */
export function eventList(
  events: AdminEventFixture[],
  all: AdminEventFixture[] = events,
): ApiReply {
  return {
    json: {
      counts: {
        all: all.length,
        published: all.filter((e) => e.status === 'published').length,
        draft: all.filter((e) => e.status === 'draft').length,
      },
      events,
    },
  };
}

/** A ProblemDetails answer with `status` and `code`. */
export function problem(
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { status, code, title: 'A sentence from the server the screen never shows', ...extra },
  };
}

/** A Listed directory listing as the Host picker shows it (`EventHostDto`, ADR 0089). */
export interface EventHostFixture {
  id: string;
  kind: string;
  name: string;
}

/** The Listed Christian Fitness team listing, every new event's host (ADR 0067). */
export const TEAM_HOST: EventHostFixture = {
  id: '0193a9c0-0000-7000-8000-00000000cf01',
  kind: 'organization',
  name: 'Christian Fitness',
};

/** The mocks' run club, a Listed organization. */
export const LAKESHORE_HOST: EventHostFixture = {
  id: '0193a9c0-0000-7000-8000-0000000000a1',
  kind: 'organization',
  name: 'Lakeshore Runners Fellowship',
};

/** The mocks' strength coach, a Listed instructor, who hosts the Bootcamp. */
export const DANIELLE_HOST: EventHostFixture = {
  id: '0193a9c0-0000-7000-8000-0000000000a4',
  kind: 'instructor',
  name: 'Danielle Okafor',
};

/** An event as `GET /api/admin/events/{id}` opens it in the editor (ADR 0025). */
export interface AdminEventDetailFixture {
  id: string;
  title: string;
  category: string;
  /** The Toronto date, `yyyy-MM-dd`. */
  date: string;
  /** The Toronto time, `HH:mm`. */
  startTime: string;
  place: string;
  area: string;
  priceCents: number;
  capacity: number;
  summary: string;
  imageKey: string | null;
  going: number;
  status: 'draft' | 'published';
  /** The saved host (ADR 0089). */
  host: EventHostFixture;
}

/** Saturday Park Bootcamp as the editor opens it: the second published event, with an image. */
export const BOOTCAMP_DETAIL: AdminEventDetailFixture = {
  id: PUBLISHED_EVENTS[1].id,
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  date: '2026-04-25',
  startTime: '08:00',
  place: 'Trillium Park, Ontario Place',
  area: 'Waterfront, Toronto',
  priceCents: 1000,
  capacity: 50,
  summary: 'An hour of bodyweight circuits in the park, then coffee together.',
  imageKey: '0123456789abcdef0123456789abcdef.jpg',
  going: 38,
  status: 'published',
  host: DANIELLE_HOST,
};

/** Whole Life Retreat, the draft of the cast, as the editor opens it. */
export const RETREAT_DETAIL: AdminEventDetailFixture = {
  id: RETREAT_DRAFT.id,
  title: 'Whole Life Retreat',
  category: 'retreat',
  date: '2026-05-22',
  startTime: '16:00',
  place: 'Muskoka Woods, Rosseau',
  area: 'Muskoka Lakes',
  priceCents: 34000,
  capacity: 60,
  summary:
    'Three days of trail runs, strength sessions, worship by the lake and real rest. Meals and cabins included.',
  imageKey: null,
  going: 0,
  status: 'draft',
  host: TEAM_HOST,
};

/**
 * Answers `GET /api/admin/events/hosts?q=` as the API does (ADR 0089): the `hosts` whose name
 * holds the search, ignoring case, at most 10. `fail` answers a search, by its zero-based number,
 * with no answer at all. Returns the searches asked, in order.
 */
export function answerHostSearch(
  api: ApiHandlers,
  hosts: EventHostFixture[],
  fail: (searchNumber: number) => boolean = () => false,
): string[] {
  const asked: string[] = [];
  api.on('GET', '/api/admin/events/hosts', (request) => {
    const q = new URL(request.url()).searchParams.get('q') ?? '';
    const number = asked.length;
    asked.push(q);
    if (fail(number)) return { abort: true };
    const term = q.trim().toLowerCase();
    return {
      json: { hosts: hosts.filter((h) => h.name.toLowerCase().includes(term)).slice(0, 10) },
    };
  });
  return asked;
}
