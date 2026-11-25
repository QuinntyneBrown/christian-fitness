import { type ListingProfileFixture, TEAM } from './listing-profile';
import type { ApiHandlers } from './api-handlers';

/** An event as `GET /api/events` answers it (ADR 0027): the app words the date and the price. */
export interface EventSummary {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  place: string;
  area: string;
  priceCents: number;
  capacity: number;
  going: number;
  imageKey: string | null;
  /** A session's series (ADR 0093): its number and total among all its dates, and the cadence. */
  series?: {
    id: string;
    title: string;
    number: number;
    total: number;
    cadence: { weekday: number | null; dates: number };
  } | null;
}

/** The first event of the mock `events/default`: 6:45 AM on Saturday, April 18 in Toronto. */
export const SUNRISE_5K: EventSummary = {
  id: '0190c0de-0000-7000-8000-00000000e001',
  title: 'Easter Sunrise 5K',
  category: 'run',
  startsAt: '2026-04-18T10:45:00Z',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  area: 'Waterfront',
  priceCents: 0,
  capacity: 200,
  going: 142,
  imageKey: null,
};

/** The second: $10, 8:00 AM on Saturday, April 25, with 12 of 50 spots left (so not "few"). */
export const BOOTCAMP: EventSummary = {
  id: '0190c0de-0000-7000-8000-00000000e003',
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  startsAt: '2026-04-25T12:00:00Z',
  place: 'Trillium Park, Ontario Place',
  area: 'Waterfront',
  priceCents: 1000,
  capacity: 50,
  going: 38,
  imageKey: null,
};

/** The third: 7:00 PM on Thursday, April 30, with 6 spots left (few, so said in words). */
export const HOOPS_NIGHT: EventSummary = {
  id: '0190c0de-0000-7000-8000-00000000e002',
  title: "Women's Hoops & Devotion Night",
  category: 'basketball',
  startsAt: '2026-04-30T23:00:00Z',
  place: 'St. Lawrence Community Rec Centre',
  area: 'Downtown',
  priceCents: 0,
  capacity: 30,
  going: 24,
  imageKey: null,
};

/** The `n`th generated event (1-based), one a day, so a long list pages in order. */
export function generatedEvent(n: number): EventSummary {
  const start = new Date(Date.UTC(2026, 4, 1, 12, 0, 0) + n * 86_400_000);
  return {
    id: `0190c0de-0000-7000-8000-${String(n).padStart(12, '0')}`,
    title: `Generated event ${n}`,
    category: 'run',
    startsAt: start.toISOString(),
    place: 'Martin Goodman Trail',
    area: 'Waterfront',
    priceCents: 0,
    capacity: 100,
    going: 3,
    imageKey: null,
  };
}

/** What a spec sees of the requests it answered. */
export interface EventsAsked {
  /** The `cursor` of each request, in order; `null` for the first page. */
  cursors: (string | null)[];
  categories: (string | null)[];
  /** The `q` of each request, as sent; `null` when there was none (ADR 0081). */
  searches: (string | null)[];
  /** The `going` of each request, as sent; `null` when there was none (ADR 0081). */
  going: (string | null)[];
}

/**
 * Answers `GET /api/events` from `events`, 20 to a page, the cursor being the index of the next one
 * (opaque to the app). As the API does, `category` keeps one category and `q`, trimmed, keeps the
 * titles that contain it in any case, blank narrowing nothing, and `going=true` keeps the ids in
 * `mine`, the events the signed-in member is registered for (ADR 0081). `fail` may refuse a
 * request, by its zero-based number, as a reply.
 */
export function answerEvents(
  api: ApiHandlers,
  events: EventSummary[],
  fail: (requestNumber: number) => { status?: number; abort?: boolean } | null = () => null,
  mine: string[] = [],
): EventsAsked {
  const asked: EventsAsked = { cursors: [], categories: [], searches: [], going: [] };
  api.on('GET', '/api/events', (request) => {
    const number = asked.cursors.length;
    const params = new URL(request.url()).searchParams;
    const cursor = params.get('cursor');
    const category = params.get('category');
    const search = params.get('q');
    asked.categories.push(category);
    asked.cursors.push(cursor);
    asked.searches.push(search);
    const going = params.get('going');
    asked.going.push(going);
    const refusal = fail(number);
    if (refusal?.abort) return { abort: true };
    if (refusal) return { status: refusal.status ?? 400, json: { code: 'error' } };
    const from = cursor === null ? 0 : Number(cursor);
    const term = (search ?? '').trim().toLowerCase();
    const matches = events.filter(
      (event) =>
        (category === null || event.category === category) &&
        event.title.toLowerCase().includes(term) &&
        (going !== 'true' || mine.includes(event.id)),
    );
    const page = matches.slice(from, from + 20);
    const next = from + 20 < matches.length ? String(from + 20) : null;
    return { json: { events: page, nextCursor: next } };
  });
  return asked;
}

