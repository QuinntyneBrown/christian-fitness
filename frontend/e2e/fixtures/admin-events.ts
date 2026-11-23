import type { ApiReply } from './api-handlers';

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
};