/** The listing that hosts an event, as `GET /api/events/{id}` carries it (`EventHostCardDto`, ADR 0089). */
export interface EventHostCard {
  id: string;
  kind: string;
  name: string;
  isVerified: boolean;
  photoKey: string | null;
}

/** A listing profile's fields as its events carry it as their host. */
export function hostCardOf(profile: ListingProfileFixture): EventHostCard {
  const { id, kind, name, isVerified, photoKey } = profile;
  return { id, kind, name, isVerified, photoKey };
}

/** An event as `GET /api/events/{id}` answers it (ADR 0031): the summary's fields and its summary text. */
export interface EventDetail extends EventSummary {
  summary: string;
  /** The caller's own registration: `confirmed` (free), `reserved` (paid) or none (ADR 0032). */
  registration: 'confirmed' | 'reserved' | null;
  /** Its host (ADR 0089): every event has one. */
  host: EventHostCard;
}

/** The first event in full: the mock `event-detail/unregistered`, 12 of 50 spots left. */
export const BOOTCAMP_DETAIL: EventDetail = {
  ...BOOTCAMP,
  summary: 'Forty-five minutes of full-body circuits for every level. Bring a mat and water.',
  registration: null,
  host: hostCardOf(TEAM),
};

/** A free event in full, 142 of 200 going and the member not yet registered. */
export const SUNRISE_DETAIL: EventDetail = {
  ...SUNRISE_5K,
  summary: 'Run the waterfront together at sunrise.',
  registration: null,
  host: hostCardOf(TEAM),
};

/**
 * Answers `GET /api/events/{id}` for each of `events`, and 404 `event_not_found` for any other id,
 * as the API does (ADR 0031). Returns the ids asked for, in order.
 */
export function answerEvent(api: ApiHandlers, events: EventDetail[]): string[] {
  const asked: string[] = [];
  api.on('GET', /^\/api\/events\/[0-9a-f-]{36}$/, (request) => {
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';
    asked.push(id);
    const found = events.find((event) => event.id === id);
    return found ? { json: found } : { status: 404, json: { code: 'event_not_found' } };
  });
  return asked;
}

/**
 * Answers `POST /api/events/{id}/registrations` for `event` as the API does (ADR 0032): going rises
 * by one and the registration is `confirmed` for a free event or `reserved` for a paid one. With
 * `refuse`, it answers that status and no body instead. Returns the ids asked for, in order.
 */
export function answerRegistration(
  api: ApiHandlers,
  event: EventDetail,
  refuse?: { status: number; code: string },
): string[] {
  const asked: string[] = [];
  api.on('POST', `/api/events/${event.id}/registrations`, () => {
    asked.push(event.id);
    if (refuse) return { status: refuse.status, json: { code: refuse.code } };
    return {
      json: {
        ...event,
        going: event.going + 1,
        registration: event.priceCents > 0 ? 'reserved' : 'confirmed',
      },
    };
  });
  return asked;
}

/**
 * Answers `DELETE /api/events/{id}/registrations/me` for `event` as the API does (ADR 0034): going
 * falls by one and the member holds no place. With `refuse`, it answers that status and code
 * instead. Returns the ids asked for, in order.
 */
export function answerCancellation(
  api: ApiHandlers,
  event: EventDetail,
  refuse?: { status: number; code: string },
): string[] {
  const asked: string[] = [];
  api.on('DELETE', `/api/events/${event.id}/registrations/me`, () => {
    asked.push(event.id);
    if (refuse) return { status: refuse.status, json: { code: refuse.code } };
    return { json: { ...event, going: event.going - 1, registration: null } };
  });
  return asked;
}

/** Home's events as `GET /api/home` answers them (ADR 0044). */
export interface HomeEvents {
  nextEvent: EventSummary | null;
  suggested: EventSummary[];
  unreadCount?: number;
}

/**
 * Answers `GET /api/home` with `home`. `fail` may refuse a request, by its zero-based number, as a
 * reply. Returns how many requests were asked.
 */
export function answerHome(
  api: ApiHandlers,
  home: HomeEvents,
  fail: (requestNumber: number) => { status?: number; abort?: boolean } | null = () => null,
): { count: number } {
  const asked = { count: 0 };
  api.on('GET', '/api/home', () => {
    const refusal = fail(asked.count++);
    if (refusal?.abort) return { abort: true };
    if (refusal) return { status: refusal.status ?? 400, json: { code: 'error' } };
    return { json: { unreadCount: 0, ...home } };
  });
  return asked;
}
